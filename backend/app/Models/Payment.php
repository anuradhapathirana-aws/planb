<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use Database\Factories\PaymentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

/**
 * One attempt to pay an order.
 *
 * An order can carry several: a declined card retried, or a bank transfer
 * rejected by an admin and resubmitted (FR-MOB-035). Only one may succeed —
 * `PaymentService` enforces that inside a locked transaction.
 */
class Payment extends Model implements HasMedia
{
    /** @use HasFactory<PaymentFactory> */
    use HasFactory, InteractsWithMedia;

    /** Bank transfer proof (FR-MOB-033): image or PDF. */
    public const RECEIPT_COLLECTION = 'receipt';

    protected $fillable = [
        'order_id',
        'method',
        'gateway',
        'gateway_reference',
        'amount_cents',
        'currency',
        'status',
        'reference_number',
        'gateway_payload',
        'reviewed_by',
        'reviewed_at',
        'review_remark',
        'paid_at',
    ];

    protected $attributes = [
        'status' => PaymentStatus::Pending->value,
    ];

    protected function casts(): array
    {
        return [
            'method' => PaymentMethod::class,
            'status' => PaymentStatus::class,
            'amount_cents' => 'integer',
            'gateway_payload' => 'array',
            'reviewed_at' => 'datetime',
            'paid_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection(self::RECEIPT_COLLECTION)
            ->singleFile()
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'application/pdf']);
    }

    public function getReceiptUrlAttribute(): ?string
    {
        return $this->getFirstMedia(self::RECEIPT_COLLECTION)?->getUrl();
    }

    public function isBankTransfer(): bool
    {
        return $this->method === PaymentMethod::BankTransfer;
    }

    /** A bank transfer sitting in the admin verification queue (FR-ADM-018). */
    public function isAwaitingReview(): bool
    {
        return $this->isBankTransfer() && $this->status === PaymentStatus::Pending;
    }
}
