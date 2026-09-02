<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\RoleName;
use App\Enums\ServicePurchaseStatus;
use App\Enums\ServiceStatus;
use App\Models\Service;
use App\Models\ServicePurchase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ServiceManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;

    private User $contentManager;

    private User $supportAgent;

    private User $accountant;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (RoleName::values() as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        $this->superAdmin = User::factory()->create();
        $this->superAdmin->assignRole(RoleName::SuperAdmin->value);

        $this->contentManager = User::factory()->create();
        $this->contentManager->assignRole(RoleName::ContentManager->value);

        $this->supportAgent = User::factory()->create();
        $this->supportAgent->assignRole(RoleName::SupportAgent->value);

        $this->accountant = User::factory()->create();
        $this->accountant->assignRole(RoleName::Accountant->value);
    }

    /** @return array<string, mixed> */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'CV Writing',
            'summary' => 'A recruiter-ready CV, written for UAE employers.',
            'description' => '<p>We rewrite your CV.</p>',
            'price_cents' => 750000,
            'currency' => 'LKR',
            'delivery_time' => '3-5 working days',
            'status' => ServiceStatus::Draft->value,
        ], $overrides);
    }

    /*
    |--------------------------------------------------------------------------
    | Access
    |--------------------------------------------------------------------------
    */

    public function test_guest_cannot_list_services(): void
    {
        $this->getJson('/api/v1/admin/services')->assertUnauthorized();
    }

    public function test_any_admin_role_can_list_services(): void
    {
        Service::factory()->count(2)->create();

        $this->actingAs($this->accountant)
            ->getJson('/api/v1/admin/services')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_an_accountant_cannot_create_a_service(): void
    {
        $this->actingAs($this->accountant)
            ->postJson('/api/v1/admin/services', $this->payload())
            ->assertForbidden();

        $this->assertDatabaseCount('services', 0);
    }

    public function test_only_a_super_admin_can_delete_a_service(): void
    {
        $service = Service::factory()->create();

        $this->actingAs($this->contentManager)
            ->deleteJson("/api/v1/admin/services/{$service->id}")
            ->assertForbidden();

        $this->actingAs($this->superAdmin)
            ->deleteJson("/api/v1/admin/services/{$service->id}")
            ->assertNoContent();

        $this->assertSoftDeleted('services', ['id' => $service->id]);
    }

    /*
    |--------------------------------------------------------------------------
    | Create / update
    |--------------------------------------------------------------------------
    */

    public function test_a_content_manager_can_create_a_service(): void
    {
        $this->actingAs($this->contentManager)
            ->postJson('/api/v1/admin/services', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.name', 'CV Writing')
            ->assertJsonPath('data.price_cents', 750000)
            ->assertJsonPath('data.status', 'draft');

        $this->assertDatabaseHas('services', ['name' => 'CV Writing', 'price_cents' => 750000]);
    }

    public function test_a_service_must_carry_a_price_above_zero(): void
    {
        $this->actingAs($this->contentManager)
            ->postJson('/api/v1/admin/services', $this->payload(['price_cents' => 0]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('price_cents');
    }

    public function test_a_duplicate_name_is_rejected(): void
    {
        Service::factory()->create(['name' => 'CV Writing']);

        $this->actingAs($this->contentManager)
            ->postJson('/api/v1/admin/services', $this->payload())
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
    }

    /**
     * The soft-delete case a database unique index would have turned into a 500.
     */
    public function test_a_deleted_service_does_not_block_reusing_its_name(): void
    {
        $service = Service::factory()->create(['name' => 'CV Writing']);
        $service->delete();

        $this->actingAs($this->contentManager)
            ->postJson('/api/v1/admin/services', $this->payload())
            ->assertCreated();
    }

    public function test_the_description_is_sanitized_before_storage(): void
    {
        $this->actingAs($this->contentManager)
            ->postJson('/api/v1/admin/services', $this->payload([
                'description' => '<p>Safe</p><script>alert(1)</script>',
            ]))
            ->assertCreated();

        $stored = (string) Service::first()->description;

        $this->assertStringNotContainsString('<script', $stored);
        $this->assertStringContainsString('Safe', $stored);
    }

    public function test_a_service_can_be_updated(): void
    {
        $service = Service::factory()->create(['name' => 'CV Writing']);

        $this->actingAs($this->contentManager)
            ->putJson("/api/v1/admin/services/{$service->id}", $this->payload([
                'name' => 'CV Writing (Premium)',
                'price_cents' => 900000,
            ]))
            ->assertOk()
            ->assertJsonPath('data.name', 'CV Writing (Premium)')
            ->assertJsonPath('data.price_cents', 900000);
    }

    /*
    |--------------------------------------------------------------------------
    | Publishing and thumbnails
    |--------------------------------------------------------------------------
    */

    public function test_a_service_can_be_published_and_unpublished(): void
    {
        $service = Service::factory()->create();

        $this->actingAs($this->contentManager)
            ->postJson("/api/v1/admin/services/{$service->id}/publish")
            ->assertOk()
            ->assertJsonPath('data.status', 'published');

        $this->actingAs($this->contentManager)
            ->postJson("/api/v1/admin/services/{$service->id}/unpublish")
            ->assertOk()
            ->assertJsonPath('data.status', 'draft');
    }

    public function test_a_thumbnail_is_re_encoded_to_jpeg(): void
    {
        Storage::fake('public');
        $service = Service::factory()->create();

        $this->actingAs($this->contentManager)
            ->postJson("/api/v1/admin/services/{$service->id}/thumbnail", [
                'thumbnail' => UploadedFile::fake()->image('art.png', 1600, 900),
            ])
            ->assertOk()
            ->assertJsonPath('data.thumbnail_url', fn ($url) => is_string($url) && str_ends_with($url, '.jpg'));
    }

    public function test_a_non_image_thumbnail_is_rejected(): void
    {
        $service = Service::factory()->create();

        $this->actingAs($this->contentManager)
            ->postJson("/api/v1/admin/services/{$service->id}/thumbnail", [
                'thumbnail' => UploadedFile::fake()->create('payload.php', 20, 'text/php'),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('thumbnail');
    }

    /*
    |--------------------------------------------------------------------------
    | The delivery queue
    |--------------------------------------------------------------------------
    */

    public function test_the_delivery_queue_lists_purchases(): void
    {
        ServicePurchase::factory()->count(2)->create();

        $this->actingAs($this->supportAgent)
            ->getJson('/api/v1/admin/service-purchases')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.status', 'pending');
    }

    public function test_a_support_agent_can_advance_a_purchase(): void
    {
        $purchase = ServicePurchase::factory()->create();

        $this->actingAs($this->supportAgent)
            ->postJson("/api/v1/admin/service-purchases/{$purchase->id}/status", [
                'status' => ServicePurchaseStatus::InProgress->value,
                'note' => 'Draft sent to the writer.',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'in_progress')
            ->assertJsonPath('data.admin_note', 'Draft sent to the writer.');

        $this->assertNotNull($purchase->refresh()->started_at);
        $this->assertSame($this->supportAgent->id, $purchase->handled_by);
    }

    public function test_an_accountant_cannot_advance_a_purchase(): void
    {
        $purchase = ServicePurchase::factory()->create();

        $this->actingAs($this->accountant)
            ->postJson("/api/v1/admin/service-purchases/{$purchase->id}/status", [
                'status' => ServicePurchaseStatus::Completed->value,
            ])
            ->assertForbidden();
    }

    public function test_a_completed_purchase_cannot_be_reopened(): void
    {
        $purchase = ServicePurchase::factory()->status(ServicePurchaseStatus::Completed)->create();

        $this->actingAs($this->supportAgent)
            ->postJson("/api/v1/admin/service-purchases/{$purchase->id}/status", [
                'status' => ServicePurchaseStatus::InProgress->value,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');

        $this->assertSame(ServicePurchaseStatus::Completed, $purchase->refresh()->status);
    }

    public function test_an_unknown_status_is_rejected(): void
    {
        $purchase = ServicePurchase::factory()->create();

        $this->actingAs($this->supportAgent)
            ->postJson("/api/v1/admin/service-purchases/{$purchase->id}/status", ['status' => 'delivered'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    }
}
