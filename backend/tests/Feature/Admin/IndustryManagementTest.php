<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\RoleName;
use App\Models\Industry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class IndustryManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;

    private User $contentManager;

    private User $supportAgent;

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
    }

    public function test_guest_cannot_list_industries(): void
    {
        $this->getJson('/api/v1/admin/industries')->assertUnauthorized();
    }

    public function test_any_admin_role_can_list_industries(): void
    {
        Industry::factory()->count(3)->create();

        $response = $this->actingAs($this->supportAgent)->getJson('/api/v1/admin/industries');

        $response->assertOk()->assertJsonCount(3, 'data');
    }

    public function test_content_manager_can_create_an_industry(): void
    {
        $response = $this->actingAs($this->contentManager)->postJson('/api/v1/admin/industries', [
            'name' => 'Hospitality',
        ]);

        $response->assertCreated()->assertJsonPath('data.name', 'Hospitality');
    }

    public function test_support_agent_cannot_create_an_industry(): void
    {
        $this->actingAs($this->supportAgent)
            ->postJson('/api/v1/admin/industries', ['name' => 'Hospitality'])
            ->assertForbidden();
    }

    public function test_industry_name_must_be_unique(): void
    {
        Industry::factory()->create(['name' => 'Hospitality']);

        $this->actingAs($this->superAdmin)
            ->postJson('/api/v1/admin/industries', ['name' => 'Hospitality'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
    }

    public function test_admin_can_update_an_industry(): void
    {
        $industry = Industry::factory()->create(['name' => 'Old Name']);

        $response = $this->actingAs($this->superAdmin)->putJson("/api/v1/admin/industries/{$industry->id}", [
            'name' => 'New Name',
        ]);

        $response->assertOk()->assertJsonPath('data.name', 'New Name');
    }

    public function test_admin_can_deactivate_and_reactivate_an_industry(): void
    {
        $industry = Industry::factory()->create(['is_active' => true]);

        $this->actingAs($this->superAdmin)
            ->postJson("/api/v1/admin/industries/{$industry->id}/deactivate")
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->actingAs($this->superAdmin)
            ->postJson("/api/v1/admin/industries/{$industry->id}/activate")
            ->assertOk()
            ->assertJsonPath('data.is_active', true);

        $this->assertDatabaseHas('industries', ['id' => $industry->id, 'is_active' => true]);
    }
}
