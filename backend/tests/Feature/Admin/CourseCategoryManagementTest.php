<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\EnrolmentSource;
use App\Enums\RoleName;
use App\Models\CourseCategory;
use App\Models\CourseProgramme;
use App\Models\Enrolment;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
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

    public function test_admin_can_set_and_clear_a_category_icon(): void
    {
        $id = $this->actingAs($this->contentManager)
            ->postJson('/api/v1/admin/course-categories', [
                'name' => 'Language & Communication',
                'icon' => 'language',
            ])
            ->assertCreated()
            ->assertJsonPath('data.icon', 'language')
            ->json('data.id');

        // Cleared back to "no choice", which the app answers by guessing from the name.
        $this->actingAs($this->contentManager)
            ->putJson("/api/v1/admin/course-categories/{$id}", [
                'name' => 'Language & Communication',
                'icon' => null,
            ])
            ->assertOk()
            ->assertJsonPath('data.icon', null);
    }

    public function test_a_category_icon_must_come_from_the_list(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/v1/admin/course-categories', [
                'name' => 'Social Media',
                'icon' => 'rocket',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('icon');
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

    public function test_admin_can_add_a_sub_category_under_a_parent(): void
    {
        $parent = CourseCategory::factory()->create(['name' => 'Migration']);

        $this->actingAs($this->contentManager)
            ->postJson('/api/v1/admin/course-categories', [
                'parent_id' => $parent->id,
                'name' => 'UAE',
                'name_si' => 'එක්සත් අරාබි එමීර් රාජ්‍යය',
            ])
            ->assertCreated()
            ->assertJsonPath('data.parent_id', $parent->id)
            ->assertJsonPath('data.name_si', 'එක්සත් අරාබි එමීර් රාජ්‍යය');

        $this->actingAs($this->contentManager)
            ->getJson('/api/v1/admin/course-categories')
            ->assertOk()
            // Pagination counts parents; the child is nested, not a row of its own.
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.children.0.name', 'UAE');
    }

    public function test_the_tree_is_two_levels_deep_only(): void
    {
        $parent = CourseCategory::factory()->create();
        $child = CourseCategory::factory()->childOf($parent)->create();

        $this->actingAs($this->contentManager)
            ->postJson('/api/v1/admin/course-categories', ['parent_id' => $child->id, 'name' => 'Too deep'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('parent_id');

        // A parent with children cannot itself be moved under another category.
        $other = CourseCategory::factory()->create();
        $this->actingAs($this->contentManager)
            ->putJson("/api/v1/admin/course-categories/{$parent->id}", [
                'parent_id' => $other->id,
                'name' => $parent->name,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('parent_id');
    }

    public function test_sub_category_names_are_unique_per_parent_only(): void
    {
        $migration = CourseCategory::factory()->create(['name' => 'Migration']);
        $jobs = CourseCategory::factory()->create(['name' => 'Jobs']);
        CourseCategory::factory()->childOf($migration)->create(['name' => 'UAE']);

        $this->actingAs($this->contentManager)
            ->postJson('/api/v1/admin/course-categories', ['parent_id' => $jobs->id, 'name' => 'UAE'])
            ->assertCreated();

        $this->actingAs($this->contentManager)
            ->postJson('/api/v1/admin/course-categories', ['parent_id' => $migration->id, 'name' => 'UAE'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('name');
    }

    public function test_deleting_a_category_soft_deletes_its_branch_and_courses(): void
    {
        $parent = CourseCategory::factory()->create();
        $child = CourseCategory::factory()->childOf($parent)->create();
        $onParent = CourseProgramme::factory()->create(['course_category_id' => $parent->id]);
        $onChild = CourseProgramme::factory()->create(['course_category_id' => $child->id]);

        $this->actingAs($this->superAdmin)
            ->deleteJson("/api/v1/admin/course-categories/{$parent->id}")
            ->assertNoContent();

        $this->assertSoftDeleted($parent);
        $this->assertSoftDeleted($child);
        $this->assertSoftDeleted($onParent);
        $this->assertSoftDeleted($onChild);
    }

    public function test_a_category_with_enrolled_students_cannot_be_deleted(): void
    {
        $parent = CourseCategory::factory()->create();
        $child = CourseCategory::factory()->childOf($parent)->create();
        $programme = CourseProgramme::factory()->create(['course_category_id' => $child->id]);
        Enrolment::create([
            'student_id' => Student::factory()->create()->id,
            'course_programme_id' => $programme->id,
            'source' => EnrolmentSource::Free,
            'enrolled_at' => now(),
        ]);

        $this->actingAs($this->superAdmin)
            ->deleteJson("/api/v1/admin/course-categories/{$parent->id}")
            ->assertStatus(422)
            ->assertJsonValidationErrors('category');

        $this->assertNotSoftDeleted($parent);
        $this->assertNotSoftDeleted($programme);
    }

    public function test_a_main_category_can_switch_to_bundle_selling(): void
    {
        $this->actingAs($this->contentManager)
            ->postJson('/api/v1/admin/course-categories', [
                'name' => 'Migration',
                'selling_mode' => 'bundle',
            ])
            ->assertCreated()
            ->assertJsonPath('data.selling_mode', 'bundle');
    }

    public function test_a_sub_category_follows_its_main_category_unless_set(): void
    {
        $parent = CourseCategory::factory()->create();

        $this->actingAs($this->contentManager)
            ->postJson('/api/v1/admin/course-categories', ['parent_id' => $parent->id, 'name' => 'UAE'])
            ->assertCreated()
            ->assertJsonPath('data.selling_mode', 'inherit');

        $this->actingAs($this->contentManager)
            ->postJson('/api/v1/admin/course-categories', [
                'parent_id' => $parent->id,
                'name' => 'AUS',
                'selling_mode' => 'bundle',
            ])
            ->assertCreated()
            ->assertJsonPath('data.selling_mode', 'bundle');
    }

    public function test_a_main_category_cannot_follow_anything(): void
    {
        $this->actingAs($this->contentManager)
            ->postJson('/api/v1/admin/course-categories', ['name' => 'Migration', 'selling_mode' => 'inherit'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('selling_mode');
    }

    public function test_only_a_super_admin_can_delete_a_category(): void
    {
        $category = CourseCategory::factory()->create();

        $this->actingAs($this->contentManager)
            ->deleteJson("/api/v1/admin/course-categories/{$category->id}")
            ->assertForbidden();
    }

    public function test_a_sub_category_can_upload_a_png_icon(): void
    {
        Storage::fake('public');
        $parent = CourseCategory::factory()->create();
        $child = CourseCategory::factory()->childOf($parent)->create();

        $url = $this->actingAs($this->contentManager)
            ->postJson("/api/v1/admin/course-categories/{$child->id}/icon-image", [
                'icon_image' => UploadedFile::fake()->image('uae.png', 300, 300),
            ])
            ->assertOk()
            ->json('data.icon_image_url');

        $this->assertNotNull($url);
    }

    public function test_a_top_level_category_cannot_upload_an_icon(): void
    {
        Storage::fake('public');
        $parent = CourseCategory::factory()->create();

        $this->actingAs($this->contentManager)
            ->postJson("/api/v1/admin/course-categories/{$parent->id}/icon-image", [
                'icon_image' => UploadedFile::fake()->image('migration.png', 256, 256),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('icon_image');
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
