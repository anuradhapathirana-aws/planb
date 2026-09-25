<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\CourseStatus;
use App\Enums\RoleName;
use App\Enums\SiteHeroIcon;
use App\Enums\SiteLinkTarget;
use App\Models\CourseProgramme;
use App\Models\SiteHeroSlide;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Website Configuration — hero slides, the About video and the team.
 *
 * Happy path plus one error per endpoint, and every rule in this feature that
 * exists for a security reason rather than a UX one.
 */
class WebsiteConfigurationTest extends TestCase
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

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function slidePayload(array $overrides = []): array
    {
        return array_merge([
            'heading' => 'Your route to a **UAE degree**, mapped out',
            'body' => 'Courses, documents and timelines in one place.',
            'eyebrow' => 'Study in the UAE',
            'primary_cta_label' => 'Browse courses',
            'primary_cta_target' => SiteLinkTarget::Courses->value,
            'secondary_cta_target' => SiteLinkTarget::None->value,
            'icon' => SiteHeroIcon::Education->value,
            'is_visible' => true,
        ], $overrides);
    }

    /*
    |--------------------------------------------------------------------------
    | Hero slides
    |--------------------------------------------------------------------------
    */

    public function test_slides_are_created_and_appended_to_the_end(): void
    {
        $this->actingAsRole(RoleName::SuperAdmin);

        $this->postJson('/api/v1/admin/site-hero-slides', $this->slidePayload(['heading' => 'One']))
            ->assertCreated()
            ->assertJsonPath('data.sort_order', 1);

        $this->postJson('/api/v1/admin/site-hero-slides', $this->slidePayload(['heading' => 'Two']))
            ->assertCreated()
            ->assertJsonPath('data.sort_order', 2);

        $this->getJson('/api/v1/admin/site-hero-slides')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.heading', 'One')
            ->assertJsonPath('data.1.heading', 'Two');
    }

    public function test_a_slide_without_a_headline_is_refused(): void
    {
        $this->actingAsRole(RoleName::SuperAdmin);

        $this->postJson('/api/v1/admin/site-hero-slides', $this->slidePayload(['heading' => '']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('heading');
    }

    public function test_an_unclosed_highlight_marker_is_refused(): void
    {
        $this->actingAsRole(RoleName::SuperAdmin);

        // One `**` with no partner renders the asterisks literally on the live
        // page — a mistake the admin would only find by looking at the website.
        $this->postJson('/api/v1/admin/site-hero-slides', $this->slidePayload([
            'heading' => 'Your route to a **UAE degree',
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('heading');
    }

    public function test_a_button_target_outside_the_fixed_list_is_refused(): void
    {
        $this->actingAsRole(RoleName::SuperAdmin);

        $this->postJson('/api/v1/admin/site-hero-slides', $this->slidePayload([
            'primary_cta_target' => 'javascript',
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('primary_cta_target');
    }

    public function test_a_javascript_url_is_refused_on_a_url_button(): void
    {
        $this->actingAsRole(RoleName::SuperAdmin);

        $this->postJson('/api/v1/admin/site-hero-slides', $this->slidePayload([
            'primary_cta_target' => SiteLinkTarget::Url->value,
            'primary_cta_url' => 'javascript:alert(1)',
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('primary_cta_url');
    }

    public function test_a_button_pointing_at_an_unpublished_course_is_refused(): void
    {
        $this->actingAsRole(RoleName::SuperAdmin);

        $draft = CourseProgramme::factory()->create(['status' => CourseStatus::Draft]);

        $this->postJson('/api/v1/admin/site-hero-slides', $this->slidePayload([
            'primary_cta_target' => SiteLinkTarget::Course->value,
            'primary_cta_course_programme_id' => $draft->id,
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('primary_cta_course_programme_id');
    }

    public function test_switching_a_button_away_from_a_url_clears_the_stored_url(): void
    {
        $this->actingAsRole(RoleName::SuperAdmin);

        $id = $this->postJson('/api/v1/admin/site-hero-slides', $this->slidePayload([
            'primary_cta_target' => SiteLinkTarget::Url->value,
            'primary_cta_url' => 'https://planbinternational.lk/intake',
        ]))->assertCreated()->json('data.id');

        // The branch that no longer applies has to be cleared, or the old
        // address is invisible in the form and live again on the next switch.
        $this->putJson("/api/v1/admin/site-hero-slides/{$id}", $this->slidePayload([
            'primary_cta_target' => SiteLinkTarget::Courses->value,
        ]))
            ->assertOk()
            ->assertJsonPath('data.primary_cta_url', null);
    }

    public function test_slides_are_reordered_from_the_sequence_sent(): void
    {
        $this->actingAsRole(RoleName::SuperAdmin);

        $first = $this->postJson('/api/v1/admin/site-hero-slides', $this->slidePayload(['heading' => 'One']))
            ->json('data.id');
        $second = $this->postJson('/api/v1/admin/site-hero-slides', $this->slidePayload(['heading' => 'Two']))
            ->json('data.id');

        $this->postJson('/api/v1/admin/site-hero-slides/reorder', ['ids' => [$second, $first]])
            ->assertOk()
            ->assertJsonPath('data.0.id', $second)
            ->assertJsonPath('data.1.id', $first);
    }

    public function test_a_partial_reorder_is_refused(): void
    {
        $this->actingAsRole(RoleName::SuperAdmin);

        $first = $this->postJson('/api/v1/admin/site-hero-slides', $this->slidePayload())->json('data.id');
        $this->postJson('/api/v1/admin/site-hero-slides', $this->slidePayload());

        // Renumbering only some rows leaves the rest colliding with them.
        $this->postJson('/api/v1/admin/site-hero-slides/reorder', ['ids' => [$first]])
            ->assertStatus(422)
            ->assertJsonValidationErrors('ids');
    }

    public function test_a_support_agent_may_look_but_not_publish(): void
    {
        $this->actingAsRole(RoleName::SupportAgent);

        $this->getJson('/api/v1/admin/site-hero-slides')->assertOk();
        $this->postJson('/api/v1/admin/site-hero-slides', $this->slidePayload())->assertForbidden();
    }

    public function test_a_slide_image_is_re_encoded_to_the_sliders_shape(): void
    {
        Storage::fake('public');
        $this->actingAsRole(RoleName::SuperAdmin);

        $id = $this->postJson('/api/v1/admin/site-hero-slides', $this->slidePayload())->json('data.id');

        $this->post(
            "/api/v1/admin/site-hero-slides/{$id}/image",
            ['image' => UploadedFile::fake()->image('wrong-shape.png', 900, 900)],
        )->assertOk();

        // 4:3, whatever was uploaded — the stored file IS the shape the page
        // reserves, so the browser never crops it a second time.
        $media = SiteHeroSlide::query()->findOrFail($id)->getFirstMedia(SiteHeroSlide::IMAGE_COLLECTION);
        $this->assertNotNull($media);

        [$width, $height] = getimagesize($media->getPath());
        $this->assertSame(1200, $width);
        $this->assertSame(900, $height);
    }

    public function test_a_non_image_upload_is_refused(): void
    {
        Storage::fake('public');
        $this->actingAsRole(RoleName::SuperAdmin);

        $id = $this->postJson('/api/v1/admin/site-hero-slides', $this->slidePayload())->json('data.id');

        $this->post(
            "/api/v1/admin/site-hero-slides/{$id}/image",
            ['image' => UploadedFile::fake()->create('payload.php', 10, 'application/x-php')],
        )->assertStatus(422)->assertJsonValidationErrors('image');
    }

    /*
    |--------------------------------------------------------------------------
    | The About video
    |--------------------------------------------------------------------------
    */

    public function test_website_content_is_saved(): void
    {
        $this->actingAsRole(RoleName::SuperAdmin);

        $this->putJson('/api/v1/admin/company-settings/website', [
            'community_heading' => 'Join **500+ Sri Lankans** building a life in the UAE',
            'community_video_url' => 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
            'community_video_duration_label' => '1:58',
        ])
            ->assertOk()
            ->assertJsonPath('data.community_video_url', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ');
    }

    /**
     * The same hostname-confusion inputs `site/src/lib/youtube.ts` is tested
     * against. A substring check for "youtube.com" accepts all three.
     */
    public function test_a_link_that_is_not_a_youtube_video_is_refused(): void
    {
        $this->actingAsRole(RoleName::SuperAdmin);

        $hostile = [
            'https://evil-youtube.com/watch?v=aqz-KE-bpKQ',
            'https://youtube.com.attacker.net/watch?v=aqz-KE-bpKQ',
            'https://attacker.net/watch?v=aqz-KE-bpKQ&host=youtube.com',
            'https://www.youtube.com/watch?v=short',
            'https://vimeo.com/123456789',
        ];

        foreach ($hostile as $url) {
            $this->putJson('/api/v1/admin/company-settings/website', ['community_video_url' => $url])
                ->assertStatus(422)
                ->assertJsonValidationErrors('community_video_url');
        }
    }

    public function test_a_javascript_video_link_is_refused(): void
    {
        $this->actingAsRole(RoleName::SuperAdmin);

        $this->putJson('/api/v1/admin/company-settings/website', [
            'community_video_url' => 'javascript:alert(document.domain)',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('community_video_url');
    }

    public function test_an_accountant_cannot_edit_website_copy(): void
    {
        $this->actingAsRole(RoleName::Accountant);

        $this->putJson('/api/v1/admin/company-settings/website', [
            'community_heading' => 'Rewritten',
        ])->assertForbidden();
    }

    /*
    |--------------------------------------------------------------------------
    | Team members
    |--------------------------------------------------------------------------
    */

    public function test_team_members_are_created_and_listed_in_order(): void
    {
        $this->actingAsRole(RoleName::SuperAdmin);

        $this->postJson('/api/v1/admin/team-members', [
            'name' => 'Anuradha Pathirana',
            'role' => 'Founder & Director',
            'is_visible' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('data.sort_order', 1)
            // No photograph yet, so the website would draw a grey box.
            ->assertJsonPath('data.is_live', false);

        $this->getJson('/api/v1/admin/team-members')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_a_team_member_without_a_name_is_refused(): void
    {
        $this->actingAsRole(RoleName::SuperAdmin);

        $this->postJson('/api/v1/admin/team-members', ['name' => '', 'is_visible' => true])
            ->assertStatus(422)
            ->assertJsonValidationErrors('name');
    }

    public function test_a_team_photo_is_cropped_to_portrait_from_the_top(): void
    {
        Storage::fake('public');
        $this->actingAsRole(RoleName::SuperAdmin);

        $id = $this->postJson('/api/v1/admin/team-members', [
            'name' => 'Sanduni Herath',
            'is_visible' => true,
        ])->json('data.id');

        $this->post(
            "/api/v1/admin/team-members/{$id}/photo",
            ['photo' => UploadedFile::fake()->image('portrait.jpg', 1600, 1600)],
        )
            ->assertOk()
            // With a photograph it is live.
            ->assertJsonPath('data.is_live', true);

        $media = TeamMember::query()->findOrFail($id)->getFirstMedia(TeamMember::PHOTO_COLLECTION);
        $this->assertNotNull($media);

        [$width, $height] = getimagesize($media->getPath());
        $this->assertSame(800, $width);
        $this->assertSame(1000, $height);
    }

    public function test_deleting_a_member_removes_their_photograph(): void
    {
        Storage::fake('public');
        $this->actingAsRole(RoleName::SuperAdmin);

        $id = $this->postJson('/api/v1/admin/team-members', [
            'name' => 'Roshan Mendis',
            'is_visible' => true,
        ])->json('data.id');

        $this->post(
            "/api/v1/admin/team-members/{$id}/photo",
            ['photo' => UploadedFile::fake()->image('portrait.jpg', 800, 1000)],
        )->assertOk();

        $path = TeamMember::query()->findOrFail($id)
            ->getFirstMedia(TeamMember::PHOTO_COLLECTION)?->getPath();
        $this->assertNotNull($path);
        $this->assertFileExists($path);

        $this->deleteJson("/api/v1/admin/team-members/{$id}")->assertNoContent();

        // Somebody removed from the team should not leave their face on our disk.
        $this->assertFileDoesNotExist($path);
    }
}
