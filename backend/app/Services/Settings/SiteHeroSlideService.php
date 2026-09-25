<?php

declare(strict_types=1);

namespace App\Services\Settings;

use App\Enums\SiteLinkTarget;
use App\Models\SiteHeroSlide;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Intervention\Image\ImageManager;

/**
 * The one way in and out of the website's hero slider.
 *
 * Nothing else may call `SiteHeroSlide::create()`.
 */
class SiteHeroSlideService
{
    /**
     * 1200x900 — 4:3, exactly the frame `HeroSlider.tsx` reserves.
     *
     * **These two numbers and the slider's `aspect-[4/3]` are one decision in
     * two files.** `cover()` below crops every upload to this ratio, so the
     * stored file IS this shape; if the page reserved a different one the
     * browser would crop it a second time at display and the admin's picture
     * would quietly lose its edges. Change one, change the other.
     */
    private const IMAGE_WIDTH = 1200;

    private const IMAGE_HEIGHT = 900;

    /**
     * Every slide, in the admin's order.
     *
     * @return Collection<int, SiteHeroSlide>
     */
    public function all(): Collection
    {
        return SiteHeroSlide::query()
            ->with(['primaryCtaCourse', 'secondaryCtaCourse'])
            ->ordered()
            ->get();
    }

    /**
     * Every slide a visitor should see, in the admin's order.
     *
     * An empty collection is a normal answer, not an error: the website falls
     * back to its own designed slides, so the hero is never blank.
     *
     * @return Collection<int, SiteHeroSlide>
     */
    public function live(): Collection
    {
        return SiteHeroSlide::query()
            ->with(['primaryCtaCourse', 'secondaryCtaCourse'])
            ->where('is_visible', true)
            ->ordered()
            ->get()
            ->filter(fn (SiteHeroSlide $slide) => $slide->isPublishable())
            ->values();
    }

    /**
     * A new slide, appended to the end of the slider.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): SiteHeroSlide
    {
        $slide = new SiteHeroSlide;

        // Appended rather than inserted: adding a slide is not a request to
        // reshuffle the ones already live. The admin can move it up afterwards.
        $slide->sort_order = (int) SiteHeroSlide::query()->max('sort_order') + 1;

        return $this->fill($slide, $data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(SiteHeroSlide $slide, array $data): SiteHeroSlide
    {
        return $this->fill($slide, $data);
    }

    public function delete(SiteHeroSlide $slide): void
    {
        // Media Library removes the file with the row it belongs to.
        $slide->delete();
    }

    /**
     * Rewrite the slider order from a list of ids.
     *
     * Position in the array IS the order — the client sends the sequence it is
     * showing rather than per-row numbers to reconcile (root CLAUDE.md §8). One
     * transaction, so a half-applied reorder cannot leave two slides fighting
     * over the same position.
     *
     * @param  list<int>  $orderedIds
     */
    public function reorder(array $orderedIds): void
    {
        DB::transaction(function () use ($orderedIds): void {
            foreach ($orderedIds as $position => $id) {
                SiteHeroSlide::query()->whereKey($id)->update(['sort_order' => $position]);
            }
        });
    }

    /**
     * Re-encodes before storing (root CLAUDE.md §7.4). Beyond stripping
     * whatever the source file carried, it also stops a 6 MB export becoming
     * part of the company home page's first paint.
     */
    public function updateImage(SiteHeroSlide $slide, UploadedFile $file): SiteHeroSlide
    {
        $encoded = ImageManager::gd()
            ->read($file->getRealPath())
            ->cover(self::IMAGE_WIDTH, self::IMAGE_HEIGHT)
            ->toJpeg(82);

        $tempPath = tempnam(sys_get_temp_dir(), 'planb_hero_slide_').'.jpg';
        file_put_contents($tempPath, (string) $encoded);

        $slide->addMedia($tempPath)
            ->usingFileName('hero-slide.jpg')
            ->toMediaCollection(SiteHeroSlide::IMAGE_COLLECTION);

        return $this->refresh($slide);
    }

    public function removeImage(SiteHeroSlide $slide): SiteHeroSlide
    {
        $slide->clearMediaCollection(SiteHeroSlide::IMAGE_COLLECTION);

        return $this->refresh($slide);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function fill(SiteHeroSlide $slide, array $data): SiteHeroSlide
    {
        $slide->fill([
            'eyebrow' => $data['eyebrow'] ?? null,
            'eyebrow_si' => $data['eyebrow_si'] ?? null,
            'heading' => $data['heading'] ?? null,
            'heading_si' => $data['heading_si'] ?? null,
            'body' => $data['body'] ?? null,
            'body_si' => $data['body_si'] ?? null,
            'stat_one_value' => $data['stat_one_value'] ?? null,
            'stat_one_label' => $data['stat_one_label'] ?? null,
            'stat_one_label_si' => $data['stat_one_label_si'] ?? null,
            'stat_two_value' => $data['stat_two_value'] ?? null,
            'stat_two_label' => $data['stat_two_label'] ?? null,
            'stat_two_label_si' => $data['stat_two_label_si'] ?? null,
            'icon' => $data['icon'],
            'is_visible' => $data['is_visible'] ?? false,
        ]);

        $this->fillCta($slide, 'primary', $data);
        $this->fillCta($slide, 'secondary', $data);

        $slide->save();

        return $this->refresh($slide);
    }

    /**
     * One button's label and destination.
     *
     * **Clears the branch that does not apply.** Without this, switching a
     * button from a course to a web address would leave the old course id
     * behind — invisible in the form, and live again the moment somebody
     * switched back. The Form Request already rejects the wrong combination;
     * this makes the stored row match what the admin can actually see.
     *
     * @param  'primary'|'secondary'  $slot
     * @param  array<string, mixed>  $data
     */
    private function fillCta(SiteHeroSlide $slide, string $slot, array $data): void
    {
        /** @var string $raw */
        $raw = $data[$slot.'_cta_target'] ?? SiteLinkTarget::None->value;
        $target = SiteLinkTarget::from($raw);

        $slide->fill([
            $slot.'_cta_label' => $data[$slot.'_cta_label'] ?? null,
            $slot.'_cta_label_si' => $data[$slot.'_cta_label_si'] ?? null,
            $slot.'_cta_target' => $target->value,
            $slot.'_cta_course_programme_id' => $target->needsCourse()
                ? ($data[$slot.'_cta_course_programme_id'] ?? null)
                : null,
            $slot.'_cta_url' => $target->needsUrl() ? ($data[$slot.'_cta_url'] ?? null) : null,
        ]);
    }

    private function refresh(SiteHeroSlide $slide): SiteHeroSlide
    {
        return $slide->fresh(['primaryCtaCourse', 'secondaryCtaCourse']) ?? $slide;
    }
}
