<?php

declare(strict_types=1);

namespace Tests\Feature\Payment;

use App\Enums\CourseStatus;
use App\Enums\RoleName;
use App\Models\CourseProgramme;
use App\Models\Payment;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Bank-transfer slips carry names and account numbers. They used to sit on the
 * public disk as `/storage/{id}/receipt-{paymentId}.{client extension}`: readable
 * without signing in, guessable, and — with an `.html` name — servable as a page.
 */
class PaymentReceiptTest extends TestCase
{
    use RefreshDatabase;

    private Student $student;

    private CourseProgramme $course;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('payments.gateway', 'sandbox');
        Storage::fake('public');
        Storage::fake(Payment::RECEIPT_DISK);

        foreach (RoleName::values() as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        $this->student = Student::factory()->create(['is_blocked' => false]);
        $this->course = CourseProgramme::factory()->create([
            'status' => CourseStatus::Published,
            'price_cents' => 500000,
        ]);
    }

    /** Submits a transfer through the student's own endpoints; returns the response. */
    private function submit(UploadedFile $receipt, ?Student $as = null): TestResponse
    {
        Sanctum::actingAs($as ?? $this->student, ['student'], 'student');

        $orderId = $this->postJson("/api/v1/student/courses/{$this->course->id}/enrol")->json('data.order.id');

        return $this->postJson("/api/v1/student/orders/{$orderId}/bank-transfer", [
            'reference_number' => '55440001',
            'receipt' => $receipt,
        ]);
    }

    private function receiptMedia(): Media
    {
        return Payment::sole()->getFirstMedia(Payment::RECEIPT_COLLECTION);
    }

    /** Leaves the student guard so a plain browser request is what gets tested. */
    private function asBrowser(): self
    {
        $this->app['auth']->forgetGuards();
        $this->app['auth']->shouldUse('web');

        return $this;
    }

    private function admin(RoleName $role): User
    {
        $user = User::factory()->create();
        $user->assignRole($role->value);

        return $user;
    }

    /** A real JPEG with an EXIF block carrying a marker, as a phone camera would write GPS. */
    private function jpegWithExif(string $name = 'slip.jpg'): UploadedFile
    {
        // Held in a variable: a fake file's temp copy is deleted once nothing references it.
        $source = UploadedFile::fake()->image('x.jpg', 800, 600);
        $jpeg = file_get_contents($source->getRealPath());
        $exifPayload = "Exif\0\0GPS-LAT-6.9271-LNG-79.8612";
        $app1 = "\xFF\xE1".pack('n', strlen($exifPayload) + 2).$exifPayload;

        /*
         * A real UploadedFile over a temp file, not UploadedFile::fake(): a fake
         * reports its type from the NAME, whereas a real upload is typed from its
         * bytes — and the bytes are what this is testing.
         */
        $path = tempnam(sys_get_temp_dir(), 'receipt_test_');
        // Straight after the SOI marker, where cameras put APP1.
        file_put_contents($path, substr($jpeg, 0, 2).$app1.substr($jpeg, 2));

        return new UploadedFile($path, $name, null, null, true);
    }

    public function test_a_receipt_is_stored_privately_under_a_random_name(): void
    {
        $this->submit($this->jpegWithExif())->assertCreated();

        $media = $this->receiptMedia();

        $this->assertSame(Payment::RECEIPT_DISK, $media->disk);
        $this->assertMatchesRegularExpression('/^[0-9a-f-]{36}\.jpg$/', $media->file_name);
        $this->assertSame([], Storage::disk('public')->allFiles(), 'Nothing may land on the public disk.');
        Storage::disk(Payment::RECEIPT_DISK)->assertExists($media->id.'/'.$media->file_name);
    }

    public function test_images_are_reencoded_so_exif_and_gps_are_gone(): void
    {
        $upload = $this->jpegWithExif();
        $this->assertStringContainsString('GPS-LAT', file_get_contents($upload->getRealPath()));

        $this->submit($upload)->assertCreated();

        $stored = file_get_contents($this->receiptMedia()->getPath());
        $this->assertStringNotContainsString('GPS-LAT', $stored);
    }

    public function test_an_image_named_html_is_stored_and_served_as_a_jpeg(): void
    {
        $this->submit($this->jpegWithExif('slip.html'))->assertCreated();

        $media = $this->receiptMedia();
        $this->assertStringEndsWith('.jpg', $media->file_name);

        $url = $this->submitResponseReceiptUrl();

        $this->asBrowser()->get($url)
            ->assertOk()
            ->assertHeader('Content-Type', 'image/jpeg')
            ->assertHeader('X-Content-Type-Options', 'nosniff');
    }

    public function test_an_svg_or_html_file_is_rejected(): void
    {
        $svg = UploadedFile::fake()->createWithContent('slip.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
        $this->submit($svg)->assertStatus(422)->assertJsonValidationErrors('receipt');

        $html = UploadedFile::fake()->createWithContent('slip.jpg', '<html><script>alert(1)</script></html>');
        $this->submit($html)->assertStatus(422)->assertJsonValidationErrors('receipt');

        $this->assertSame(0, Payment::count());
    }

    public function test_a_pdf_is_kept_as_a_pdf(): void
    {
        $pdf = "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n";
        $this->submit(UploadedFile::fake()->createWithContent('slip.pdf', $pdf))->assertCreated();

        $this->assertStringEndsWith('.pdf', $this->receiptMedia()->file_name);
        $this->assertSame($pdf, file_get_contents($this->receiptMedia()->getPath()));
    }

    /** The student's own order carries a signed link — never a storage URL. */
    private function submitResponseReceiptUrl(): string
    {
        Sanctum::actingAs($this->student, ['student'], 'student');

        $url = $this->getJson('/api/v1/student/orders/'.Payment::sole()->order_id)
            ->assertOk()
            ->json('data.payments.0.receipt_url');

        $this->assertIsString($url);

        return $url;
    }

    public function test_the_students_signed_link_serves_the_file_with_safe_headers(): void
    {
        $this->submit(UploadedFile::fake()->image('slip.png'))->assertCreated();

        $url = $this->submitResponseReceiptUrl();

        $this->assertStringNotContainsString('/storage/', $url);
        $this->assertStringContainsString('signature=', $url);

        $response = $this->asBrowser()->get($url)
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png')
            ->assertHeader('X-Content-Type-Options', 'nosniff');

        $this->assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
    }

    public function test_an_expired_link_is_refused(): void
    {
        $this->submit(UploadedFile::fake()->image('slip.jpg'))->assertCreated();
        $url = $this->submitResponseReceiptUrl();

        $this->travel(11)->minutes();

        $this->asBrowser()->get($url)->assertForbidden();
    }

    public function test_a_link_cannot_be_pointed_at_another_payment(): void
    {
        $this->submit(UploadedFile::fake()->image('slip.jpg'))->assertCreated();
        $url = $this->submitResponseReceiptUrl();
        $paymentId = Payment::sole()->id;
        $someoneElses = Payment::factory()->create();

        $tampered = str_replace("/payments/{$paymentId}/receipt", "/payments/{$someoneElses->id}/receipt", $url);

        $this->asBrowser()->get($tampered)->assertForbidden();
    }

    public function test_an_unsigned_request_is_refused(): void
    {
        $this->submit(UploadedFile::fake()->image('slip.jpg'))->assertCreated();

        $this->asBrowser()->get('/api/v1/payments/'.Payment::sole()->id.'/receipt')->assertForbidden();
    }

    public function test_an_accountant_gets_a_fresh_link_that_works(): void
    {
        $this->submit(UploadedFile::fake()->image('slip.jpg'))->assertCreated();
        $payment = Payment::sole();

        $link = $this->asBrowser()->actingAs($this->admin(RoleName::Accountant))
            ->getJson("/api/v1/admin/payments/{$payment->id}/receipt-link")
            ->assertOk()
            ->assertJsonStructure(['data' => ['url', 'expires_at']])
            ->json('data.url');

        $this->app['auth']->forgetGuards();
        $this->get($link)->assertOk()->assertHeader('Content-Type', 'image/jpeg');
    }

    public function test_roles_without_order_access_cannot_get_a_link(): void
    {
        $this->submit(UploadedFile::fake()->image('slip.jpg'))->assertCreated();
        $payment = Payment::sole();

        $this->asBrowser()->actingAs($this->admin(RoleName::ContentManager))
            ->getJson("/api/v1/admin/payments/{$payment->id}/receipt-link")
            ->assertForbidden();
    }

    public function test_a_student_cannot_use_the_admin_link_endpoint(): void
    {
        $this->submit(UploadedFile::fake()->image('slip.jpg'))->assertCreated();

        $this->getJson('/api/v1/admin/payments/'.Payment::sole()->id.'/receipt-link')->assertUnauthorized();
    }

    public function test_the_migrate_command_moves_old_public_receipts(): void
    {
        $this->submit(UploadedFile::fake()->image('slip.jpg'))->assertCreated();
        $payment = Payment::sole();

        // Recreate the old state: a guessable name on the public disk.
        $payment->clearMediaCollection(Payment::RECEIPT_COLLECTION);
        $oldFile = UploadedFile::fake()->image('receipt.jpg');
        $payment->addMedia($oldFile->getRealPath())
            ->usingFileName("receipt-{$payment->id}.jpg")
            ->toMediaCollection(Payment::RECEIPT_COLLECTION, 'public');
        $old = $payment->fresh()->getFirstMedia(Payment::RECEIPT_COLLECTION);
        $this->assertSame('public', $old->disk);

        // The signed route refuses a slip that has not been moved yet.
        $this->asBrowser()->get(URL::temporarySignedRoute('payments.receipt.show', now()->addMinutes(5), ['payment' => $payment->id]))
            ->assertNotFound();

        $this->artisan('payments:migrate-receipts', ['--dry-run' => true])->assertSuccessful();
        $this->assertSame('public', $payment->fresh()->getFirstMedia(Payment::RECEIPT_COLLECTION)->disk);

        $this->artisan('payments:migrate-receipts')->assertSuccessful();

        $moved = $payment->fresh()->getFirstMedia(Payment::RECEIPT_COLLECTION);
        $this->assertSame(Payment::RECEIPT_DISK, $moved->disk);
        $this->assertMatchesRegularExpression('/^[0-9a-f-]{36}\.jpg$/', $moved->file_name);
        $this->assertSame([], Storage::disk('public')->allFiles(), 'The public copy must be deleted.');
        $this->assertSame(1, $payment->fresh()->getMedia(Payment::RECEIPT_COLLECTION)->count());

        // Re-running is harmless.
        $this->artisan('payments:migrate-receipts')
            ->expectsOutputToContain('Nothing to move')
            ->assertSuccessful();
    }
}
