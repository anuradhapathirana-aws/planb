<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** One checking point under a checklist item. */
class ChecklistItemPoint extends Model
{
    protected $fillable = [
        'checklist_item_id',
        'title',
        'description',
        'sort_order',
    ];

    protected $attributes = [
        'sort_order' => 0,
    ];

    /** @return BelongsTo<ChecklistItem, $this> */
    public function item(): BelongsTo
    {
        return $this->belongsTo(ChecklistItem::class, 'checklist_item_id');
    }

    /**
     * Every student's tick against this point. Constrain it to one student when
     * eager loading, same as `ChecklistItem::completions()`.
     *
     * @return HasMany<StudentChecklistItemPoint, $this>
     */
    public function completions(): HasMany
    {
        return $this->hasMany(StudentChecklistItemPoint::class);
    }
}
