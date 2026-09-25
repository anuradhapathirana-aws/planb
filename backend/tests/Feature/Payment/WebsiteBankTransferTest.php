<?php

declare(strict_types=1);

namespace Tests\Feature\Payment;

use App\Enums\CourseStatus;
use App\Models\CourseProgramme;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tests\Concerns\SignsInOnTheWebsite;
use Tests\TestCase;

/**
 * `SEC-11` — a bank-transfer slip sent from the WEBSITE (cookie session, CSRF,
 * multipart from a browser) goes through exactly the same checks as one from
 * the app: validated, re-encoded, stored privately under a random name, and the
 * order waits for an admin. PaymentReceiptTest covers the rules in depth over a
 * bearer token; this proves the website's credential reaches the same code.
 */
class WebsiteBankTransferTest extends TestCase
{
    use RefreshDatabase;
    use SignsInOnTheWebsite;

    private Student $student;

    private CourseProgramme $course;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('payments.gateway', 'sandbox');
        Storage::fake('public');
        Storage::fake(Payment::RECEIPT_DISK);
        $this->useWebsiteOrigin();

        $this->student = Student::factory()->create(['is_blocked' => false]);
        $this->course = CourseProgramme::factory()->create([
            'status' => CourseStatus::Published,
            'price_cents' => 500000,
        ]);
    }

    /** Signs in on the website, opens an order, and returns [cookie, order id]. */
    private function openOrder(): array
    {
        $cookie = $this->signInOnTheWebsite($this->student);

        $orderId = $this->fromWebsite($cookie)
            ->postJson("/api/v1/student/courses/{$this->course->id}/enrol")
            ->assertCreated()
            ->json('data.order.id');

        return [$cookie, $orderId];
    }

    private function submit(string $cookie, int $orderId, UploadedFile $receipt, string $reference = '55440001'): TestResponse
    {
        return $this->fromWebsite($cookie)->postJson("/api/v1/student/orders/{$orderId}/bank-transfer", [
            'reference_number' => $reference,
            'receipt' => $receipt,
        ]);
    }

    public function test_a_slip_from_the_website_is_stored_privately_and_awaits_an_admin(): void
    {
        [$cookie, $orderId] = $this->openOrder();

        $this->submit($cookie, $orderId, UploadedFile::fake()->image('slip.png', 800, 600))->assertCreated();

        $media = Payment::sole()->getFirstMedia(Payment::RECEIPT_COLLECTION);
        $this->assertSame(Payment::RECEIPT_DISK, $media->disk);
        // Re-encoded under a random name — never the name the browser sent.
        $this->assertMatchesRegularExpression('/^[0-9a-f-]{36}\.(jpg|png)$/', $media->file_name);
        $this->assertStringNotContainsString('slip', $media->file_name);
        $this->assertSame([], Storage::disk('public')->allFiles(), 'Nothing may land on the public disk.');

        // A slip is a claim, not a payment (root CLAUDE.md §7.10).
        $this->assertSame('awaiting_verification', Order::findOrFail($orderId)->status->value);
    }

    public function test_a_disguised_file_from_the_website_is_refused(): void
    {
        [$cookie, $orderId] = $this->openOrder();

        $html = UploadedFile::fake()->createWithContent('slip.jpg', '<html><script>alert(1)</script></html>');

        $this->submit($cookie, $orderId, $html)->assertUnprocessable()->assertJsonValidationErrors('receipt');
        $this->assertSame(0, Payment::query()->count());
    }

    public function test_the_reference_rules_are_the_same_on_the_website(): void
    {
        [$cookie, $orderId] = $this->openOrder();

        $this->submit($cookie, $orderId, UploadedFile::fake()->image('slip.png'), 'ABC12')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('reference_number');
    }

    /** Another student's order is not reachable from a website session either. */
    public function test_a_website_session_cannot_pay_into_someone_elses_order(): void
    {
        [, $orderId] = $this->openOrder();

        $intruderCookie = $this->signInOnTheWebsite(Student::factory()->create(['is_blocked' => false]));

        $response = $this->submit($intruderCookie, $orderId, UploadedFile::fake()->image('slip.png'));

        $this->assertContains($response->status(), [403, 404]);
        $this->assertSame(0, Payment::query()->count());
    }

    public function test_it_needs_a_session(): void
    {
        [, $orderId] = $this->openOrder();

        $this->fromWebsite()
            ->postJson("/api/v1/student/orders/{$orderId}/bank-transfer", [
                'reference_number' => '55440001',
                'receipt' => UploadedFile::fake()->image('slip.png'),
            ])
            ->assertUnauthorized();
    }
}
