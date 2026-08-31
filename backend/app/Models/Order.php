<?php

declare(strict_types=1);

namespace App\Models;

use App\Contracts\Purchasable;
use App\Enums\OrderStatus;
use Database\Factories\OrderFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * One purchase of one purchasable.
 *
 * Deliberately single-item: a student enrols in one course at a time, and a
 * premium service is bought on its own. If bundles ever arrive, the extension
 * point is an `order_items` table — not widening this row.
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
