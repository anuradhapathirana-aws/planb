<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ChecklistPhase;
use Carbon\CarbonInterface;
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

    /**
     * The optional checking points under this step, in order.
     *
     * @return HasMany<ChecklistItemPoint, $this>
     */
    public function points(): HasMany
    {
        return $this->hasMany(ChecklistItemPoint::class)->orderBy('sort_order')->orderBy('id');
    }

    /**
     * When one student finished this step, or null if they haven't.
     *
     * The single rule for "is this item done", so the overview, the progress
     * count and the resource can never disagree. A step with points is done
     * once every point is ticked — its own tick row is ignored, which is what
     * lets an admin add a point to a finished step and have it reopen. A step
     * without points is its own tick.
     *
     * Needs `completions` and `points.completions` loaded and scoped to that
     * one student; `StudentChecklistService` is the only caller that builds it.
     */
    public function completedAt(): ?CarbonInterface
    {
        if ($this->points->isEmpty()) {
            return $this->completions->first()?->completed_at;
        }

        $ticks = $this->points->map(
            fn (ChecklistItemPoint $point) => $point->completions->first()?->completed_at,
        );

        // Done on the day the last point was ticked.
        return $ticks->contains(null) ? null : $ticks->max();
    }

    /** @param  Builder<self>  $query */
    public function scopeForPhase(Builder $query, ChecklistPhase $phase): Builder
    {
        return $query->where('phase', $phase->value)->orderBy('sort_order')->orderBy('id');
    }
}
