<?php

declare(strict_types=1);

namespace App\Models;

use App\Services\Checklist\StudentChecklistService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One student's tick against one checking point. Written only by
 * {@see StudentChecklistService}; a null `completed_at` is an un-ticked point.
 */
class StudentChecklistItemPoint extends Model
{
    protected $fillable = [
        'student_id',
        'checklist_item_point_id',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'completed_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function point(): BelongsTo
    {
        return $this->belongsTo(ChecklistItemPoint::class, 'checklist_item_point_id');
    }
}
