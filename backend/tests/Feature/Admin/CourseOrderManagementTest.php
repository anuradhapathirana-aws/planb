<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\CourseStatus;
use App\Enums\RoleName;
use App\Models\CourseCategory;
use App\Models\CourseProgramme;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/** "Course 1, Course 2…" — arranging the order a category's courses are taken in. */
class CourseOrderManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $contentManager;

    private User $accountant;

    private CourseCategory $category;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (RoleName::values() as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        $this->contentManager = User::factory()->create();
        $this->contentManager->assignRole(RoleName::ContentManager->value);

        $this->accountant = User::factory()->create();
        $this->accountant->assignRole(RoleName::Accountant->value);

        $this->category = CourseCategory::factory()->create(['name' => 'UAE Migration']);
    }

    private function course(string $name, int $sortOrder, ?CourseCategory $category = null): CourseProgramme
    {
        return CourseProgramme::factory()->create([
            'name' => $name,
            'course_category_id' => ($category ?? $this->category)->id,
            'sort_order' => $sortOrder,
        ]);
    }

    private function url(?CourseCategory $category = null): string
    {
        return '/api/v1/admin/course-categories/'.($category ?? $this->category)->id.'/course-order';
    }

    public function test_it_lists_a_categorys_own_courses_in_order_with_positions(): void
    {
        $this->course('Second', 20);
        $this->course('First', 10);
        $sub = CourseCategory::factory()->childOf($this->category)->create();
        $this->course('In the sub-category', 1, $sub);

        $this->actingAs($this->contentManager)
            ->getJson($this->url())
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.name', 'First')
            ->assertJsonPath('data.0.position', 1)
            ->assertJsonPath('data.1.name', 'Second')
            ->assertJsonPath('data.1.position', 2);
    }

    public function test_saving_rewrites_the_order_as_one_to_n(): void
    {
        $a = $this->course('A', 0);
        $b = $this->course('B', 0);
        $c = $this->course('C', 7);

        $this->actingAs($this->contentManager)
            ->putJson($this->url(), ['programme_ids' => [$c->id, $a->id, $b->id]])
            ->assertOk()
            ->assertJsonPath('data.0.name', 'C')
            ->assertJsonPath('data.2.position', 3);

        $this->assertSame(1, $c->fresh()->sort_order);
        $this->assertSame(2, $a->fresh()->sort_order);
        $this->assertSame(3, $b->fresh()->sort_order);
    }

    public function test_a_partial_list_is_refused(): void
    {
        $a = $this->course('A', 1);
        $this->course('B', 2);

        $this->actingAs($this->contentManager)
            ->putJson($this->url(), ['programme_ids' => [$a->id]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('programme_ids');
    }

    public function test_a_course_from_another_category_is_refused(): void
    {
        $a = $this->course('A', 1);
        $elsewhere = $this->course('Elsewhere', 1, CourseCategory::factory()->create());

        $this->actingAs($this->contentManager)
            ->putJson($this->url(), ['programme_ids' => [$a->id, $elsewhere->id]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('programme_ids.1');

        $this->assertSame(1, $elsewhere->fresh()->sort_order);
    }

    public function test_a_role_that_cannot_edit_courses_cannot_reorder_them(): void
    {
        $a = $this->course('A', 1);

        $this->actingAs($this->accountant)
            ->putJson($this->url(), ['programme_ids' => [$a->id]])
            ->assertForbidden();
    }

    public function test_the_course_list_carries_each_courses_position_in_its_own_category(): void
    {
        $this->course('First', 1);
        $this->course('Second', 2)->update(['status' => CourseStatus::Published]);
        $this->course('Elsewhere', 5, CourseCategory::factory()->create());

        $positions = collect(
            $this->actingAs($this->contentManager)->getJson('/api/v1/admin/course-programmes')->assertOk()->json('data'),
        )->pluck('position', 'name');

        $this->assertSame(1, $positions['First']);
        $this->assertSame(2, $positions['Second']);
        $this->assertSame(1, $positions['Elsewhere']);
    }

    public function test_moving_a_course_to_another_category_puts_it_last_there(): void
    {
        $other = CourseCategory::factory()->create();
        $this->course('Already there', 4, $other);
        $moving = $this->course('Moving', 1);

        $this->actingAs($this->contentManager)
            ->putJson('/api/v1/admin/course-programmes/'.$moving->id, [
                'course_category_id' => $other->id,
                'name' => 'Moving',
                'topics' => [['title' => 'Intro']],
            ])
            ->assertOk();

        $this->assertSame(5, $moving->fresh()->sort_order);
    }
}
