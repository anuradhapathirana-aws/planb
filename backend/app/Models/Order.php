<?php

declare(strict_types=1);

namespace App\Models;

use App\Contracts\Purchasable;
use App\Enums\OrderStatus;
use App\Services\Course\CourseBundleService;
use Database\Factories\OrderFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * One purchase of one purchasable.
 *
 * One purchasable per order. A course bundle is still one purchasable (its main
 * category), and the courses it covers are frozen in `order_items` — see
 * {@see CourseBundleService}.
 */
class Order extends Model
{
    /** @use HasFactory<OrderFactory> */
    use HasFactory;

    protected $fillable = [
        'order_number',
        'student_id',
        'purchasable_type',
        'purchasable_id',
        'title_snapshot',
        'amount_cents',
        'currency',
        'status',
        'paid_at',
        'cancelled_at',
    ];

    protected $attributes = [
        'status' => OrderStatus::Pending->value,
    ];

    protected function casts(): array
    {
        return [
            'status' => OrderStatus::class,
            'amount_cents' => 'integer',
            'paid_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /** @return MorphTo<Model&Purchasable, $this> */
    public function purchasable(): MorphTo
    {
        return $this->morphTo();
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class)->latest('id');
    }

    public function enrolment(): HasMany
    {
        return $this->hasMany(Enrolment::class);
    }

    /** The courses a bundle order is for, frozen when it was opened. Empty for any other order. */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function isPaid(): bool
    {
        return $this->status === OrderStatus::Paid;
    }

    /** A settled order is finished: no further payment may be attempted against it. */
    public function isSettled(): bool
    {
        return in_array($this->status, [OrderStatus::Paid, OrderStatus::Cancelled, OrderStatus::Refunded], true);
    }
}
