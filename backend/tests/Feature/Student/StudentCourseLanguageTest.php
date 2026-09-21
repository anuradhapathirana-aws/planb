<?php

declare(strict_types=1);

namespace Tests\Feature\Student;

use App\Enums\CourseStatus;
use App\Models\CourseProgramme;
use App\Models\CourseTopic;
use App\Models\CourseVideo;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Course, topic and lesson titles follow the student app's language.
 *
 * The app sends `Accept-Language` and the server picks the column — the payload
 * carries one title, never both, so no screen has to choose and no untranslated
 * string can leak through a screen someone forgot to update.
 */
class StudentCourseLanguageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        Sanctum::actingAs(Student::factory()->create(['is_blocked' => false]), ['student'], 'student');
    }

    /**
     * A published course whose every level has both titles.
     */
    private function bilingualCourse(): CourseProgramme
    {
        $programme = CourseProgramme::factory()->create([
            'name' => 'UAE Visa Essentials',
            'name_si' => 'වීසා අත්‍යවශ්‍ය කරුණු',
            'status' => CourseStatus::Published,
            'published_at' => now()->subDay(),
        ]);

        $topic = CourseTopic::factory()->for($programme, 'programme')->create([
            'title' => 'Visa renewal',
            'title_si' => 'වීසා අලුත් කිරීම',
            'sort_order' => 0,
        ]);

        CourseVideo::factory()->for($topic, 'topic')->create([
            'title' => 'How renewal works',
            'title_si' => 'අලුත් කිරීම සිදුවන ආකාරය',
            'duration_seconds' => 600,
            'sort_order' => 0,
        ]);

        return $programme;
    }

    public function test_english_is_the_default(): void
    {
        $programme = $this->bilingualCourse();

        $this->getJson("/api/v1/student/courses/{$programme->id}")
            ->assertOk()
            ->assertJsonPath('data.name', 'UAE Visa Essentials')
            ->assertJsonPath('data.topics.0.title', 'Visa renewal')
            ->assertJsonPath('data.topics.0.videos.0.title', 'How renewal works');
    }

    public function test_sinhala_titles_are_served_at_every_level(): void
    {
        $programme = $this->bilingualCourse();

        $this->withHeader('Accept-Language', 'si')
            ->getJson("/api/v1/student/courses/{$programme->id}")
            ->assertOk()
            ->assertJsonPath('data.name', 'වීසා අත්‍යවශ්‍ය කරුණු')
            ->assertJsonPath('data.topics.0.title', 'වීසා අලුත් කිරීම')
            ->assertJsonPath('data.topics.0.videos.0.title', 'අලුත් කිරීම සිදුවන ආකාරය');
    }

    /** A phone sending its full locale, which is what Expo reports. */
    public function test_a_region_subtag_still_resolves_to_sinhala(): void
    {
        $programme = $this->bilingualCourse();

        $this->withHeader('Accept-Language', 'si-LK,si;q=0.9,en;q=0.8')
            ->getJson("/api/v1/student/courses/{$programme->id}")
            ->assertOk()
            ->assertJsonPath('data.name', 'වීසා අත්‍යවශ්‍ය කරුණු');
    }

    /**
     * The whole reason Sinhala columns are nullable: the catalogue is translated
     * course by course, and an untranslated row has to stay readable meanwhile.
     */
    public function test_an_untranslated_row_falls_back_to_english(): void
    {
        $programme = CourseProgramme::factory()->create([
            'name' => 'Workplace Safety',
            'name_si' => null,
            'status' => CourseStatus::Published,
            'published_at' => now()->subDay(),
        ]);

        $topic = CourseTopic::factory()->for($programme, 'programme')->create([
            'title' => 'Site rules',
            'title_si' => '',
            'sort_order' => 0,
        ]);

        CourseVideo::factory()->for($topic, 'topic')->create([
            'title' => 'Protective equipment',
            'title_si' => null,
            'sort_order' => 0,
        ]);

        $this->withHeader('Accept-Language', 'si')
            ->getJson("/api/v1/student/courses/{$programme->id}")
            ->assertOk()
            ->assertJsonPath('data.name', 'Workplace Safety')
            // Blank, not just null: an admin who clears the field leaves an empty
            // string behind, and that must read as "not translated" too.
            ->assertJsonPath('data.topics.0.title', 'Site rules')
            ->assertJsonPath('data.topics.0.videos.0.title', 'Protective equipment');
    }

    /** One title per row. Shipping both would put untranslated text in the client. */
    public function test_the_student_payload_never_carries_the_other_language(): void
    {
        $programme = $this->bilingualCourse();

        $response = $this->withHeader('Accept-Language', 'si')
            ->getJson("/api/v1/student/courses/{$programme->id}")
            ->assertOk();

        $response->assertJsonMissingPath('data.name_si');
        $response->assertJsonMissingPath('data.topics.0.title_si');
        $response->assertJsonMissingPath('data.topics.0.videos.0.title_si');

        $this->assertStringNotContainsString('UAE Visa Essentials', $response->getContent());
    }

    /** The list rows are what Home, Courses and the wishlist all draw. */
    public function test_the_course_list_is_translated_too(): void
    {
        $this->bilingualCourse();

        $this->withHeader('Accept-Language', 'si')
            ->getJson('/api/v1/student/courses')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'වීසා අත්‍යවශ්‍ය කරුණු');
    }

    /**
     * Sinhala keyboards are awkward and most phones here are set to English, so
     * a student reading in Sinhala routinely types the English word. The result
     * has to come back — and come back labelled in the language they are reading.
     */
    public function test_an_english_search_finds_a_course_the_student_is_reading_in_sinhala(): void
    {
        $this->bilingualCourse();

        $this->withHeader('Accept-Language', 'si')
            ->getJson('/api/v1/student/courses?search=visa')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'වීසා අත්‍යවශ්‍ය කරුණු');
    }

    public function test_a_sinhala_search_matches_the_sinhala_column(): void
    {
        $this->bilingualCourse();

        $this->withHeader('Accept-Language', 'si')
            ->getJson('/api/v1/student/courses?search='.urlencode('වීසා'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'වීසා අත්‍යවශ්‍ය කරුණු');
    }

    /**
     * The hint explaining why a course came back is a title like any other. Here
     * the ENGLISH course name matched the search, but the student is reading the
     * Sinhala one — so the row no longer explains itself and needs the topic.
     */
    public function test_the_matched_topic_hint_follows_the_students_language(): void
    {
        $programme = CourseProgramme::factory()->create([
            'name' => 'Labour Law Basics',
            'name_si' => 'කම්කරු නීතිය',
            'status' => CourseStatus::Published,
            'published_at' => now()->subDay(),
        ]);

        CourseTopic::factory()->for($programme, 'programme')->create([
            'title' => 'Visa renewal',
            'title_si' => 'වීසා අලුත් කිරීම',
            'sort_order' => 0,
        ]);

        $this->withHeader('Accept-Language', 'si')
            ->getJson('/api/v1/student/courses?search=visa')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'කම්කරු නීතිය')
            ->assertJsonPath('data.0.matched_topic', 'වීසා අලුත් කිරීම');
    }

    /** An unknown or absent language is English, never an error. */
    public function test_an_unsupported_language_falls_back_to_english(): void
    {
        $programme = $this->bilingualCourse();

        $this->withHeader('Accept-Language', 'fr-FR,fr;q=0.9')
            ->getJson("/api/v1/student/courses/{$programme->id}")
            ->assertOk()
            ->assertJsonPath('data.name', 'UAE Visa Essentials');
    }

    /**
     * Nothing caches these responses today, but a CDN or proxy added in front of
     * the API would otherwise serve one student's language to another.
     */
    public function test_student_responses_vary_on_the_language_header(): void
    {
        $programme = $this->bilingualCourse();

        $response = $this->withHeader('Accept-Language', 'si')
            ->getJson("/api/v1/student/courses/{$programme->id}")
            ->assertOk();

        $this->assertStringContainsString('Accept-Language', (string) $response->headers->get('Vary'));
    }
}
