<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A gateway callback we have already seen.
 *
 * Gateways retry until they get a 200, so the same event WILL arrive more than
 * once. The unique (gateway, event_id) index is what stops a replay enrolling a
 * student twice or counting the same revenue twice.
 */
class PaymentWebhookEvent extends Model
{
    protected $fillable = [
        'gateway',
        'event_id',
        'payload',
        'processed_at',
        'outcome',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'processed_at' => 'datetime',
        ];
    }
}
