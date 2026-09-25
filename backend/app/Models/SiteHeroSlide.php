<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\SiteHeroIcon;
use App\Enums\SiteLinkTarget;
use App\Models\Concerns\HasTranslatedText;
use App\Services\Settings\SiteHeroSlideService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

/**
 * One slide of the public website's hero slider.
 *
 * {@see SiteHeroSlideService} is the only thing that reads or writes this.
 */
class SiteHeroSlide extends Model implements HasMedia
{
    use HasTranslatedText;
    use InteractsWithMedia;

    public const IMAGE_COLLECTION = 'slide';

    protected $fillable = [
        'eyebrow',
        'eyebrow_si',
        'heading',
        'heading_si',
        'body',
        'body_si',
        'primary_cta_label',
        'primary_cta_label_si',
        'primary_cta_target',
        'primary_cta_course_programme_id',
        'primary_cta_url',
        'secondary_cta_label',
        'secondary_cta_label_si',
        'secondary_cta_target',
        'secondary_cta_course_programme_id',
        'secondary_cta_url',
        'stat_one_value',
        'stat_one_label',
        'stat_one_label_si',
        'stat_two_value',
        'stat_two_label',
        'stat_two_label_si',
        'icon',
        'is_visible',
        'sort_order',
    ];

    protected $attributes = [
        'primary_cta_target' => SiteLinkTarget::None->value,
        'secondary_cta_target' => SiteLinkTarget::None->value,
        'icon' => SiteHeroIcon::Education->value,
        'is_visible' => false,
        'sort_order' => 0,
    ];

    protected function casts(): array
    {
        return [
            'primary_cta_target' => SiteLinkTarget::class,
            'secondary_cta_target' => SiteLinkTarget::class,
            'icon' => SiteHeroIcon::class,
            'is_visible' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function registerMediaCollections(): void
    {
        // Public disk: it is the artwork on the company's front page, shown to
        // every anonymous visitor. There is nothing to protect and a signed URL
        // would only add latency to the first paint.
        $this->addMediaCollection(self::IMAGE_COLLECTION)
            ->singleFile()
            ->acceptsMimeTypes(['image/jpeg', 'image/png']);
    }

    public function getImageUrlAttribute(): ?string
    {
        return $this->getFirstMedia(self::IMAGE_COLLECTION)?->getUrl();
    }

    public function primaryCtaCourse(): BelongsTo
    {
        return $this->belongsTo(CourseProgramme::class, 'primary_cta_course_programme_id');
    }

    public function secondaryCtaCourse(): BelongsTo
    {
        return $this->belongsTo(CourseProgramme::class, 'secondary_cta_course_programme_id');
    }

    /**
     * Slider order. Ties break on `id` so the sequence is stable — two slides
     * left on the default 0 would otherwise swap places between requests.
     *
     * @param  Builder<SiteHeroSlide>  $query
     * @return Builder<SiteHeroSlide>
     */
    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('id');
    }

    /**
     * Whether this slide is worth showing a visitor at all.
     *
     * A headline is the minimum. Artwork is optional — a slide with wording and
     * no image renders as the designed fallback panel, which is what lets an
     * admin write the copy today and add the photograph tomorrow. A slide with
     * neither is genuinely empty and is dropped, because one blank panel in a
     * rotating hero reads as a broken website.
     */
    public function isPublishable(): bool
    {
        return $this->is_visible && trim((string) $this->heading) !== '';
    }
}
