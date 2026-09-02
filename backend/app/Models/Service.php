<?php

declare(strict_types=1);

namespace App\Models;

use App\Contracts\Purchasable;
use App\Enums\ServiceStatus;
use Database\Factories\ServiceFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

/**
 * A premium service a student pays for — CV writing, visa consultation and the
 * like.
 *
 * The second thing implementing {@see Purchasable}, and the reason that seam
 * exists: the order, payment, webhook and receipt layers take this without a
 * single change. What is new is fulfilment — a course grants an `Enrolment`,
 * whereas this produces a {@see ServicePurchase} somebody has to work through.
 */
class Service extends Model implements HasMedia, Purchasable
{
    /** @use HasFactory<ServiceFactory> */
    use HasFactory, InteractsWithMedia, SoftDeletes;

    public const THUMBNAIL_COLLECTION = 'thumbnail';

    protected $fillable = [
        'name',
        'summary',
        'description',
        'price_cents',
        'currency',
        'delivery_time',
        'status',
        'sort_order',
    ];

    protected $attributes = [
        'status' => ServiceStatus::Draft->value,
    ];

    protected function casts(): array
    {
        return [
            'status' => ServiceStatus::class,
            'price_cents' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    /**
     * What a student is allowed to see. Draft and soft-deleted services are not
     * merely hidden in the UI — student routes resolve through this scope, so
     * they 404 (backend/CLAUDE.md §2).
     *
     * @param  Builder<self>  $query
     */
    public function scopePublished(Builder $query): void
    {
        $query->where('status', ServiceStatus::Published);
    }

    /*
     |--------------------------------------------------------------------------
     | Purchasable
     |--------------------------------------------------------------------------
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

    /**
     * A draft service is not on sale whatever its price says, and neither is one
     * priced at zero — `OrderService` refuses to open an order for a free item,
     * so a zero-priced service would be unbuyable in a confusing way rather than
     * free.
     */
    public function isPurchasable(): bool
    {
        return $this->status === ServiceStatus::Published
            && $this->deleted_at === null
            && $this->purchasablePriceCents() > 0;
    }

    public function purchases(): HasMany
    {
        return $this->hasMany(ServicePurchase::class);
    }

    public function registerMediaCollections(): void
    {
        // Public disk: catalogue art, with nothing to protect.
        $this->addMediaCollection(self::THUMBNAIL_COLLECTION)
            ->singleFile()
            ->acceptsMimeTypes(['image/jpeg', 'image/png']);
    }

    public function getThumbnailUrlAttribute(): ?string
    {
        return $this->getFirstMedia(self::THUMBNAIL_COLLECTION)?->getUrl();
    }
}
