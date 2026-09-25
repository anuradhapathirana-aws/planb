<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\CourseStatus;
use App\Enums\SellingMode;
use App\Models\CourseCategory;
use App\Models\CoursePaper;
use App\Models\CourseProgramme;
use App\Models\CourseQuestion;
use App\Models\CourseTopic;
use App\Models\CourseVideo;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * `GET api/v1/public/courses/{id}` — a course's public page.
 *
 * As with the list, the assertions that matter are about what does NOT come
 * back: hidden courses, anything that locates a video, the answer key, and any
 * student's state.
 */
class PublicCourseDetailTest extends TestCase
{
    use RefreshDatabase;

    private function category(array $attributes = []): CourseCategory
    {
        return CourseCategory::query()->create(array_merge([
            'name' => 'Migration',
            'is_active' => true,
            'selling_mode' => SellingMode::Single->value,
            'sort_order' => 0,
        ], $attributes));
    }

    private function course(?CourseCategory $category = null, array $attributes = []): CourseProgramme
    {
        return CourseProgramme::query()->create(array_merge([
            'course_category_id' => ($category ?? $this->category())->id,
            'name' => 'UAE Migration Essentials',
            'description' => "Everything before you fly.\nAnd after you land.",
            'price_cents' => 1_500_00,
            'currency' => 'LKR',
            'status' => CourseStatus::Published->value,
            'sort_order' => 0,
        ], $attributes));
    }

    private function url(CourseProgramme|int $course): string
    {
        return '/api/v1/public/courses/'.($course instanceof CourseProgramme ? $course->id : $course);
    }

    public function test_it_returns_the_course_and_its_syllabus_without_a_session(): void
    {
        $course = $this->course();
        $first = CourseTopic::factory()->for($course, 'programme')->create(['title' => 'Before you fly', 'sort_order' => 1]);
        $second = CourseTopic::factory()->for($course, 'programme')->create(['title' => 'After you land', 'sort_order' => 2]);
        CourseVideo::factory()->for($first, 'topic')->create(['title' => 'Visas', 'duration_seconds' => 300, 'sort_order' => 1]);
        CourseVideo::factory()->for($first, 'topic')->create(['title' => 'Flights', 'duration_seconds' => 120, 'sort_order' => 2]);
        CourseVideo::factory()->for($second, 'topic')->create(['title' => 'Emirates ID', 'duration_seconds' => null]);

        $this->getJson($this->url($course))
            ->assertOk()
            ->assertJsonPath('data.name', 'UAE Migration Essentials')
            ->assertJsonPath('data.description', "Everything before you fly.\nAnd after you land.")
            ->assertJsonPath('data.lessons_count', 3)
            ->assertJsonPath('data.topics.0.title', 'Before you fly')
            ->assertJsonPath('data.topics.0.lessons_count', 2)
            ->assertJsonPath('data.topics.0.duration_seconds', 420)
            ->assertJsonPath('data.topics.0.lessons.1.title', 'Flights')
            ->assertJsonPath('data.topics.1.lessons.0.duration_seconds', null)
            ->assertJsonMissingPath('data.topic_names');
    }

    /** Draft, deleted, hidden category, never existed: one indistinguishable 404. */
    public function test_every_course_a_visitor_may_not_see_is_a_plain_404(): void
    {
        $draft = $this->course(null, ['status' => CourseStatus::Draft->value]);
        $deleted = $this->course();
        $deleted->delete();

        $unknown = $this->getJson($this->url(999_999))->assertNotFound();

        // `message` is what production sends; the test env's debug trace differs per call.
        foreach ([$draft, $deleted] as $course) {
            $this->assertSame(
                $unknown->json('message'),
                $this->getJson($this->url($course))->assertNotFound()->json('message'),
            );
        }

        // One fixed message that names no internal class and echoes no id.
        $this->assertSame('Course not found.', $unknown->json('message'));
    }

    /**
     * The trap this route is shaped around: `Route::bind('course', …)` in the
     * student routes is global and checks "published" only. A published course
     * in a switched-off category must still 404 here — if this fails, the
     * public route has been bound through the student binder.
     */
    public function test_a_published_course_in_a_switched_off_category_is_not_found(): void
    {
        $hidden = $this->course($this->category(['is_active' => false]));

        $parent = $this->category(['name' => 'Off parent', 'is_active' => false]);
        $underHiddenParent = $this->course($this->category(['name' => 'Child', 'parent_id' => $parent->id]));

        $this->getJson($this->url($hidden))->assertNotFound();
        $this->getJson($this->url($underHiddenParent))->assertNotFound();
    }

    /** Titles and durations only — nothing that locates a video or can be streamed. */
    public function test_the_syllabus_never_locates_a_video(): void
    {
        $course = $this->course();
        $topic = CourseTopic::factory()->for($course, 'programme')->create();
        CourseVideo::factory()->for($topic, 'topic')->create([
            'external_url' => 'https://secret.example/video.mp4',
            'external_id' => 'bunny-guid-123',
        ]);

        $response = $this->getJson($this->url($course))->assertOk();

        $this->assertSame(['title', 'duration_seconds'], array_keys($response->json('data.topics.0.lessons.0')));
        $this->assertStringNotContainsString('secret.example', $response->getContent());
        $this->assertStringNotContainsString('bunny-guid-123', $response->getContent());
    }

    /** Whether there is a paper and how long it is — never a question or an answer. */
    public function test_the_assessment_is_a_count_and_never_the_questions(): void
    {
        $course = $this->course();
        $paper = CoursePaper::factory()->for($course, 'programme')->create();
        CourseQuestion::factory()->for($paper, 'paper')->count(3)->create(['text' => 'Secret question text']);

        $response = $this->getJson($this->url($course))
            ->assertOk()
            ->assertJsonPath('data.assessment.questions_count', 3);

        $this->assertStringNotContainsString('Secret question text', $response->getContent());
        $this->assertStringNotContainsString('is_correct', $response->getContent());
    }

    public function test_a_paper_without_questions_is_not_advertised(): void
    {
        $course = $this->course();
        CoursePaper::factory()->for($course, 'programme')->create();

        $this->getJson($this->url($course))->assertOk()->assertJsonPath('data.assessment', null);
    }

    public function test_a_bundle_only_course_names_its_bundle_and_list_price(): void
    {
        $bundle = $this->category(['name' => 'UAE Pack', 'selling_mode' => SellingMode::Bundle->value]);
        $course = $this->course($bundle, ['price_cents' => 1_000_00]);
        $this->course($bundle, ['name' => 'Second', 'price_cents' => 2_000_00]);

        $this->getJson($this->url($course))
            ->assertOk()
            ->assertJsonPath('data.sold_individually', false)
            ->assertJsonPath('data.bundle.category_id', $bundle->id)
            ->assertJsonPath('data.bundle.name', 'UAE Pack')
            ->assertJsonPath('data.bundle.price_cents', 3_000_00);

        $this->getJson($this->url($this->course()))->assertOk()->assertJsonPath('data.bundle', null);
    }

    /** A signed-in student gets the same public page — never their own state. */
    public function test_it_never_carries_student_state_even_for_a_student(): void
    {
        $course = $this->course();
        Sanctum::actingAs(Student::factory()->create(), ['student'], 'student');

        $data = $this->getJson($this->url($course))->assertOk()->json('data');

        foreach (['is_enrolled', 'is_wishlisted', 'progress', 'position', 'paper'] as $key) {
            $this->assertArrayNotHasKey($key, $data);
        }
    }

    public function test_the_server_picks_the_language_column(): void
    {
        $course = $this->course(null, ['name_si' => 'UAE සංක්‍රමණ මූලිකාංග']);
        $topic = CourseTopic::factory()->for($course, 'programme')->create(['title' => 'Visas', 'title_si' => 'වීසා']);
        CourseVideo::factory()->for($topic, 'topic')->create(['title' => 'Lesson', 'title_si' => 'පාඩම']);

        $this->withHeader('Accept-Language', 'si')
            ->getJson($this->url($course))
            ->assertOk()
            ->assertJsonPath('data.name', 'UAE සංක්‍රමණ මූලිකාංග')
            ->assertJsonPath('data.topics.0.title', 'වීසා')
            ->assertJsonPath('data.topics.0.lessons.0.title', 'පාඩම');
    }

    public function test_a_non_numeric_id_never_reaches_the_controller(): void
    {
        $this->getJson('/api/v1/public/courses/abc')->assertNotFound();
    }
}
