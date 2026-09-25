<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\CourseStatus;
use App\Enums\SellingMode;
use App\Models\CourseCategory;
use App\Models\CourseProgramme;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * `GET api/v1/public/course-categories` — the catalogue page's filter.
 *
 * The rule that matters: a category appears only when a visitor would find a
 * course in it, and its count agrees with what the course list returns.
 */
class PublicCourseCategoriesTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/v1/public/course-categories';

    private function category(array $attributes = []): CourseCategory
    {
        return CourseCategory::query()->create(array_merge([
            'name' => 'Migration',
            'is_active' => true,
            'selling_mode' => SellingMode::Single->value,
            'sort_order' => 0,
        ], $attributes));
    }

    private function course(CourseCategory $category, array $attributes = []): CourseProgramme
    {
        return CourseProgramme::query()->create(array_merge([
            'course_category_id' => $category->id,
            'name' => 'A course',
            'price_cents' => 0,
            'currency' => 'LKR',
            'status' => CourseStatus::Published->value,
            'sort_order' => 0,
        ], $attributes));
    }

    public function test_it_lists_parents_with_their_sub_categories_and_counts(): void
    {
        $migration = $this->category(['name' => 'Migration', 'sort_order' => 1]);
        $visas = $this->category(['name' => 'Visas', 'parent_id' => $migration->id]);
        $language = $this->category(['name' => 'Language', 'sort_order' => 2]);

        $this->course($migration);
        $this->course($visas);
        $this->course($visas);
        $this->course($language);

        $this->getJson(self::URL)
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.name', 'Migration')
            // Its own course plus its sub-category's two.
            ->assertJsonPath('data.0.courses_count', 3)
            ->assertJsonPath('data.0.children.0.name', 'Visas')
            ->assertJsonPath('data.0.children.0.courses_count', 2)
            ->assertJsonPath('data.1.name', 'Language')
            ->assertJsonPath('data.1.courses_count', 1);
    }

    /** A chip that always answers "no courses" reads as a broken page. */
    public function test_categories_without_a_visible_course_are_left_out(): void
    {
        $empty = $this->category(['name' => 'Empty']);
        $draftOnly = $this->category(['name' => 'Drafts only']);
        $this->course($draftOnly, ['status' => CourseStatus::Draft->value]);
        $deletedOnly = $this->category(['name' => 'Deleted only']);
        $this->course($deletedOnly)->delete();
        $this->category(['name' => 'Empty child', 'parent_id' => $empty->id]);

        $this->getJson(self::URL)->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_switched_off_categories_are_never_listed(): void
    {
        $hidden = $this->category(['name' => 'Hidden', 'is_active' => false]);
        $this->course($hidden);

        $parent = $this->category(['name' => 'Parent']);
        $this->course($parent);
        $hiddenChild = $this->category(['name' => 'Hidden child', 'parent_id' => $parent->id, 'is_active' => false]);
        $this->course($hiddenChild);

        $response = $this->getJson(self::URL)
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.courses_count', 1)
            ->assertJsonCount(0, 'data.0.children');

        $this->assertStringNotContainsString('Hidden', $response->getContent());
    }

    /** Only what a filter needs — no selling mode, no bundle price. */
    public function test_it_sends_filter_fields_only(): void
    {
        $this->course($this->category(['selling_mode' => SellingMode::Bundle->value]), ['price_cents' => 5_000_00]);

        $item = $this->getJson(self::URL)->assertOk()->json('data.0');

        $this->assertSame(['id', 'name', 'icon', 'courses_count', 'children'], array_keys($item));
    }

    public function test_the_server_picks_the_language_column(): void
    {
        $this->course($this->category(['name' => 'Migration', 'name_si' => 'සංක්‍රමණය']));

        $this->withHeader('Accept-Language', 'si')
            ->getJson(self::URL)
            ->assertOk()
            ->assertJsonPath('data.0.name', 'සංක්‍රමණය');
    }
}
