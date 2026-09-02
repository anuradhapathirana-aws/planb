<?php

declare(strict_types=1);

namespace Tests\Feature\Student;

use App\Enums\OrderStatus;
use App\Enums\ServicePurchaseStatus;
use App\Models\Service;
use App\Models\ServicePurchase;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentServicePurchaseTest extends TestCase
{
    use RefreshDatabase;

    private Student $student;

    private Service $service;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('payments.gateway', 'sandbox');

        $this->student = Student::factory()->create(['is_blocked' => false]);
        Sanctum::actingAs($this->student, ['student'], 'student');

        $this->service = Service::factory()->published()->create([
            'name' => 'CV Writing',
            'price_cents' => 750000,
            'currency' => 'LKR',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Browsing
    |--------------------------------------------------------------------------
    */

    public function test_a_guest_cannot_browse_services(): void
    {
        $this->app['auth']->forgetGuards();

        $this->getJson('/api/v1/student/services')->assertUnauthorized();
    }

    public function test_only_published_services_are_listed(): void
    {
        Service::factory()->create(['name' => 'Unfinished draft']);

        $this->getJson('/api/v1/student/services')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'CV Writing')
            ->assertJsonPath('data.0.has_open_purchase', false);
    }

    /** The published scope is the authorization — a draft is not merely hidden. */
    public function test_a_draft_service_cannot_be_opened_directly(): void
    {
        $draft = Service::factory()->create();

        $this->getJson("/api/v1/student/services/{$draft->id}")->assertNotFound();
        $this->postJson("/api/v1/student/services/{$draft->id}/purchase")->assertNotFound();
    }

    public function test_a_deleted_service_cannot_be_opened(): void
    {
        $this->service->delete();

        $this->getJson("/api/v1/student/services/{$this->service->id}")->assertNotFound();
    }

    public function test_the_catalogue_is_searchable_by_name_and_summary(): void
    {
        Service::factory()->published()->create(['name' => 'Visa Consultation', 'summary' => 'One hour call.']);

        $this->getJson('/api/v1/student/services?search=visa')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Visa Consultation');

        $this->getJson('/api/v1/student/services?search=one hour')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    /** `%` is a LIKE wildcard; typed by a student it is a literal character. */
    public function test_a_wildcard_in_the_search_term_matches_nothing(): void
    {
        Service::factory()->published()->create(['name' => 'Visa Consultation']);

        $this->getJson('/api/v1/student/services?search=%')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_the_detail_response_carries_the_description(): void
    {
        $this->getJson("/api/v1/student/services/{$this->service->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $this->service->id)
            ->assertJsonPath('data.latest_purchase', null)
            ->assertJsonStructure(['data' => ['id', 'name', 'summary', 'description', 'price_cents', 'currency']]);
    }

    /** The app draws its delivery tracker from this, so it must not need a second request. */
    public function test_the_detail_response_carries_this_students_latest_purchase(): void
    {
        ServicePurchase::factory()->create([
            'student_id' => $this->student->id,
            'service_id' => $this->service->id,
        ]);

        $this->getJson("/api/v1/student/services/{$this->service->id}")
            ->assertOk()
            ->assertJsonPath('data.latest_purchase.status', 'pending')
            ->assertJsonPath('data.latest_purchase.is_open', true);
    }

    /** Scoped to the caller — never "the latest purchase" of anybody's. */
    public function test_another_students_purchase_never_appears_on_the_detail(): void
    {
        ServicePurchase::factory()->create(['service_id' => $this->service->id]);

        $this->getJson("/api/v1/student/services/{$this->service->id}")
            ->assertOk()
            ->assertJsonPath('data.latest_purchase', null);
    }

    /** A withdrawn service still has to show up: it was paid for and is still owed. */
    public function test_a_purchase_survives_its_service_being_withdrawn(): void
    {
        ServicePurchase::factory()->create([
            'student_id' => $this->student->id,
            'service_id' => $this->service->id,
            'title_snapshot' => 'CV Writing',
        ]);

        $this->service->delete();

        $this->getJson('/api/v1/student/service-purchases')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'CV Writing')
            ->assertJsonPath('data.0.service.is_available', false);
    }

    /*
    |--------------------------------------------------------------------------
    | Buying
    |--------------------------------------------------------------------------
    */

    public function test_buying_a_service_opens_an_order_priced_by_the_server(): void
    {
        $this->postJson("/api/v1/student/services/{$this->service->id}/purchase")
            ->assertCreated()
            ->assertJsonPath('data.status', 'payment_required')
            ->assertJsonPath('data.order.amount_cents', 750000)
            ->assertJsonPath('data.order.item.type', 'service')
            ->assertJsonPath('data.order.item.id', $this->service->id);

        $this->assertDatabaseHas('orders', [
            'student_id' => $this->student->id,
            'purchasable_type' => Service::class,
            'purchasable_id' => $this->service->id,
            'amount_cents' => 750000,
            'status' => OrderStatus::Pending->value,
        ]);
    }

    /** An amount in the request body is never trusted (root CLAUDE.md §7.3). */
    public function test_a_client_supplied_amount_is_ignored(): void
    {
        $this->postJson("/api/v1/student/services/{$this->service->id}/purchase", [
            'amount_cents' => 1,
            'price_cents' => 1,
        ])->assertCreated()->assertJsonPath('data.order.amount_cents', 750000);
    }

    public function test_buying_twice_before_paying_reuses_the_same_order(): void
    {
        $first = $this->postJson("/api/v1/student/services/{$this->service->id}/purchase")->assertCreated();
        $second = $this->postJson("/api/v1/student/services/{$this->service->id}/purchase")->assertCreated();

        $this->assertSame(
            $first->json('data.order.id'),
            $second->json('data.order.id'),
        );
        $this->assertDatabaseCount('orders', 1);
    }

    public function test_a_service_still_being_delivered_cannot_be_bought_again(): void
    {
        ServicePurchase::factory()->create([
            'student_id' => $this->student->id,
            'service_id' => $this->service->id,
        ]);

        $this->postJson("/api/v1/student/services/{$this->service->id}/purchase")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('service');
    }

    public function test_a_finished_service_can_be_bought_again(): void
    {
        ServicePurchase::factory()
            ->status(ServicePurchaseStatus::Completed)
            ->create([
                'student_id' => $this->student->id,
                'service_id' => $this->service->id,
            ]);

        $this->postJson("/api/v1/student/services/{$this->service->id}/purchase")->assertCreated();
    }

    public function test_the_list_reports_an_open_purchase(): void
    {
        ServicePurchase::factory()->create([
            'student_id' => $this->student->id,
            'service_id' => $this->service->id,
        ]);

        $this->getJson('/api/v1/student/services')
            ->assertOk()
            ->assertJsonPath('data.0.has_open_purchase', true)
            ->assertJsonPath('data.0.open_purchase_status', 'pending');
    }

    /** Another student's open purchase must not gate this one's Buy button. */
    public function test_another_students_purchase_does_not_leak_into_the_list(): void
    {
        ServicePurchase::factory()->create(['service_id' => $this->service->id]);

        $this->getJson('/api/v1/student/services')
            ->assertOk()
            ->assertJsonPath('data.0.has_open_purchase', false);
    }

    /*
    |--------------------------------------------------------------------------
    | Fulfilment
    |--------------------------------------------------------------------------
    */

    public function test_paying_for_a_service_creates_one_delivery_job(): void
    {
        $orderId = $this->postJson("/api/v1/student/services/{$this->service->id}/purchase")->json('data.order.id');
        $checkout = $this->postJson("/api/v1/student/orders/{$orderId}/card")->json('data.checkout.checkout_url');

        // The sandbox "hosted page" posts back through the real webhook path, so
        // this exercises the same settlement code a live gateway would drive.
        $this->getJson($checkout)->assertOk()->assertJsonPath('paid', true);

        $this->assertDatabaseHas('orders', ['id' => $orderId, 'status' => OrderStatus::Paid->value]);
        $this->assertDatabaseHas('service_purchases', [
            'student_id' => $this->student->id,
            'service_id' => $this->service->id,
            'order_id' => $orderId,
            'status' => ServicePurchaseStatus::Pending->value,
            'title_snapshot' => 'CV Writing',
        ]);
        $this->assertDatabaseCount('service_purchases', 1);
        // A service produces a delivery job, never course access.
        $this->assertDatabaseCount('enrolments', 0);
    }

    /** Gateways retry until they get a 200, so the same success WILL arrive twice. */
    public function test_a_replayed_webhook_does_not_create_a_second_delivery_job(): void
    {
        $orderId = $this->postJson("/api/v1/student/services/{$this->service->id}/purchase")->json('data.order.id');
        $checkout = $this->postJson("/api/v1/student/orders/{$orderId}/card")->json('data.checkout.checkout_url');

        $this->getJson($checkout)->assertOk();
        $this->getJson($checkout)->assertOk()->assertJsonPath('status', 'duplicate');

        $this->assertDatabaseCount('service_purchases', 1);
    }

    /**
     * An admin withdrawing a service between checkout and callback must not cost
     * the student the thing they paid for — `settleOrder` resolves the product
     * `withTrashed()` for exactly this.
     */
    public function test_a_service_withdrawn_mid_checkout_is_still_fulfilled(): void
    {
        $orderId = $this->postJson("/api/v1/student/services/{$this->service->id}/purchase")->json('data.order.id');
        $checkout = $this->postJson("/api/v1/student/orders/{$orderId}/card")->json('data.checkout.checkout_url');

        $this->service->delete();

        $this->getJson($checkout)->assertOk()->assertJsonPath('paid', true);

        $this->assertDatabaseHas('service_purchases', [
            'order_id' => $orderId,
            'service_id' => $this->service->id,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | My services
    |--------------------------------------------------------------------------
    */

    public function test_a_student_sees_only_their_own_purchases(): void
    {
        ServicePurchase::factory()->create([
            'student_id' => $this->student->id,
            'service_id' => $this->service->id,
            'title_snapshot' => 'CV Writing',
        ]);
        ServicePurchase::factory()->create(['service_id' => $this->service->id]);

        $this->getJson('/api/v1/student/service-purchases')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'CV Writing');
    }

    /** Internal working notes about a student must never reach that student. */
    public function test_the_student_payload_never_carries_the_admin_note(): void
    {
        $purchase = ServicePurchase::factory()->create([
            'student_id' => $this->student->id,
            'service_id' => $this->service->id,
        ]);
        $purchase->forceFill(['admin_note' => 'Chase the writer, student is difficult.'])->save();

        $response = $this->getJson('/api/v1/student/service-purchases')->assertOk();

        $this->assertArrayNotHasKey('admin_note', $response->json('data.0'));
        $this->assertArrayNotHasKey('handled_by', $response->json('data.0'));
        $response->assertDontSee('difficult');
    }
}
