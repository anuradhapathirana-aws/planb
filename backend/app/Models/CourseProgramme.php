<?php

declare(strict_types=1);

namespace App\Models;

use App\Contracts\Purchasable;
use App\Enums\CourseStatus;
use App\Services\Course\CourseProgrammeService;
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

class CourseProgramme extends Model implements HasMedia, Purchasable
{
    /** @use HasFactory<CourseProgrammeFactory> */
    use HasFactory, InteractsWithMedia, SoftDeletes;

    public const THUMBNAIL_COLLECTION = 'thumbnail';

    protected $fillable = [
        'course_category_id',
        'name',
        'description',
        'price_cents',
        'currency',
        'status',
        'sort_order',
    ];

    /**
     * How long a published course counts as "new" on the student app's Home
     * search. A rolling window rather than the calendar month it stands in for:
     * on the 1st, a calendar month would show an empty tab even though
     * something shipped yesterday.
     */
    public const NEW_FOR_DAYS = 30;

    protected function casts(): array
    {
        return [
            'status' => CourseStatus::class,
            'price_cents' => 'integer',
            'published_at' => 'datetime',
        ];
    }

    /**
     * `published_at` is deliberately absent from `$fillable`: only
     * {@see CourseProgrammeService::publish} writes it,
     * so no admin form or mass-assignment can backdate a course into the "New"
     * list.
     */
    public function isNewlyPublished(): bool
    {
        return $this->status === CourseStatus::Published
            && $this->published_at !== null
            && $this->published_at->greaterThanOrEqualTo(now()->subDays(self::NEW_FOR_DAYS));
    }

    /*
     |--------------------------------------------------------------------------
     | Purchasable
     |--------------------------------------------------------------------------
     |
     | Implemented so the order/payment layer can sell a course without knowing
     | what a course is. A premium service will implement the same interface.
     */

    public function purchasableTitle(): string
    {
        return $this->name;
    }

    public function purchasablePriceCents(): int
    {
        return (int) $this->price_cents;
    }

    public function purchasableCurrency(): string
    {
        return $this->currency ?? (string) config('payments.currency');
    }

    /** A draft course is not on sale, whatever its price says. */
    public function isPurchasable(): bool
    {
        return $this->status === CourseStatus::Published;
    }

    public function isFree(): bool
    {
        return $this->purchasablePriceCents() === 0;
    }

    public function enrolments(): HasMany
    {
        return $this->hasMany(Enrolment::class);
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
