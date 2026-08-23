<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\RoleName;
use App\Models\Industry;
use App\Models\Profession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ProfessionManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;

    private User $supportAgent;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (RoleName::values() as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        $this->superAdmin = User::factory()->create();
        $this->superAdmin->assignRole(RoleName::SuperAdmin->value);

        $this->supportAgent = User::factory()->create();
        $this->supportAgent->assignRole(RoleName::SupportAgent->value);
    }

    public function test_guest_cannot_list_professions(): void
    {
        $this->getJson('/api/v1/admin/professions')->assertUnauthorized();
    }

    public function test_admin_can_create_a_profession_under_an_industry(): void
    {
        $industry = Industry::factory()->create();

        $response = $this->actingAs($this->superAdmin)->postJson('/api/v1/admin/professions', [
            'industry_id' => $industry->id,
            'name' => 'Chef',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Chef')
            ->assertJsonPath('data.industry.id', $industry->id);
    }

    public function test_creating_a_profession_requires_an_industry(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/v1/admin/professions', ['name' => 'Chef'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('industry_id');
    }

    public function test_support_agent_cannot_create_a_profession(): void
    {
        $industry = Industry::factory()->create();

        $this->actingAs($this->supportAgent)
            ->postJson('/api/v1/admin/professions', ['industry_id' => $industry->id, 'name' => 'Chef'])
            ->assertForbidden();
    }

    public function test_profession_name_only_needs_to_be_unique_within_its_industry(): void
    {
        $hospitality = Industry::factory()->create(['name' => 'Hospitality']);
        $construction = Industry::factory()->create(['name' => 'Construction']);
        Profession::factory()->create(['industry_id' => $hospitality->id, 'name' => 'Supervisor']);

        // Same name, different industry — allowed.
        $this->actingAs($this->superAdmin)
            ->postJson('/api/v1/admin/professions', ['industry_id' => $construction->id, 'name' => 'Supervisor'])
            ->assertCreated();

        // Same name, same industry — rejected.
        $this->actingAs($this->superAdmin)
            ->postJson('/api/v1/admin/professions', ['industry_id' => $hospitality->id, 'name' => 'Supervisor'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
    }

    public function test_admin_can_filter_professions_by_industry(): void
    {
        $hospitality = Industry::factory()->create();
        $construction = Industry::factory()->create();
        Profession::factory()->count(2)->create(['industry_id' => $hospitality->id]);
        Profession::factory()->count(3)->create(['industry_id' => $construction->id]);

        $response = $this->actingAs($this->superAdmin)
            ->getJson("/api/v1/admin/professions?industry_id={$hospitality->id}");

        $response->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_admin_can_deactivate_and_reactivate_a_profession(): void
    {
        $profession = Profession::factory()->create(['is_active' => true]);

        $this->actingAs($this->superAdmin)
            ->postJson("/api/v1/admin/professions/{$profession->id}/deactivate")
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->actingAs($this->superAdmin)
            ->postJson("/api/v1/admin/professions/{$profession->id}/activate")
            ->assertOk()
            ->assertJsonPath('data.is_active', true);
    }
}
