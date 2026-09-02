<?php

declare(strict_types=1);

namespace App\Models;

use App\Services\Checklist\StudentChecklistService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One student's tick against one checklist step.
 *
 * Written only by {@see StudentChecklistService}. A null `completed_at` is an
 * un-ticked step whose row survives — see the migration for why.
 */
class StudentChecklistItem extends Model
{
    protected $fillable = [
        'student_id',
        'checklist_item_id',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'completed_at' => 'datetime',
        ];
    }

    public function isCompleted(): bool
    {
        return $this->completed_at !== null;
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(ChecklistItem::class, 'checklist_item_id');
    }
}
