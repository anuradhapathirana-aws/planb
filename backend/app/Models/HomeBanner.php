<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\HomeBannerLink;
use App\Services\Settings\HomeBannerService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

/**
 * One slide of the student app's Home carousel.
 *
 * Was a singleton; `add_sort_order_to_home_banners_table` made it a list, which
 * is exactly the change the original migration said it would be. {@see
 * HomeBannerService} is still the only thing that reads or writes it.
 */
class HomeBanner extends Model implements HasMedia
{
    use InteractsWithMedia;

    public const IMAGE_COLLECTION = 'banner';

    protected $fillable = [
        'title',
        'subtitle',
        'link_type',
        'link_course_programme_id',
        'link_url',
        'is_active',
        'sort_order',
    ];

    protected $attributes = [
        'link_type' => HomeBannerLink::None->value,
        'is_active' => false,
        'sort_order' => 0,
    ];

    protected function casts(): array
    {
        return [
            'link_type' => HomeBannerLink::class,
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function registerMediaCollections(): void
    {
        // Public disk: it is marketing artwork shown to every student, so there
        // is nothing to protect and a signed URL would only add latency.
        $this->addMediaCollection(self::IMAGE_COLLECTION)
            ->singleFile()
            ->acceptsMimeTypes(['image/jpeg', 'image/png']);
    }

    public function getImageUrlAttribute(): ?string
    {
        return $this->getFirstMedia(self::IMAGE_COLLECTION)?->getUrl();
    }

    public function linkedCourse(): BelongsTo
    {
        return $this->belongsTo(CourseProgramme::class, 'link_course_programme_id');
    }

    /**
     * Carousel order. Ties break on `id` so the sequence is stable — two slides
     * left on the default 0 would otherwise swap places between requests.
     *
     * @param  Builder<HomeBanner>  $query
     * @return Builder<HomeBanner>
     */
    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('id');
    }

    /**
     * Whether this slide is worth sending to a student at all.
     *
     * Artwork is no longer required. A slide with wording renders as a branded
     * card in the app — which is what lets an admin write the copy now and
     * upload the image later, rather than the slide staying invisible until
     * both halves exist. A slide with NEITHER image nor title is genuinely
     * empty, and that one is still dropped.
     */
    public function isPublishable(): bool
    {
        return $this->is_active
            && ($this->image_url !== null || ($this->title !== null && $this->title !== ''));
    }
}
