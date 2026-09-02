<?php

declare(strict_types=1);

namespace Tests\Feature\Student;

use App\Enums\CourseStatus;
use App\Enums\HomeBannerLink;
use App\Models\CourseProgramme;
use App\Models\HomeBanner;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentHomeBannerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        Sanctum::actingAs(Student::factory()->create(['is_blocked' => false]), ['student'], 'student');
    }

    /**
     * Gives the banner a real image, which is what makes it publishable.
     *
     * Written to its own temp path rather than `UploadedFile::fake()->getRealPath()`
     * — that file is cleaned up as soon as the UploadedFile goes out of scope,
     * and Media Library reads it lazily.
     */
    private function withImage(HomeBanner $banner): HomeBanner
    {
        $path = tempnam(sys_get_temp_dir(), 'planb_test_banner_').'.jpg';
        file_put_contents($path, (string) UploadedFile::fake()->image('promo.jpg', 1200, 600)->get());

        $banner->addMedia($path)
            ->usingFileName('home-banner.jpg')
            ->toMediaCollection(HomeBanner::IMAGE_COLLECTION);

        return $banner->fresh() ?? $banner;
    }

    public function test_no_banner_set_up_is_null_not_a_404(): void
    {
        $this->getJson('/api/v1/student/home-banner')
            ->assertOk()
            ->assertJsonPath('data', null);
    }

    public function test_an_inactive_banner_is_not_served(): void
    {
        $this->withImage(HomeBanner::create(['title' => 'Hidden', 'is_active' => false]));

        $this->getJson('/api/v1/student/home-banner')
            ->assertOk()
            ->assertJsonPath('data', null);
    }

    /** Switched on but never given an image would render an empty box in the app. */
    public function test_an_active_banner_with_no_image_is_not_served(): void
    {
        HomeBanner::create(['title' => 'No art', 'is_active' => true]);

        $this->getJson('/api/v1/student/home-banner')
            ->assertOk()
            ->assertJsonPath('data', null);
    }

    public function test_an_active_banner_comes_back_with_a_resolved_link(): void
    {
        $course = CourseProgramme::factory()->create(['status' => CourseStatus::Published]);

        $this->withImage(HomeBanner::create([
            'title' => 'New intake open',
            'subtitle' => 'Apply before 30 September',
            'link_type' => HomeBannerLink::Course->value,
            'link_course_programme_id' => $course->id,
            'is_active' => true,
        ]));

        $response = $this->getJson('/api/v1/student/home-banner')->assertOk();

        $response->assertJsonPath('data.title', 'New intake open')
            ->assertJsonPath('data.subtitle', 'Apply before 30 September')
            ->assertJsonPath('data.link.type', 'course')
            ->assertJsonPath('data.link.course_id', $course->id);

        $this->assertNotNull($response->json('data.image_url'));
    }

    /**
     * The link columns themselves never reach the app — it switches on one
     * resolved `link.type` rather than re-implementing "which column applies".
     */
    public function test_the_admin_only_columns_are_absent_from_the_student_payload(): void
    {
        $this->withImage(HomeBanner::create([
            'link_type' => HomeBannerLink::Url->value,
            'link_url' => 'https://planbinternational.lk/intake',
            'is_active' => true,
        ]));

        $response = $this->getJson('/api/v1/student/home-banner')->assertOk();

        $response->assertJsonPath('data.link', [
            'type' => 'url',
            'url' => 'https://planbinternational.lk/intake',
        ]);

        $response->assertJsonMissingPath('data.is_active')
            ->assertJsonMissingPath('data.link_course_programme_id')
            ->assertJsonMissingPath('data.link_url');
    }

    /** A course deleted after the banner was set up must not send anyone to a 404. */
    public function test_a_course_link_whose_course_is_gone_degrades_to_signage(): void
    {
        $course = CourseProgramme::factory()->create(['status' => CourseStatus::Published]);

        $banner = $this->withImage(HomeBanner::create([
            'link_type' => HomeBannerLink::Course->value,
            'link_course_programme_id' => $course->id,
            'is_active' => true,
        ]));

        // `nullOnDelete` on the foreign key does the work; force-delete so the
        // constraint fires rather than the soft delete hiding the row.
        $course->forceDelete();

        $this->assertNull($banner->fresh()?->link_course_programme_id);

        $this->getJson('/api/v1/student/home-banner')
            ->assertOk()
            ->assertJsonPath('data.link.type', 'none');
    }
}
