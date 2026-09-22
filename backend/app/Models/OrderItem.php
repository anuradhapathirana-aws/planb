<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One course inside a bundle order, with the price and title it had when the
 * order was opened. Settlement enrols exactly these rows, so what a student
 * receives can never drift from what they were charged.
 */
class OrderItem extends Model
{
    protected $fillable = [
        'order_id',
        'course_programme_id',
        'price_cents',
        'title_snapshot',
    ];

    protected function casts(): array
    {
        return [
            'price_cents' => 'integer',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function programme(): BelongsTo
    {
        return $this->belongsTo(CourseProgramme::class, 'course_programme_id')->withTrashed();
    }
}
