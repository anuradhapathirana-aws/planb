<?php

declare(strict_types=1);

namespace App\Models;

use App\Contracts\Purchasable;
use App\Enums\CourseCategoryIcon;
use App\Enums\CourseStatus;
use App\Enums\SellingMode;
use App\Models\Concerns\HasTranslatedText;
use App\Services\Course\CourseBundleService;
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
 *
 * A category is also what a course bundle is sold as ({@see Purchasable}): in
 * `bundle` selling mode its paid courses are bought together, never one by one
 * — see {@see bundleOwner()} for which bundle sells which course. What a given student pays is worked out
 * per student by {@see CourseBundleService}.
 */
class CourseCategory extends Model implements HasMedia, Purchasable
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
        'selling_mode',
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
        'selling_mode' => 'single',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'parent_id' => 'integer',
            'selling_mode' => SellingMode::class,
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

    /*
     |--------------------------------------------------------------------------
     | Selling — single courses or one bundle
     |--------------------------------------------------------------------------
     */

    /** The main category: itself, or its parent. */
    public function root(): self
    {
        return $this->parent ?? $this;
    }

    /**
     * The category whose bundle sells the courses sitting directly in this one,
     * or null when they are sold one by one. The single place the selling rule
     * is resolved:
     *
     * - a sub-category that is its own bundle → itself;
     * - a sub-category that follows its main category → the main category, if
     *   that sells as a bundle;
     * - a main category → itself, if it sells as a bundle.
     */
    public function bundleOwner(): ?self
    {
        if ($this->parent_id !== null && $this->selling_mode !== SellingMode::Inherit) {
            return $this->selling_mode === SellingMode::Bundle ? $this : null;
        }

        $main = $this->root();

        return $main->selling_mode === SellingMode::Bundle ? $main : null;
    }

    /** Whether the courses sitting directly in this category are sold only as a bundle. */
    public function sellsAsBundle(): bool
    {
        return $this->bundleOwner() !== null;
    }

    /**
     * The categories whose courses make up THIS category's bundle: itself, and —
     * for a main category — every sub-category that follows it. A sub-category
     * with a selling mode of its own is never part of its main category's bundle,
     * so no course is ever in two bundles.
     *
     * @return list<int>
     */
    public function bundleCategoryIds(): array
    {
        if ($this->parent_id !== null) {
            return [$this->id];
        }

        return [
            $this->id,
            ...$this->children()
                ->where('selling_mode', SellingMode::Inherit)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all(),
        ];
    }

    /**
     * English, naming the main category for a sub-category's bundle — "UAE" on
     * its own is ambiguous on a receipt once two main categories have one. How
     * many courses it covered lives in `order_items`.
     */
    public function purchasableTitle(): string
    {
        $name = $this->parent ? $this->parent->name.' › '.$this->name : $this->name;

        return $name.' — course bundle';
    }

    /**
     * The bundle's list price: every published course in it. What a particular
     * student pays leaves out what they already own — that figure comes from
     * `CourseBundleService::quote()`, never from here.
     */
    public function purchasablePriceCents(): int
    {
        return (int) CourseProgramme::query()
            ->whereIn('course_category_id', $this->bundleCategoryIds())
            ->where('status', CourseStatus::Published)
            ->sum('price_cents');
    }

    public function purchasableCurrency(): string
    {
        return (string) config('payments.currency');
    }

    /** On sale when this category IS a bundle (not just part of one) and students can see it. */
    public function isPurchasable(): bool
    {
        return $this->bundleOwner()?->is($this) === true && $this->isVisibleToStudents();
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
