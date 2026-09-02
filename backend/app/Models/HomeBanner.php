<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\HomeBannerLink;
use App\Services\Settings\HomeBannerService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

/**
 * The student app's Home hero banner. A singleton — see the migration, and
 * {@see HomeBannerService} which is the only thing that reads or writes it.
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
    ];

    protected $attributes = [
        'link_type' => HomeBannerLink::None->value,
        'is_active' => false,
    ];

    protected function casts(): array
    {
        return [
            'link_type' => HomeBannerLink::class,
            'is_active' => 'boolean',
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
     * Whether this is worth sending to a student at all.
     *
     * An active banner with no image is not a banner — the app would render an
     * empty box. The endpoint returns null instead and the app falls back to
     * its own branded hero.
     */
    public function isPublishable(): bool
    {
        return $this->is_active && $this->image_url !== null;
    }
}
