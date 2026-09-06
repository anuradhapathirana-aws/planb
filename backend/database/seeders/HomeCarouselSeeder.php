<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\HomeBannerLink;
use App\Models\HomeBanner;
use Illuminate\Database\Seeder;

/**
 * The two Home carousel slides the client asked for: Courses and Services.
 *
 * They exist as database rows rather than as hardcoded app defaults so Plan B
 * can rewrite the wording, swap the artwork and reorder them from the admin
 * panel once its carousel screen lands — which is the whole point of the
 * `home_banners` table. Until then this is how they get created.
 *
 * **Idempotent and non-destructive.** It matches on `link_type`, so running it
 * twice adds nothing, and it never touches a slide an admin has already edited
 * — including the pre-existing singleton banner, which keeps whatever wording
 * and image it had and simply becomes one more slide in the sequence.
 *
 * Neither slide is given an image: `HomeBanner::isPublishable()` accepts a
 * slide that has wording and no artwork, and the app draws it as a branded card
 * in the house colours. So they are live immediately and become photographic
 * the moment someone uploads to them.
 */
class HomeCarouselSeeder extends Seeder
{
    public function run(): void
    {
        $slides = [
            [
                'link_type' => HomeBannerLink::Courses,
                'title' => 'Find your course',
                'subtitle' => 'Training built for working and studying in the UAE.',
            ],
            [
                'link_type' => HomeBannerLink::Services,
                'title' => 'Let us handle the paperwork',
                'subtitle' => 'CV writing, visa help and interview coaching from the Plan B team.',
            ],
        ];

        // Appended after whatever is already there, so an existing banner keeps
        // its position at the front of the carousel.
        $nextOrder = (int) HomeBanner::query()->max('sort_order') + 1;

        foreach ($slides as $slide) {
            $exists = HomeBanner::query()
                ->where('link_type', $slide['link_type']->value)
                ->exists();

            if ($exists) {
                continue;
            }

            HomeBanner::query()->create([
                'title' => $slide['title'],
                'subtitle' => $slide['subtitle'],
                'link_type' => $slide['link_type']->value,
                'is_active' => true,
                'sort_order' => $nextOrder,
            ]);

            $nextOrder++;
        }
    }
}
