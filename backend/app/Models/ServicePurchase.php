<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ServicePurchaseStatus;
use Database\Factories\ServicePurchaseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One paid service, and how far Plan B has got with delivering it.
 *
 * The service equivalent of `Enrolment`, and concrete for the same reason: an
 * enrolment is access that simply exists, whereas this is a piece of work with a
 * lifecycle. Written only by `ServicePurchaseService`.
 */
class ServicePurchase extends Model
{
    /** @use HasFactory<ServicePurchaseFactory> */
    use HasFactory;

    /**
     * `status`, `handled_by` and the timestamps below are deliberately absent:
     * only `ServicePurchaseService::advance()` moves a purchase along, so no
     * request payload can mark work complete by mass assignment.
     */
    protected $fillable = [
        'student_id',
        'service_id',
        'order_id',
        'title_snapshot',
        'purchased_at',
    ];

    protected $attributes = [
        'status' => ServicePurchaseStatus::Pending->value,
    ];

    protected function casts(): array
    {
        return [
            'status' => ServicePurchaseStatus::class,
            'purchased_at' => 'datetime',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function handler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by');
    }

    public function isOpen(): bool
    {
        return $this->status->isOpen();
    }
}
