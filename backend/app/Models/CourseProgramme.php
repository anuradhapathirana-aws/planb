<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CourseStatus;
use Database\Factories\CourseProgrammeFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class CourseProgramme extends Model implements HasMedia
{
    /** @use HasFactory<CourseProgrammeFactory> */
    use HasFactory, InteractsWithMedia, SoftDeletes;

    public const THUMBNAIL_COLLECTION = 'thumbnail';

    protected $fillable = [
        'course_category_id',
        'name',
        'description',
        'status',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'status' => CourseStatus::class,
        ];
    }

    public function registerMediaCollections(): void
    {
        // Course art, shown on the admin list and the student course cards.
        // Public disk on purpose: unlike a lesson file there is nothing to protect.
        $this->addMediaCollection(self::THUMBNAIL_COLLECTION)
            ->singleFile()
            ->acceptsMimeTypes(['image/jpeg', 'image/png']);
    }

    public function getThumbnailUrlAttribute(): ?string
    {
        return $this->getFirstMedia(self::THUMBNAIL_COLLECTION)?->getUrl();
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(CourseCategory::class, 'course_category_id');
    }

    public function topics(): HasMany
    {
        return $this->hasMany(CourseTopic::class)->orderBy('sort_order');
    }

    /** Optional Q&A paper (FR-ADM-008c) — a programme without one shows students nothing. */
    public function paper(): HasOne
    {
        return $this->hasOne(CoursePaper::class);
    }

    /** Powers the list page's video count without loading every topic. */
    public function videos(): HasManyThrough
    {
        return $this->hasManyThrough(CourseVideo::class, CourseTopic::class);
    }
}
