<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ChecklistPhase;
use Database\Factories\ChecklistItemFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChecklistItem extends Model
{
    /** @use HasFactory<ChecklistItemFactory> */
    use HasFactory;

    protected $fillable = [
        'phase',
        'title',
        'description',
        'sort_order',
    ];

    /** Mirrors the column default so a freshly created model already reports it. */
    protected $attributes = [
        'sort_order' => 0,
    ];

    protected function casts(): array
    {
        return [
            'phase' => ChecklistPhase::class,
        ];
    }

    /**
     * Every student's tick against this step.
     *
     * Always constrain it to one student when eager loading — an unscoped load
     * on a popular step pulls the whole cohort's rows into memory.
     *
     * @return HasMany<StudentChecklistItem, $this>
     */
    public function completions(): HasMany
    {
        return $this->hasMany(StudentChecklistItem::class);
    }

    /** @param  Builder<self>  $query */
    public function scopeForPhase(Builder $query, ChecklistPhase $phase): Builder
    {
        return $query->where('phase', $phase->value)->orderBy('sort_order')->orderBy('id');
    }
}
