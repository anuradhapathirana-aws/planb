<?php

declare(strict_types=1);

namespace App\Services\Settings;

use App\Enums\HomeBannerLink;
use App\Models\HomeBanner;
use Illuminate\Http\UploadedFile;
use Intervention\Image\ImageManager;

/**
 * The one way in and out of the Home banner singleton.
 *
 * Nothing else may call `HomeBanner::create()` — that is what keeps "exactly
 * one row" true without a database constraint that would need its own
 * migration to relax later.
 */
class HomeBannerService
{
    /** 2:1, which is the aspect the app's hero reserves. */
    private const IMAGE_WIDTH = 1200;

    private const IMAGE_HEIGHT = 600;

    /**
     * The row, creating the empty default on first read.
     *
     * Persisting it rather than returning an unsaved model means the admin
     * screen has something to upload an image against before it has been saved
     * once — Media Library needs a saved model with an id.
     */
    public function current(): HomeBanner
    {
        $banner = HomeBanner::query()->with('linkedCourse')->first();

        return $banner ?? HomeBanner::query()->create([]);
    }

    /**
     * What the student app should see, or null.
     *
     * Null covers three cases the app treats identically — no banner set up,
     * switched off, or active with no image — and it falls back to its own
     * branded hero for all of them.
     */
    public function forStudents(): ?HomeBanner
    {
        $banner = HomeBanner::query()->with('linkedCourse')->first();

        return $banner?->isPublishable() === true ? $banner : null;
    }

    /**
     * @param array{
     *     title?: string|null,
     *     subtitle?: string|null,
     *     link_type?: string,
     *     link_course_programme_id?: int|null,
     *     link_url?: string|null,
     *     is_active?: bool,
     * } $data
     */
    public function save(array $data): HomeBanner
    {
        $banner = $this->current();

        $linkType = HomeBannerLink::from($data['link_type'] ?? $banner->link_type->value);

        /*
         * Clear the branch that does not apply. Without this, switching the
         * link from a course to a URL would leave the old course id behind —
         * invisible in the form, and live again the moment someone switches
         * back. The Form Request already rejects the wrong combination; this
         * makes the stored row match what the admin can actually see.
         */
        $banner->fill([
            'title' => $data['title'] ?? null,
            'subtitle' => $data['subtitle'] ?? null,
            'link_type' => $linkType->value,
            'link_course_programme_id' => $linkType === HomeBannerLink::Course
                ? ($data['link_course_programme_id'] ?? null)
                : null,
            'link_url' => $linkType === HomeBannerLink::Url ? ($data['link_url'] ?? null) : null,
            'is_active' => $data['is_active'] ?? false,
        ]);

        $banner->save();

        return $banner->fresh(['linkedCourse']) ?? $banner;
    }

    /**
     * Re-encodes before storing (root CLAUDE.md §7.4). Beyond stripping
     * whatever a source file carried, it also stops a 6 MB phone photo becoming
     * the first thing every student downloads on every cold start.
     */
    public function updateImage(UploadedFile $file): HomeBanner
    {
        $banner = $this->current();

        $encoded = ImageManager::gd()
            ->read($file->getRealPath())
            ->cover(self::IMAGE_WIDTH, self::IMAGE_HEIGHT)
            ->toJpeg(82);

        $tempPath = tempnam(sys_get_temp_dir(), 'planb_home_banner_').'.jpg';
        file_put_contents($tempPath, (string) $encoded);

        $banner->addMedia($tempPath)
            ->usingFileName('home-banner.jpg')
            ->toMediaCollection(HomeBanner::IMAGE_COLLECTION);

        return $banner->fresh(['linkedCourse']) ?? $banner;
    }

    public function removeImage(): HomeBanner
    {
        $banner = $this->current();

        $banner->clearMediaCollection(HomeBanner::IMAGE_COLLECTION);

        return $banner->fresh(['linkedCourse']) ?? $banner;
    }
}
