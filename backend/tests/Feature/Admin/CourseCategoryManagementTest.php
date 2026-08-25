<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\RoleName;
use App\Models\CourseCategory;
use App\Models\CourseProgramme;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CourseCategoryManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;

    private User $contentManager;

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

        $this->accountant = User::factory()->create();
        $this->accountant->assignRole(RoleName::Accountant->value);
    }

    public function test_guest_cannot_list_course_categories(): void
    {
        $this->getJson('/api/v1/admin/course-categories')->assertUnauthorized();
    }

    public function test_admin_can_create_a_course_category(): void
    {
        $this->actingAs($this->contentManager)
            ->postJson('/api/v1/admin/course-categories', [
                'name' => 'UAE Migration Program',
                'description' => 'The full pre-departure learning path.',
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'UAE Migration Program')
            ->assertJsonPath('data.is_active', true);
    }

    public function test_category_names_must_be_unique(): void
    {
        CourseCategory::factory()->create(['name' => 'UAE Migration Program']);

        $this->actingAs($this->superAdmin)
            ->postJson('/api/v1/admin/course-categories', ['name' => 'UAE Migration Program'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('name');
    }

    public function test_creating_a_category_requires_a_name(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/v1/admin/course-categories', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('name');
    }

    public function test_a_role_without_content_rights_cannot_create_a_category(): void
    {
        $this->actingAs($this->accountant)
            ->postJson('/api/v1/admin/course-categories', ['name' => 'Finance Basics'])
            ->assertForbidden();
    }

    public function test_any_admin_role_can_list_categories(): void
    {
        CourseCategory::factory()->count(3)->create();

        $this->actingAs($this->accountant)
            ->getJson('/api/v1/admin/course-categories')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_admin_can_rename_a_category(): void
    {
        $category = CourseCategory::factory()->create(['name' => 'Old name']);

        $this->actingAs($this->contentManager)
            ->putJson("/api/v1/admin/course-categories/{$category->id}", ['name' => 'New name'])
            ->assertOk()
            ->assertJsonPath('data.name', 'New name');
    }

    public function test_admin_can_deactivate_and_reactivate_a_category(): void
    {
        $category = CourseCategory::factory()->create();

        $this->actingAs($this->contentManager)
            ->postJson("/api/v1/admin/course-categories/{$category->id}/deactivate")
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->actingAs($this->contentManager)
            ->postJson("/api/v1/admin/course-categories/{$category->id}/activate")
            ->assertOk()
            ->assertJsonPath('data.is_active', true);
    }

    /** Categories are deactivated, never deleted — no destroy route exists. */
    public function test_categories_cannot_be_deleted(): void
    {
        $category = CourseCategory::factory()->create();

        $this->actingAs($this->superAdmin)
            ->deleteJson("/api/v1/admin/course-categories/{$category->id}")
            ->assertMethodNotAllowed();
    }

    public function test_the_list_reports_how_many_programmes_a_category_holds(): void
    {
        $category = CourseCategory::factory()->create();
        CourseProgramme::factory()->count(2)->create(['course_category_id' => $category->id]);

        $this->actingAs($this->superAdmin)
            ->getJson('/api/v1/admin/course-categories')
            ->assertOk()
            ->assertJsonPath('data.0.programmes_count', 2);
    }

    public function test_categories_can_be_filtered_by_active_state(): void
    {
        CourseCategory::factory()->create(['name' => 'Active one']);
        CourseCategory::factory()->inactive()->create(['name' => 'Retired one']);

        $this->actingAs($this->superAdmin)
            ->getJson('/api/v1/admin/course-categories?is_active=0')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Retired one');
    }
}
