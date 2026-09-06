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

    public function test_no_slides_set_up_is_an_empty_list_not_a_404(): void
    {
        $this->getJson('/api/v1/student/home-banners')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_an_inactive_slide_is_not_served(): void
    {
        $this->withImage(HomeBanner::create(['title' => 'Hidden', 'is_active' => false]));

        $this->getJson('/api/v1/student/home-banners')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    /**
     * Wording without artwork is a usable slide: the app draws it as a branded
     * card. This is what lets an admin write the copy now and upload the image
     * later, instead of the slide staying invisible until both halves exist.
     */
    public function test_an_active_slide_with_no_image_is_served_without_one(): void
    {
        HomeBanner::create(['title' => 'No art', 'is_active' => true]);

        $this->getJson('/api/v1/student/home-banners')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'No art')
            ->assertJsonPath('data.0.image_url', null);
    }

    /** Neither artwork nor wording is genuinely empty — that one still goes. */
    public function test_an_active_slide_with_neither_image_nor_title_is_dropped(): void
    {
        HomeBanner::create(['subtitle' => 'Orphaned subtitle', 'is_active' => true]);

        $this->getJson('/api/v1/student/home-banners')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_an_active_slide_comes_back_with_a_resolved_link(): void
    {
        $course = CourseProgramme::factory()->create(['status' => CourseStatus::Published]);

        $this->withImage(HomeBanner::create([
            'title' => 'New intake open',
            'subtitle' => 'Apply before 30 September',
            'link_type' => HomeBannerLink::Course->value,
            'link_course_programme_id' => $course->id,
            'is_active' => true,
        ]));

        $response = $this->getJson('/api/v1/student/home-banners')->assertOk();

        $response->assertJsonPath('data.0.title', 'New intake open')
            ->assertJsonPath('data.0.subtitle', 'Apply before 30 September')
            ->assertJsonPath('data.0.link.type', 'course')
            ->assertJsonPath('data.0.link.course_id', $course->id);

        $this->assertNotNull($response->json('data.0.image_url'));
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

        $response = $this->getJson('/api/v1/student/home-banners')->assertOk();

        $response->assertJsonPath('data.0.link', [
            'type' => 'url',
            'url' => 'https://planbinternational.lk/intake',
        ]);

        $response->assertJsonMissingPath('data.0.is_active')
            ->assertJsonMissingPath('data.0.link_course_programme_id')
            ->assertJsonMissingPath('data.0.link_url');
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

        $this->getJson('/api/v1/student/home-banners')
            ->assertOk()
            ->assertJsonPath('data.0.link.type', 'none');
    }

    /**
     * The carousel's whole point: several slides, in the order the admin set.
     *
     * Seeded out of order so a pass cannot come from insertion order alone.
     */
    public function test_slides_come_back_in_the_admins_order(): void
    {
        $this->withImage(HomeBanner::create([
            'title' => 'Services',
            'link_type' => HomeBannerLink::Services->value,
            'is_active' => true,
            'sort_order' => 1,
        ]));

        $this->withImage(HomeBanner::create([
            'title' => 'Courses',
            'link_type' => HomeBannerLink::Courses->value,
            'is_active' => true,
            'sort_order' => 0,
        ]));

        $this->getJson('/api/v1/student/home-banners')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.title', 'Courses')
            ->assertJsonPath('data.0.link.type', 'courses')
            ->assertJsonPath('data.1.title', 'Services')
            ->assertJsonPath('data.1.link.type', 'services');
    }

    /** One switched-off slide must not leave a gap between the others. */
    public function test_an_inactive_slide_is_dropped_from_the_middle(): void
    {
        foreach ([['A', 0, true], ['B', 1, false], ['C', 2, true]] as [$title, $order, $active]) {
            $this->withImage(HomeBanner::create([
                'title' => $title,
                'is_active' => $active,
                'sort_order' => $order,
            ]));
        }

        $this->getJson('/api/v1/student/home-banners')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.title', 'A')
            ->assertJsonPath('data.1.title', 'C');
    }
}
