<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\SiteLinkTarget;
use App\Models\CompanySetting;
use App\Models\SiteHeroSlide;
use App\Models\TeamMember;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * `GET api/v1/public/site-content` — the website's admin-managed content.
 *
 * The first endpoint in this application that anyone on the internet may call,
 * so most of what is asserted here is about what does **not** come back.
 */
class PublicSiteContentTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/v1/public/site-content';

    public function test_it_answers_without_a_session(): void
    {
        $this->getJson(self::URL)
            ->assertOk()
            ->assertJsonStructure(['data' => ['branding', 'hero_slides', 'community', 'team']]);
    }

    public function test_an_empty_site_is_a_valid_answer_not_an_error(): void
    {
        // The website falls back to its own designed slides, so this must not
        // 404 or 500 before the client has supplied any content.
        $this->getJson(self::URL)
            ->assertOk()
            ->assertJsonCount(0, 'data.hero_slides')
            ->assertJsonCount(0, 'data.team');
    }

    public function test_hidden_and_incomplete_rows_are_not_published(): void
    {
        SiteHeroSlide::query()->create([
            'heading' => 'Switched off',
            'is_visible' => false,
        ]);

        // Visible but with no headline — it would render as a blank panel.
        SiteHeroSlide::query()->create([
            'heading' => null,
            'is_visible' => true,
        ]);

        SiteHeroSlide::query()->create([
            'heading' => 'Live',
            'is_visible' => true,
        ]);

        // Visible but with no photograph, so the card would be a grey box.
        TeamMember::query()->create(['name' => 'No photo', 'is_visible' => true]);

        $this->getJson(self::URL)
            ->assertOk()
            ->assertJsonCount(1, 'data.hero_slides')
            ->assertJsonPath('data.hero_slides.0.heading', 'Live')
            ->assertJsonCount(0, 'data.team');
    }

    /**
     * The community block is a narrow slice of the `company_settings` singleton,
     * which also holds Plan B's bank account. Reusing the admin Resource there
     * would publish it; this test is what stops that regressing.
     */
    public function test_it_never_publishes_the_companys_bank_details(): void
    {
        $settings = CompanySetting::query()->firstOrFail();
        $settings->update([
            'bank_name' => 'Commercial Bank',
            'bank_account_name' => 'Plan B International',
            'bank_account_number' => '1234567890',
            'bank_branch' => 'Colombo 03',
            'community_heading' => 'Join **500+ Sri Lankans**',
        ]);

        $response = $this->getJson(self::URL)->assertOk();

        $body = $response->getContent();

        foreach (['1234567890', 'Commercial Bank', 'Colombo 03', 'bank_account_number'] as $secret) {
            $this->assertStringNotContainsString($secret, $body);
        }

        $response->assertJsonPath('data.community.heading', 'Join **500+ Sri Lankans**');
    }

    /** The header draws the admin's "Plan B logo" (Settings > App Intro). */
    public function test_it_carries_the_uploaded_logo(): void
    {
        Storage::fake('public');

        CompanySetting::query()->firstOrFail()
            ->addMedia(UploadedFile::fake()->image('logo.png', 400, 400))
            ->toMediaCollection(CompanySetting::LOGO_COLLECTION);

        $url = $this->getJson(self::URL)->assertOk()->json('data.branding.logo_url');

        $this->assertIsString($url);
        $this->assertStringEndsWith('logo.png', $url);
    }

    /**
     * No logo uploaded: null, and the website keeps its own bundled mark. The
     * whole block is compared, so a second field slipping in fails here too.
     */
    public function test_no_uploaded_logo_is_null_not_an_error(): void
    {
        $this->getJson(self::URL)
            ->assertOk()
            ->assertJsonPath('data.branding', ['logo_url' => null]);
    }

    public function test_it_never_publishes_editorial_state(): void
    {
        SiteHeroSlide::query()->create(['heading' => 'Live', 'is_visible' => true]);

        $slide = $this->getJson(self::URL)->assertOk()->json('data.hero_slides.0');

        // Admin bookkeeping. A visitor has no use for it, and `is_live` in
        // particular describes content that was deliberately withheld.
        foreach (['is_visible', 'is_live', 'sort_order', 'heading_si', 'updated_at'] as $key) {
            $this->assertArrayNotHasKey($key, $slide);
        }
    }

    public function test_a_button_with_no_label_is_dropped_rather_than_sent_empty(): void
    {
        SiteHeroSlide::query()->create([
            'heading' => 'Live',
            'is_visible' => true,
            'primary_cta_target' => SiteLinkTarget::Courses->value,
            'primary_cta_label' => null,
        ]);

        $this->getJson(self::URL)
            ->assertOk()
            ->assertJsonPath('data.hero_slides.0.primary_cta', null);
    }

    public function test_the_button_arrives_resolved(): void
    {
        SiteHeroSlide::query()->create([
            'heading' => 'Live',
            'is_visible' => true,
            'primary_cta_label' => 'Browse courses',
            'primary_cta_target' => SiteLinkTarget::Courses->value,
        ]);

        $this->getJson(self::URL)
            ->assertOk()
            ->assertJsonPath('data.hero_slides.0.primary_cta.type', 'courses')
            ->assertJsonPath('data.hero_slides.0.primary_cta.label', 'Browse courses');
    }

    public function test_the_server_picks_the_language_column(): void
    {
        SiteHeroSlide::query()->create([
            'heading' => 'English heading',
            'heading_si' => 'සිංහල',
            'is_visible' => true,
        ]);

        $response = $this->withHeaders(['Accept-Language' => 'si'])
            ->getJson(self::URL)
            ->assertOk()
            ->assertJsonPath('data.hero_slides.0.heading', 'සිංහල');

        /*
         * Every response varies by the header, so a CDN or proxy added later
         * cannot serve a Sinhala home page to an English visitor.
         *
         * Asserted by containment, not equality: the CORS middleware appends
         * `Origin` to this same header whenever it echoes an allowed origin
         * back, so the exact value depends on whether the caller sent one.
         * What matters here is that `Accept-Language` is in the list.
         */
        $this->assertStringContainsString(
            'Accept-Language',
            (string) $response->headers->get('Vary'),
        );
    }

    public function test_a_blank_sinhala_column_falls_back_to_english(): void
    {
        SiteHeroSlide::query()->create([
            'heading' => 'English heading',
            'heading_si' => null,
            'is_visible' => true,
        ]);

        $this->withHeaders(['Accept-Language' => 'si'])
            ->getJson(self::URL)
            ->assertOk()
            ->assertJsonPath('data.hero_slides.0.heading', 'English heading');
    }
}
