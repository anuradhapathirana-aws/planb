<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\CourseStatus;
use App\Enums\HomeBannerLink;
use App\Enums\RoleName;
use App\Models\CourseProgramme;
use App\Models\HomeBanner;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class HomeBannerManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (RoleName::values() as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }
    }

    private function actingAsRole(RoleName $role): User
    {
        $user = User::factory()->create();
        $user->assignRole($role->value);

        $this->actingAs($user);

        return $user;
    }

    /** @return array<string, mixed> */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'title' => 'Your UAE journey starts here',
            'subtitle' => 'New intake open',
            'link_type' => HomeBannerLink::Courses->value,
            'is_active' => true,
        ], $overrides);
    }

    /** Reading it before anything is saved must not 404 — the admin form needs a shape. */
    public function test_the_singleton_is_created_on_first_read(): void
    {
        $this->actingAsRole(RoleName::SuperAdmin);

        $this->getJson('/api/v1/admin/home-banner')
            ->assertOk()
            ->assertJsonPath('data.link_type', 'none')
            ->assertJsonPath('data.is_active', false)
            ->assertJsonPath('data.image_url', null);

        $this->assertSame(1, HomeBanner::query()->count());
    }

    public function test_saving_twice_never_creates_a_second_row(): void
    {
        $this->actingAsRole(RoleName::SuperAdmin);

        $this->putJson('/api/v1/admin/home-banner', $this->payload())->assertOk();
        $this->putJson('/api/v1/admin/home-banner', $this->payload(['title' => 'Changed']))
            ->assertOk()
            ->assertJsonPath('data.title', 'Changed');

        $this->assertSame(1, HomeBanner::query()->count());
    }

    public function test_a_course_link_requires_a_published_course(): void
    {
        $this->actingAsRole(RoleName::SuperAdmin);

        $draft = CourseProgramme::factory()->create(['status' => CourseStatus::Draft]);

        $this->putJson('/api/v1/admin/home-banner', $this->payload([
            'link_type' => HomeBannerLink::Course->value,
            'link_course_programme_id' => $draft->id,
        ]))->assertUnprocessable()->assertJsonValidationErrors('link_course_programme_id');

        // And it must be named at all.
        $this->putJson('/api/v1/admin/home-banner', $this->payload([
            'link_type' => HomeBannerLink::Course->value,
        ]))->assertUnprocessable()->assertJsonValidationErrors('link_course_programme_id');

        $published = CourseProgramme::factory()->create(['status' => CourseStatus::Published]);

        $this->putJson('/api/v1/admin/home-banner', $this->payload([
            'link_type' => HomeBannerLink::Course->value,
            'link_course_programme_id' => $published->id,
        ]))->assertOk()->assertJsonPath('data.link_course_name', $published->name);
    }

    public function test_a_url_link_must_be_an_http_address(): void
    {
        $this->actingAsRole(RoleName::SuperAdmin);

        $this->putJson('/api/v1/admin/home-banner', $this->payload([
            'link_type' => HomeBannerLink::Url->value,
            'link_url' => 'javascript:alert(1)',
        ]))->assertUnprocessable()->assertJsonValidationErrors('link_url');

        $this->putJson('/api/v1/admin/home-banner', $this->payload([
            'link_type' => HomeBannerLink::Url->value,
        ]))->assertUnprocessable()->assertJsonValidationErrors('link_url');
    }

    /** Switching link type must not leave the previous target behind. */
    public function test_changing_the_link_type_clears_the_branch_that_no_longer_applies(): void
    {
        $this->actingAsRole(RoleName::SuperAdmin);

        $course = CourseProgramme::factory()->create(['status' => CourseStatus::Published]);

        $this->putJson('/api/v1/admin/home-banner', $this->payload([
            'link_type' => HomeBannerLink::Course->value,
            'link_course_programme_id' => $course->id,
        ]))->assertOk();

        $this->putJson('/api/v1/admin/home-banner', $this->payload([
            'link_type' => HomeBannerLink::Url->value,
            'link_url' => 'https://planbinternational.lk/intake',
        ]))
            ->assertOk()
            ->assertJsonPath('data.link_course_programme_id', null)
            ->assertJsonPath('data.link_url', 'https://planbinternational.lk/intake');
    }

    public function test_the_image_is_re_encoded_and_can_be_removed(): void
    {
        Storage::fake('public');
        $this->actingAsRole(RoleName::SuperAdmin);

        $response = $this->post('/api/v1/admin/home-banner/image', [
            'image' => UploadedFile::fake()->image('promo.png', 1600, 900),
        ]);

        $response->assertOk();
        $this->assertNotNull($response->json('data.image_url'));

        // Re-encoded to JPEG regardless of what was uploaded (CLAUDE.md §7.4).
        $this->assertStringEndsWith('.jpg', (string) $response->json('data.image_url'));

        $this->deleteJson('/api/v1/admin/home-banner/image')
            ->assertOk()
            ->assertJsonPath('data.image_url', null);
    }

    public function test_a_non_image_upload_is_rejected(): void
    {
        Storage::fake('public');
        $this->actingAsRole(RoleName::SuperAdmin);

        $this->post('/api/v1/admin/home-banner/image', [
            'image' => UploadedFile::fake()->create('promo.pdf', 100, 'application/pdf'),
        ])->assertUnprocessable()->assertJsonValidationErrors('image');
    }

    public function test_a_support_agent_may_look_but_not_publish(): void
    {
        $this->actingAsRole(RoleName::SupportAgent);

        $this->getJson('/api/v1/admin/home-banner')->assertOk();
        $this->putJson('/api/v1/admin/home-banner', $this->payload())->assertForbidden();
    }

    public function test_a_content_manager_may_publish(): void
    {
        $this->actingAsRole(RoleName::ContentManager);

        $this->putJson('/api/v1/admin/home-banner', $this->payload())->assertOk();
    }
}
