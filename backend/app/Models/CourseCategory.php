<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CourseCategoryIcon;
use App\Models\Concerns\HasTranslatedText;
use Database\Factories\CourseCategoryFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

/**
 * A course category, or a sub-category of one — two levels, never more.
 *
 * A course may sit on either level. A parent does not have to have children.
 */
class CourseCategory extends Model implements HasMedia
{
    /** @use HasFactory<CourseCategoryFactory> */
    use HasFactory, HasTranslatedText, InteractsWithMedia, SoftDeletes;

    /** A sub-category's uploaded icon. Parents use the fixed `icon` list only. */
    public const ICON_IMAGE_COLLECTION = 'icon_image';

    protected $fillable = [
        'parent_id',
        'name',
        'name_si',
        'description',
        'icon',
        'is_active',
        'sort_order',
    ];

    /**
     * Mirrors the column defaults so a freshly created model already reports
     * them, instead of returning null until it is reloaded from the database.
     */
    protected $attributes = [
        'is_active' => true,
        'sort_order' => 0,
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'parent_id' => 'integer',
            // Nullable, so `?CourseCategoryIcon` — an unset icon stays unset
            // rather than becoming `Other`, which is what lets the app tell "no
            // choice yet" (guess from the name) from "neutral on purpose".
            'icon' => CourseCategoryIcon::class,
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('sort_order')->orderBy('name');
    }

    public function programmes(): HasMany
    {
        return $this->hasMany(CourseProgramme::class);
    }

    public function isSubCategory(): bool
    {
        return $this->parent_id !== null;
    }

    /**
     * Categories a student may browse: active, under an active parent (or none).
     *
     * Deactivating a parent hides its whole branch without touching any child's
     * own switch, so reactivating it restores exactly what was there.
     *
     * @param  Builder<CourseCategory>  $query
     */
    public function scopeVisibleToStudents(Builder $query): void
    {
        $query->where('is_active', true)
            ->where(fn (Builder $inner) => $inner
                ->whereNull('parent_id')
                ->orWhereHas('parent', fn (Builder $parent) => $parent->where('is_active', true)));
    }

    /** Instance twin of {@see scopeVisibleToStudents}, for one already-loaded row. */
    public function isVisibleToStudents(): bool
    {
        if (! $this->is_active) {
            return false;
        }

        return $this->parent_id === null || (bool) $this->parent?->is_active;
    }

    /**
     * This category plus, for a parent, every sub-category under it — what
     * "show me Migration" means when filtering courses.
     *
     * @return list<int>
     */
    public function selfAndChildIds(): array
    {
        $ids = [$this->id];

        if ($this->parent_id === null) {
            array_push($ids, ...$this->children()->pluck('id')->map(fn ($id) => (int) $id)->all());
        }

        return $ids;
    }

    public function registerMediaCollections(): void
    {
        // Public disk, like course art: an icon has nothing to protect.
        $this->addMediaCollection(self::ICON_IMAGE_COLLECTION)
            ->singleFile()
            ->acceptsMimeTypes(['image/png']);
    }

    public function getIconImageUrlAttribute(): ?string
    {
        return $this->getFirstMedia(self::ICON_IMAGE_COLLECTION)?->getUrl();
    }
}
