<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\SiteHeroIcon;
use App\Enums\SiteLinkTarget;
use App\Models\SiteHeroSlide;
use App\Services\Settings\CompanySettingsService;
use Illuminate\Database\Seeder;

/**
 * Plan B's designed hero and About copy, as editable database rows.
 *
 * The website carries the same wording as a hardcoded fallback, so a fresh
 * install is never blank. This seeder puts it in the database as well, which is
 * a different thing: it gives the admin panel a real starting point to edit
 * rather than an empty page with an "Add slide" button and no idea what a slide
 * is meant to contain.
 *
 * **Idempotent and non-destructive.** It writes nothing if any slide already
 * exists, and it fills only About fields that are still empty — so it can never
 * overwrite wording somebody has edited.
 *
 * **No team members.** A seeder cannot supply real photographs or real names,
 * and inventing colleagues would put fictional staff in Plan B's admin panel
 * waiting to be published by accident. The team starts empty on purpose; the
 * website shows its "coming soon" state until the client adds people.
 */
class WebsiteContentSeeder extends Seeder
{
    public function __construct(private readonly CompanySettingsService $settings) {}

    public function run(): void
    {
        $this->seedHeroSlides();
        $this->seedAboutSection();
    }

    private function seedHeroSlides(): void
    {
        // Any slide at all means an admin has been here. Leave it alone.
        if (SiteHeroSlide::query()->exists()) {
            return;
        }

        $slides = [
            [
                'eyebrow' => 'Study in the UAE',
                'heading' => 'Your route to a **UAE degree**, mapped out',
                'body' => 'Courses, documents and timelines in one place — built for Sri Lankan students, in English and Sinhala.',
                'primary_cta_label' => 'Browse courses',
                'primary_cta_target' => SiteLinkTarget::Courses->value,
                'secondary_cta_label' => 'How it works',
                'secondary_cta_target' => SiteLinkTarget::About->value,
                'icon' => SiteHeroIcon::Education->value,
                'stat_one_value' => '500+',
                'stat_one_label' => 'Students',
                'stat_two_value' => '2',
                'stat_two_label' => 'Languages',
            ],
            [
                'eyebrow' => 'Work in the UAE',
                'heading' => 'Get **job-ready** before you land',
                'body' => 'Interview preparation, CV writing and profession-specific guidance from people who have placed students in the Emirates.',
                'primary_cta_label' => 'Browse courses',
                'primary_cta_target' => SiteLinkTarget::Courses->value,
                'secondary_cta_label' => 'What students say',
                'secondary_cta_target' => SiteLinkTarget::Testimonials->value,
                'icon' => SiteHeroIcon::Career->value,
                'stat_one_value' => '12+',
                'stat_one_label' => 'Professions',
                'stat_two_value' => '1:1',
                'stat_two_label' => 'Guidance',
            ],
            [
                'eyebrow' => 'Arrive prepared',
                'heading' => 'Every step **before and after** you fly',
                'body' => 'A checklist that covers visas, medicals, housing and your Emirates ID — tick it off from your phone as you go.',
                'primary_cta_label' => 'Start free',
                'primary_cta_target' => SiteLinkTarget::Courses->value,
                'secondary_cta_label' => 'Talk to us',
                'secondary_cta_target' => SiteLinkTarget::Contact->value,
                'icon' => SiteHeroIcon::Travel->value,
                'stat_one_value' => '40+',
                'stat_one_label' => 'Checklist steps',
                'stat_two_value' => '2',
                'stat_two_label' => 'Phases',
            ],
        ];

        foreach ($slides as $position => $slide) {
            SiteHeroSlide::query()->create([
                ...$slide,
                'is_visible' => true,
                'sort_order' => $position + 1,
            ]);
        }
    }

    /**
     * Only the fields still empty, so running this after the client has written
     * their own About copy changes nothing.
     */
    private function seedAboutSection(): void
    {
        $settings = $this->settings->current();

        $defaults = [
            'community_eyebrow' => 'Community & trust',
            'community_heading' => 'Join **500+ Sri Lankans** building a life in the UAE',
            'community_body' => 'Plan B International has guided students and professionals from Colombo to Dubai, Abu Dhabi and Sharjah since day one. We do not just sell a course — we stay with you until you have landed.',
            'community_floating_label' => 'Enrolment open now',
            // No video link: one is the client's to supply, and seeding a
            // stranger's YouTube video onto Plan B's front page is not a default.
        ];

        $fill = [];

        foreach ($defaults as $column => $value) {
            if (trim((string) $settings->getAttribute($column)) === '') {
                $fill[$column] = $value;
            }
        }

        if ($fill !== []) {
            $settings->fill($fill)->save();
        }
    }
}
