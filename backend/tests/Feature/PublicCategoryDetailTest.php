<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\CourseStatus;
use App\Enums\SellingMode;
use App\Models\CourseCategory;
use App\Models\CourseProgramme;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * `GET api/v1/public/course-categories/{id}` — a category's (a bundle's) public page.
 */
class PublicCategoryDetailTest extends TestCase
{
    use RefreshDatabase;

    private function category(array $attributes = []): CourseCategory
    {
        return CourseCategory::query()->create(array_merge([
            'name' => 'UAE Programs',
            'is_active' => true,
            'selling_mode' => SellingMode::Bundle->value,
            'sort_order' => 0,
        ], $attributes));
    }

    private function course(CourseCategory $category, array $attributes = []): CourseProgramme
    {
        return CourseProgramme::query()->create(array_merge([
            'course_category_id' => $category->id,
            'name' => 'A course',
            'price_cents' => 1_000_00,
            'currency' => 'LKR',
            'status' => CourseStatus::Published->value,
            'sort_order' => 0,
        ], $attributes));
    }

    private function url(CourseCategory|int $category): string
    {
        return '/api/v1/public/course-categories/'.($category instanceof CourseCategory ? $category->id : $category);
    }

    public function test_a_bundle_lists_exactly_what_it_sells_at_its_list_price(): void
    {
        $bundle = $this->category();
        $follows = $this->category(['name' => 'Follows', 'parent_id' => $bundle->id, 'selling_mode' => SellingMode::Inherit->value]);
        $ownBundle = $this->category(['name' => 'Own bundle', 'parent_id' => $bundle->id, 'selling_mode' => SellingMode::Bundle->value]);

        $this->course($bundle, ['name' => 'Direct', 'price_cents' => 1_000_00]);
        $this->course($follows, ['name' => 'Inherited', 'price_cents' => 2_000_00]);
        $this->course($ownBundle, ['name' => 'Sold separately', 'price_cents' => 9_000_00]);

        $response = $this->getJson($this->url($bundle))
            ->assertOk()
            ->assertJsonPath('data.name', 'UAE Programs')
            ->assertJsonPath('data.courses_count', 2)
            ->assertJsonPath('data.bundle.category_id', $bundle->id)
            ->assertJsonPath('data.bundle.price_cents', 3_000_00);

        $this->assertEqualsCanonicalizing(['Direct', 'Inherited'], collect($response->json('data.courses'))->pluck('name')->all());

        $children = collect($response->json('data.children'))->keyBy('name');
        $this->assertFalse($children['Follows']['own_bundle']);
        $this->assertTrue($children['Own bundle']['own_bundle']);
    }

    /** A sub-category that follows its main category's bundle points at that bundle's page. */
    public function test_a_following_sub_category_names_its_main_bundle(): void
    {
        $bundle = $this->category();
        $follows = $this->category(['name' => 'Follows', 'parent_id' => $bundle->id, 'selling_mode' => SellingMode::Inherit->value]);
        $this->course($follows);

        $this->getJson($this->url($follows))
            ->assertOk()
            ->assertJsonPath('data.parent.id', $bundle->id)
            ->assertJsonPath('data.bundle.category_id', $bundle->id);
    }

    public function test_a_category_sold_one_by_one_has_no_bundle(): void
    {
        $category = $this->category(['selling_mode' => SellingMode::Single->value]);
        $this->course($category);

        $this->getJson($this->url($category))
            ->assertOk()
            ->assertJsonPath('data.bundle', null)
            ->assertJsonCount(1, 'data.courses');
    }

    /** A main category sold one by one can still hold a sub-category that is a bundle. */
    public function test_a_bundle_under_a_single_selling_parent_is_flagged(): void
    {
        $parent = $this->category(['name' => 'Migration', 'selling_mode' => SellingMode::Single->value]);
        $child = $this->category(['name' => 'UAE', 'parent_id' => $parent->id, 'selling_mode' => SellingMode::Bundle->value]);
        $this->course($child);

        $this->getJson($this->url($parent))
            ->assertOk()
            ->assertJsonPath('data.bundle', null)
            ->assertJsonPath('data.children.0.own_bundle', true);
    }

    public function test_drafts_and_deleted_courses_are_not_listed(): void
    {
        $bundle = $this->category();
        $this->course($bundle, ['name' => 'Live']);
        $this->course($bundle, ['name' => 'Secret draft', 'status' => CourseStatus::Draft->value]);
        $this->course($bundle, ['name' => 'Gone'])->delete();

        $response = $this->getJson($this->url($bundle))->assertOk()->assertJsonCount(1, 'data.courses');

        $this->assertStringNotContainsString('Secret draft', $response->getContent());
    }

    /** Hidden, under a hidden parent, or never existed: one identical 404. */
    public function test_every_category_a_visitor_may_not_see_is_the_same_404(): void
    {
        $hidden = $this->category(['is_active' => false]);
        $offParent = $this->category(['name' => 'Off', 'is_active' => false]);
        $child = $this->category(['name' => 'Child', 'parent_id' => $offParent->id]);

        foreach ([$hidden->id, $child->id, 999_999] as $id) {
            $this->getJson($this->url($id))->assertNotFound()->assertJsonPath('message', 'Category not found.');
        }
    }

    /** Public data only — even when the caller is a signed-in student. */
    public function test_it_never_carries_student_state(): void
    {
        $bundle = $this->category();
        $this->course($bundle);
        Sanctum::actingAs(Student::factory()->create(), ['student'], 'student');

        $response = $this->getJson($this->url($bundle))->assertOk();

        foreach (['is_enrolled', 'progress', 'owned_count', 'remaining_price_cents', 'is_wishlisted'] as $key) {
            $this->assertStringNotContainsString("\"{$key}\"", $response->getContent());
        }
    }

    public function test_the_server_picks_the_language_column(): void
    {
        $bundle = $this->category(['name_si' => 'UAE වැඩසටහන්']);
        $this->course($bundle);

        $this->withHeader('Accept-Language', 'si')
            ->getJson($this->url($bundle))
            ->assertOk()
            ->assertJsonPath('data.name', 'UAE වැඩසටහන්')
            ->assertJsonPath('data.bundle.name', 'UAE වැඩසටහන්');
    }
}
