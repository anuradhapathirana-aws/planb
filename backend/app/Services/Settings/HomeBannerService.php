<?php

declare(strict_types=1);

namespace App\Services\Settings;

use App\Enums\HomeBannerLink;
use App\Models\HomeBanner;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Intervention\Image\ImageManager;

/**
 * The one way in and out of the Home carousel.
 *
 * Nothing else may call `HomeBanner::create()`. The table used to hold exactly
 * one row by convention; it now holds an ordered list that the admin panel
 * manages as a collection.
 */
class HomeBannerService
{
    /** 16:9, which is the aspect the app's carousel reserves. */
    private const IMAGE_WIDTH = 1280;

    private const IMAGE_HEIGHT = 720;

    /**
     * Every slide, in the admin's order.
     *
     * @return Collection<int, HomeBanner>
     */
    public function all(): Collection
    {
        return HomeBanner::query()->with('linkedCourse')->ordered()->get();
    }

    /**
     * Every slide the carousel should show, in the admin's order.
     *
     * A slide that is switched off, or has neither artwork nor wording, is
     * dropped rather than sent — the app would render an empty box for it, and
     * one blank page in a swipeable carousel reads as a broken app. An empty
     * collection is a normal answer: the app falls back to its branded slides.
     *
     * @return Collection<int, HomeBanner>
     */
    public function liveForStudents(): Collection
    {
        return HomeBanner::query()
            ->with('linkedCourse')
            ->where('is_active', true)
            ->ordered()
            ->get()
            ->filter(fn (HomeBanner $banner) => $banner->isPublishable())
            ->values();
    }

    /**
     * A new slide, appended to the end of the carousel.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): HomeBanner
    {
        $banner = new HomeBanner;

        // Appended rather than inserted: an admin adding a slide is not asking
        // to reshuffle the ones already live. They can drag it up afterwards.
        $banner->sort_order = (int) HomeBanner::query()->max('sort_order') + 1;

        return $this->fill($banner, $data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(HomeBanner $banner, array $data): HomeBanner
    {
        return $this->fill($banner, $data);
    }

    public function delete(HomeBanner $banner): void
    {
        // Media Library cleans up the file with the row it belongs to.
        $banner->delete();
    }

    /**
     * Rewrite the carousel order from a list of ids.
     *
     * Position in the array IS the order — the client sends the sequence it is
     * showing, not a per-row number to reconcile (root CLAUDE.md §8). One
     * transaction, so a half-applied reorder cannot leave two slides fighting
     * over the same position.
     *
     * @param  list<int>  $orderedIds
     */
    public function reorder(array $orderedIds): void
    {
        DB::transaction(function () use ($orderedIds): void {
            foreach ($orderedIds as $position => $id) {
                HomeBanner::query()->whereKey($id)->update(['sort_order' => $position]);
            }
        });
    }

    /**
     * Re-encodes before storing (root CLAUDE.md §7.4). Beyond stripping
     * whatever a source file carried, it also stops a 6 MB phone photo becoming
     * the first thing every student downloads on every cold start.
     */
    public function updateImage(HomeBanner $banner, UploadedFile $file): HomeBanner
    {
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

    public function removeImage(HomeBanner $banner): HomeBanner
    {
        $banner->clearMediaCollection(HomeBanner::IMAGE_COLLECTION);

        return $banner->fresh(['linkedCourse']) ?? $banner;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function fill(HomeBanner $banner, array $data): HomeBanner
    {
        /** @var string $rawLink */
        $rawLink = $data['link_type'] ?? $banner->link_type->value;
        $linkType = HomeBannerLink::from($rawLink);

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
}
