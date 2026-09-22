<?php

declare(strict_types=1);

namespace Tests\Feature\Student;

use App\Enums\CourseStatus;
use App\Enums\EnrolmentSource;
use App\Enums\OrderStatus;
use App\Models\CourseCategory;
use App\Models\CourseProgramme;
use App\Models\CourseTopic;
use App\Models\CourseVideo;
use App\Models\Enrolment;
use App\Models\Order;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Course bundles: a main category in `bundle` mode sells all its courses
 * together, and a student pays only for the ones they do not own.
 */
class CourseBundleTest extends TestCase
{
    use RefreshDatabase;

    private Student $student;

    private CourseCategory $migration;

    private CourseCategory $uae;

    private CourseProgramme $visas;

    private CourseProgramme $jobs;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('payments.gateway', 'sandbox');

        $this->student = Student::factory()->create(['is_blocked' => false]);
        Sanctum::actingAs($this->student, ['student'], 'student');

        $this->migration = CourseCategory::factory()->create(['name' => 'Migration', 'selling_mode' => 'bundle']);
        $this->uae = CourseCategory::factory()->childOf($this->migration)->create(['name' => 'UAE']);
        $this->visas = $this->course($this->uae, 'Dubai visas', 450000);
        $this->jobs = $this->course($this->migration, 'Finding work', 300000);
    }

    private function course(CourseCategory $category, string $name, int $priceCents): CourseProgramme
    {
        $course = CourseProgramme::factory()->create([
            'course_category_id' => $category->id,
            'name' => $name,
            'status' => CourseStatus::Published,
            'price_cents' => $priceCents,
            'currency' => 'LKR',
        ]);

        $topic = CourseTopic::factory()->for($course, 'programme')->create();
        CourseVideo::factory()->for($topic, 'topic')->create(['duration_seconds' => 100]);

        return $course;
    }

    private function own(CourseProgramme $course): void
    {
        Enrolment::create([
            'student_id' => $this->student->id,
            'course_programme_id' => $course->id,
            'source' => EnrolmentSource::Purchase,
            'enrolled_at' => now(),
        ]);
    }

    /** Opens the bundle order and pays it through the real sandbox webhook path. */
    private function buyBundle(CourseCategory $category): int
    {
        $orderId = $this->postJson("/api/v1/student/course-categories/{$category->id}/purchase")
            ->assertCreated()
            ->json('data.order.id');

        $checkout = $this->postJson("/api/v1/student/orders/{$orderId}/card")->json('data.checkout.checkout_url');
        $this->getJson($checkout)->assertOk();

        return $orderId;
    }

    public function test_the_bundle_price_is_the_sum_of_every_course_in_the_branch(): void
    {
        $this->postJson("/api/v1/student/course-categories/{$this->migration->id}/purchase", [
            // Ignored: the price is always summed on the server.
            'amount_cents' => 1,
        ])
            ->assertCreated()
            ->assertJsonPath('data.order.amount_cents', 750000)
            ->assertJsonPath('data.order.item.type', 'category')
            ->assertJsonCount(2, 'data.order.items');
    }

    public function test_courses_the_student_already_owns_are_not_charged_again(): void
    {
        $this->own($this->visas);

        $this->postJson("/api/v1/student/course-categories/{$this->migration->id}/purchase")
            ->assertCreated()
            ->assertJsonPath('data.order.amount_cents', 300000)
            ->assertJsonCount(1, 'data.order.items')
            ->assertJsonPath('data.order.items.0.course_id', $this->jobs->id);
    }

    public function test_paying_enrols_each_course_as_a_bundle_enrolment(): void
    {
        $orderId = $this->buyBundle($this->migration);

        $this->assertSame(OrderStatus::Paid, Order::findOrFail($orderId)->status);

        foreach ([$this->visas, $this->jobs] as $course) {
            $this->assertDatabaseHas('enrolments', [
                'student_id' => $this->student->id,
                'course_programme_id' => $course->id,
                'order_id' => $orderId,
                'source' => 'bundle',
            ]);
        }
    }

    public function test_buying_from_a_sub_category_page_buys_the_main_categorys_bundle(): void
    {
        $this->postJson("/api/v1/student/course-categories/{$this->uae->id}/purchase")
            ->assertCreated()
            ->assertJsonPath('data.order.amount_cents', 750000);
    }

    public function test_a_replayed_webhook_enrols_each_course_once(): void
    {
        $orderId = $this->postJson("/api/v1/student/course-categories/{$this->migration->id}/purchase")
            ->json('data.order.id');
        $checkout = $this->postJson("/api/v1/student/orders/{$orderId}/card")->json('data.checkout.checkout_url');

        $this->getJson($checkout)->assertOk();
        $this->getJson($checkout)->assertOk()->assertJsonPath('status', 'duplicate');

        $this->assertDatabaseCount('enrolments', 2);
    }

    public function test_the_order_enrols_what_was_frozen_not_what_was_added_later(): void
    {
        $orderId = $this->postJson("/api/v1/student/course-categories/{$this->migration->id}/purchase")
            ->json('data.order.id');
        // A card checkout is open: the order is pinned to what it froze.
        $checkout = $this->postJson("/api/v1/student/orders/{$orderId}/card")->json('data.checkout.checkout_url');

        $later = $this->course($this->uae, 'Added later', 100000);
        $this->getJson($checkout)->assertOk();

        $this->assertDatabaseMissing('enrolments', ['course_programme_id' => $later->id]);

        // …and the next bundle purchase is just that course.
        $this->postJson("/api/v1/student/course-categories/{$this->migration->id}/purchase")
            ->assertCreated()
            ->assertJsonPath('data.order.amount_cents', 100000);
    }

    public function test_a_stale_unpaid_order_is_replaced_when_the_bundle_changes(): void
    {
        $firstId = $this->postJson("/api/v1/student/course-categories/{$this->migration->id}/purchase")
            ->json('data.order.id');

        $this->own($this->visas);

        $secondId = $this->postJson("/api/v1/student/course-categories/{$this->migration->id}/purchase")
            ->assertCreated()
            ->assertJsonPath('data.order.amount_cents', 300000)
            ->json('data.order.id');

        $this->assertNotSame($firstId, $secondId);
        $this->assertSame(OrderStatus::Cancelled, Order::findOrFail($firstId)->status);
    }

    public function test_owning_everything_means_nothing_to_pay(): void
    {
        $this->own($this->visas);
        $this->own($this->jobs);

        $this->postJson("/api/v1/student/course-categories/{$this->migration->id}/purchase")
            ->assertOk()
            ->assertJsonPath('data.status', 'enrolled');

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_a_paid_course_in_a_bundle_category_cannot_be_bought_alone(): void
    {
        $this->getJson("/api/v1/student/courses/{$this->visas->id}")
            ->assertOk()
            ->assertJsonPath('data.sold_individually', false)
            ->assertJsonPath('data.bundle.category_id', $this->migration->id)
            ->assertJsonPath('data.bundle.remaining_count', 2)
            ->assertJsonPath('data.bundle.remaining_price_cents', 750000);

        $this->postJson("/api/v1/student/courses/{$this->visas->id}/enrol")->assertStatus(422);
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_a_free_course_stays_free_in_a_bundle_category(): void
    {
        $free = $this->course($this->uae, 'Free intro', 0);

        $this->postJson("/api/v1/student/courses/{$free->id}/enrol")
            ->assertCreated()
            ->assertJsonPath('data.status', 'enrolled');
    }

    public function test_a_single_mode_category_has_no_bundle(): void
    {
        $this->migration->update(['selling_mode' => 'single']);

        $this->postJson("/api/v1/student/course-categories/{$this->migration->id}/purchase")->assertStatus(422);

        $this->getJson("/api/v1/student/course-categories/{$this->migration->id}")
            ->assertOk()
            ->assertJsonPath('data.selling_mode', 'single')
            ->assertJsonPath('data.bundle', null);
    }

    public function test_the_category_page_reports_what_is_left_to_pay(): void
    {
        $this->own($this->jobs);

        $this->getJson("/api/v1/student/course-categories/{$this->uae->id}")
            ->assertOk()
            ->assertJsonPath('data.selling_mode', 'bundle')
            ->assertJsonPath('data.bundle.category_id', $this->migration->id)
            ->assertJsonPath('data.bundle.courses_count', 2)
            ->assertJsonPath('data.bundle.owned_count', 1)
            ->assertJsonPath('data.bundle.remaining_count', 1)
            ->assertJsonPath('data.bundle.remaining_price_cents', 450000)
            ->assertJsonPath('data.bundle.is_available', true)
            ->assertJsonMissingPath('data.is_active');
    }

    public function test_a_sub_category_can_be_its_own_bundle_outside_the_main_one(): void
    {
        $this->uae->update(['selling_mode' => 'bundle']);

        // The main bundle no longer holds UAE's course…
        $this->postJson("/api/v1/student/course-categories/{$this->migration->id}/purchase")
            ->assertCreated()
            ->assertJsonPath('data.order.amount_cents', 300000);

        // …which is sold in the UAE bundle, bought on UAE's page.
        $this->postJson("/api/v1/student/course-categories/{$this->uae->id}/purchase")
            ->assertCreated()
            ->assertJsonPath('data.order.amount_cents', 450000)
            ->assertJsonPath('data.order.title', 'Migration › UAE — course bundle');

        $this->getJson("/api/v1/student/courses/{$this->visas->id}")
            ->assertJsonPath('data.bundle.category_id', $this->uae->id);
        $this->getJson("/api/v1/student/course-categories/{$this->migration->id}")
            ->assertJsonPath('data.children.0.own_bundle', true);
    }

    public function test_a_sub_category_sold_one_by_one_is_outside_the_main_bundle(): void
    {
        $this->uae->update(['selling_mode' => 'single']);

        $this->getJson("/api/v1/student/courses/{$this->visas->id}")
            ->assertJsonPath('data.sold_individually', true)
            ->assertJsonPath('data.bundle', null);

        $this->postJson("/api/v1/student/course-categories/{$this->uae->id}/purchase")->assertStatus(422);
        $this->postJson("/api/v1/student/courses/{$this->visas->id}/enrol")->assertCreated();
    }

    public function test_a_sub_category_bundle_works_under_a_main_category_sold_one_by_one(): void
    {
        $this->migration->update(['selling_mode' => 'single']);
        $this->uae->update(['selling_mode' => 'bundle']);

        $this->postJson("/api/v1/student/courses/{$this->jobs->id}/enrol")->assertCreated();
        $this->postJson("/api/v1/student/courses/{$this->visas->id}/enrol")->assertStatus(422);
        $this->postJson("/api/v1/student/course-categories/{$this->uae->id}/purchase")
            ->assertCreated()
            ->assertJsonPath('data.order.amount_cents', 450000);
    }

    public function test_an_order_already_open_still_settles_after_switching_to_bundle(): void
    {
        $this->migration->update(['selling_mode' => 'single']);
        $orderId = $this->postJson("/api/v1/student/courses/{$this->visas->id}/enrol")->json('data.order.id');

        $this->migration->update(['selling_mode' => 'bundle']);

        $checkout = $this->postJson("/api/v1/student/orders/{$orderId}/card")->json('data.checkout.checkout_url');
        $this->getJson($checkout)->assertOk();

        $this->assertDatabaseHas('enrolments', ['course_programme_id' => $this->visas->id, 'source' => 'purchase']);
    }
}
