<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\CourseStatus;
use App\Enums\SellingMode;
use App\Models\CourseCategory;
use App\Models\CourseProgramme;
use App\Models\CourseTopic;
use App\Models\Student;
use App\Services\Course\PublicCourseService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * `GET api/v1/public/courses` — the anonymous course catalogue.
 *
 * Most of what is asserted here is what does **not** come back. This endpoint is
 * reachable by anything on the internet and reads the same table the student
 * catalogue does, so the tests that matter are the ones proving a stranger gets
 * neither unpublished content nor another student's state.
 */
class PublicCourseCatalogueTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/v1/public/courses';

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
            'name' => 'UAE Migration Essentials',
            'description' => '<p>The whole journey end to end.</p>',
            'price_cents' => 0,
            'currency' => 'LKR',
            'status' => CourseStatus::Published->value,
            'sort_order' => 0,
        ], $attributes));
    }

    public function test_it_answers_without_a_session(): void
    {
        $this->course($this->category());

        $this->getJson(self::URL)
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'UAE Migration Essentials');
    }

    public function test_an_empty_catalogue_is_a_valid_answer(): void
    {
        $this->getJson(self::URL)
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_a_draft_course_is_never_published(): void
    {
        $category = $this->category();
        $this->course($category, ['name' => 'Live one']);
        $this->course($category, ['name' => 'Secret draft', 'status' => CourseStatus::Draft->value]);

        $response = $this->getJson(self::URL)->assertOk()->assertJsonCount(1, 'data');

        $this->assertStringNotContainsString('Secret draft', $response->getContent());
    }

    public function test_a_soft_deleted_course_is_never_published(): void
    {
        $category = $this->category();
        $this->course($category, ['name' => 'Live one']);
        $this->course($category, ['name' => 'Deleted one'])->delete();

        $this->getJson(self::URL)
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Live one');
    }

    /**
     * A signed-in student keeps access to a course whose category was switched
     * off, because they paid for it. A visitor has no such claim, so the rule is
     * absolute here — that difference is the reason this endpoint has its own
     * Service rather than a nullable-student branch in the student one.
     */
    public function test_a_course_in_a_switched_off_category_is_not_published(): void
    {
        $this->course($this->category(['is_active' => false]));

        $this->getJson(self::URL)->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_a_course_under_a_switched_off_parent_is_not_published(): void
    {
        $parent = $this->category(['name' => 'Parent', 'is_active' => false]);
        $child = $this->category([
            'name' => 'Child',
            'parent_id' => $parent->id,
            'selling_mode' => SellingMode::Inherit->value,
        ]);

        $this->course($child);

        $this->getJson(self::URL)->assertOk()->assertJsonCount(0, 'data');
    }

    /**
     * The student Resource carries enrolment, wishlist and progress. Reusing it
     * here would hand a stranger one student's private state, so the public one
     * has no such fields — this test is what stops that regressing.
     */
    public function test_it_never_publishes_student_state(): void
    {
        $this->course($this->category());
        Student::factory()->create();

        $row = $this->getJson(self::URL)->assertOk()->json('data.0');

        foreach (
            ['is_enrolled', 'is_wishlisted', 'progress', 'bundle', 'position', 'matched_topic'] as $key
        ) {
            $this->assertArrayNotHasKey($key, $row);
        }
    }

    /**
     * The description is admin-authored rich text. The card gets flattened text
     * so the public page never has to render HTML to draw two clamped lines.
     */
    public function test_the_excerpt_is_plain_text_not_the_stored_html(): void
    {
        $this->course($this->category(), [
            'description' => '<p>Visas, <strong>documents</strong> and medicals.</p><p>And arrival.</p>',
        ]);

        $this->getJson(self::URL)
            ->assertOk()
            ->assertJsonPath('data.0.excerpt', 'Visas, documents and medicals. And arrival.');
    }

    public function test_the_excerpt_is_null_when_there_is_no_description(): void
    {
        $this->course($this->category(), ['description' => null]);

        $this->getJson(self::URL)->assertOk()->assertJsonPath('data.0.excerpt', null);
    }

    /** The card's three bullets are real topic titles, and only three of them. */
    public function test_at_most_three_topic_names_are_sent(): void
    {
        $course = $this->course($this->category());

        foreach (['Visa categories', 'Document checklist', 'Arrival process', 'Fourth topic'] as $i => $title) {
            CourseTopic::query()->create([
                'course_programme_id' => $course->id,
                'title' => $title,
                'sort_order' => $i,
            ]);
        }

        $this->getJson(self::URL)
            ->assertOk()
            ->assertJsonCount(3, 'data.0.topic_names')
            ->assertJsonPath('data.0.topic_names.0', 'Visa categories')
            ->assertJsonPath('data.0.topic_names.2', 'Arrival process')
            // The count is the real total, not the three that were sent.
            ->assertJsonPath('data.0.topics_count', 4);
    }

    public function test_courses_come_back_in_the_admins_order_not_newest_first(): void
    {
        $category = $this->category();

        // Created out of order on purpose: a newest-first sort would put step
        // three before step one, which is wrong for a sequence of courses.
        $this->course($category, ['name' => 'Course 3', 'sort_order' => 3]);
        $this->course($category, ['name' => 'Course 1', 'sort_order' => 1]);
        $this->course($category, ['name' => 'Course 2', 'sort_order' => 2]);

        $this->getJson(self::URL)
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Course 1')
            ->assertJsonPath('data.1.name', 'Course 2')
            ->assertJsonPath('data.2.name', 'Course 3');
    }

    public function test_the_server_picks_the_language_column(): void
    {
        $category = $this->category(['name' => 'Migration', 'name_si' => 'සංක්‍රමණ']);
        $this->course($category, [
            'name' => 'English name',
            'name_si' => 'සිංහල නම',
        ]);

        $this->withHeaders(['Accept-Language' => 'si'])
            ->getJson(self::URL)
            ->assertOk()
            ->assertJsonPath('data.0.name', 'සිංහල නම')
            ->assertJsonPath('data.0.category_name', 'සංක්‍රමණ');
    }

    public function test_a_blank_sinhala_column_falls_back_to_english(): void
    {
        $this->course($this->category(), ['name' => 'English name', 'name_si' => null]);

        $this->withHeaders(['Accept-Language' => 'si'])
            ->getJson(self::URL)
            ->assertOk()
            ->assertJsonPath('data.0.name', 'English name');
    }

    public function test_search_matches_a_course_name_or_a_topic_title(): void
    {
        $category = $this->category();
        $visas = $this->course($category, ['name' => 'Migration Essentials']);
        $this->course($category, ['name' => 'Workplace English']);

        CourseTopic::query()->create([
            'course_programme_id' => $visas->id,
            'title' => 'Visa categories',
            'sort_order' => 0,
        ]);

        // By name.
        $this->getJson(self::URL.'?search=Workplace')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Workplace English');

        // By a topic title — nobody searches "Course Module 3", they search "visa".
        $this->getJson(self::URL.'?search=visa')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Migration Essentials');
    }

    /** A visitor typing "100%" must not match the whole catalogue. */
    public function test_like_wildcards_in_a_search_term_are_escaped(): void
    {
        $this->course($this->category(), ['name' => 'Migration Essentials']);

        $this->getJson(self::URL.'?search=%')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_filtering_by_a_parent_category_includes_its_sub_categories(): void
    {
        $parent = $this->category(['name' => 'Migration']);
        $child = $this->category([
            'name' => 'Visas',
            'parent_id' => $parent->id,
            'selling_mode' => SellingMode::Inherit->value,
        ]);

        $this->course($child, ['name' => 'On the sub-category']);
        $this->course($this->category(['name' => 'Language']), ['name' => 'Elsewhere']);

        $this->getJson(self::URL.'?category_id='.$parent->id)
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'On the sub-category');
    }

    /**
     * Not `exists:` on the id — a 422 would let a stranger enumerate which
     * category ids exist. An unknown id matches nothing, same as an empty one.
     */
    public function test_an_unknown_category_id_returns_nothing_rather_than_an_error(): void
    {
        $this->course($this->category());

        $this->getJson(self::URL.'?category_id=999999')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_an_oversized_page_is_refused(): void
    {
        $this->getJson(self::URL.'?per_page='.(PublicCourseService::MAX_PER_PAGE + 1))
            ->assertStatus(422)
            ->assertJsonValidationErrors('per_page');
    }

    public function test_the_response_is_paginated(): void
    {
        $category = $this->category();

        foreach (range(1, 5) as $i) {
            $this->course($category, ['name' => "Course {$i}", 'sort_order' => $i]);
        }

        $this->getJson(self::URL.'?per_page=2')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 5)
            ->assertJsonPath('meta.per_page', 2);
    }
}
