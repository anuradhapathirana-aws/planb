<?php

declare(strict_types=1);

namespace App\Services\Checklist;

use App\Enums\ChecklistPhase;
use App\Models\ChecklistItem;
use App\Models\ChecklistItemPoint;
use App\Models\Student;
use App\Models\StudentChecklistItem;
use App\Models\StudentChecklistItemPoint;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\UniqueConstraintViolationException;

/**
 * The student's side of the arrival checklists: read both phases with this
 * student's ticks attached, and set a step's or a checking point's state.
 *
 * Whether a step is done is decided in one place, `ChecklistItem::completedAt()`
 * — a step with checking points is done when all of them are ticked.
 *
 * The admin's authoring side is {@see ChecklistItemService}; the two never
 * touch the same rows.
 */
class StudentChecklistService
{
    /**
     * Both phases, in enum order, each with its items in `sort_order` and this
     * student's progress attached.
     *
     * Deliberately one response rather than one request per phase: a checklist
     * is a few dozen short rows, and the app renders the phases as two tabs —
     * a second round trip would buy a spinner on every tab switch and nothing
     * else.
     *
     * @return list<array{
     *     phase: ChecklistPhase,
     *     items: Collection<int, ChecklistItem>,
     *     progress: array{completed: int, total: int, percent_complete: int},
     * }>
     */
    public function overviewFor(Student $student): array
    {
        $items = ChecklistItem::query()
            ->with($this->progressRelations($student))
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->groupBy(fn (ChecklistItem $item) => $item->phase->value);

        return array_map(function (ChecklistPhase $phase) use ($items): array {
            /** @var Collection<int, ChecklistItem> $phaseItems */
            $phaseItems = $items->get($phase->value) ?? new Collection;

            return [
                'phase' => $phase,
                'items' => $phaseItems,
                'progress' => $this->summarize($phaseItems),
            ];
        }, ChecklistPhase::cases());
    }

    /**
     * Tick a step on or off.
     *
     * A step with checking points has no tick of its own, so this ticks (or
     * clears) every point instead — one tap to say "I've done all of it". That
     * also keeps an app build that predates checking points working unchanged.
     *
     * Idempotent by design — the client sends the state it wants, not a flip,
     * so a retried request on a flaky connection lands on the same answer.
     * `$item` comes back with this student's progress loaded, ready to serialize.
     */
    public function setCompletion(Student $student, ChecklistItem $item, bool $completed): ChecklistItem
    {
        $pointIds = $item->points()->pluck('id');

        if ($pointIds->isEmpty()) {
            $this->setTick(
                StudentChecklistItem::class,
                ['student_id' => $student->id, 'checklist_item_id' => $item->id],
                $completed,
            );
        } else {
            foreach ($pointIds as $pointId) {
                $this->setTick(
                    StudentChecklistItemPoint::class,
                    ['student_id' => $student->id, 'checklist_item_point_id' => $pointId],
                    $completed,
                );
            }
        }

        return $item->load($this->progressRelations($student));
    }

    /**
     * Tick one checking point on or off. Answers with the point's parent step,
     * because ticking the last point is what finishes the step.
     */
    public function setPointCompletion(
        Student $student,
        ChecklistItemPoint $point,
        bool $completed,
    ): ChecklistItem {
        $this->setTick(
            StudentChecklistItemPoint::class,
            ['student_id' => $student->id, 'checklist_item_point_id' => $point->id],
            $completed,
        );

        return $point->item->load($this->progressRelations($student));
    }

    /**
     * This student's progress through one phase, recomputed from the database
     * rather than adjusted client-side — the ring on the app is only ever as
     * honest as the number it is given.
     *
     * @return array{completed: int, total: int, percent_complete: int}
     */
    public function progressFor(Student $student, ChecklistPhase $phase): array
    {
        $items = ChecklistItem::query()
            ->with($this->progressRelations($student))
            ->forPhase($phase)
            ->get();

        return $this->summarize($items);
    }

    /**
     * The eager loads `ChecklistItem::completedAt()` needs, every tick scoped to
     * one student — an unscoped load pulls the whole cohort's rows into memory.
     *
     * @return array<string, \Closure>
     */
    private function progressRelations(Student $student): array
    {
        $mine = fn ($query) => $query->where('student_id', $student->id);

        return [
            'completions' => $mine,
            'points.completions' => $mine,
        ];
    }

    /**
     * Upsert one tick row. The row is kept on an untick (`completed_at` back to
     * null) — see the migrations for why.
     *
     * @param  class-string<StudentChecklistItem|StudentChecklistItemPoint>  $model
     * @param  array<string, int>  $keys
     */
    private function setTick(string $model, array $keys, bool $completed): void
    {
        $values = ['completed_at' => $completed ? now() : null];

        try {
            $model::updateOrCreate($keys, $values);
        } catch (UniqueConstraintViolationException) {
            /*
             * Two taps landed at once and both read "no row" before either
             * wrote. The unique index caught the loser; the row exists now, so
             * finish the job rather than 500 on a double tap.
             */
            $model::query()->where($keys)->firstOrFail()->update($values);
        }
    }

    /**
     * @param  Collection<int, ChecklistItem>  $items  with progress loaded via `progressRelations()`
     * @return array{completed: int, total: int, percent_complete: int}
     */
    private function summarize(Collection $items): array
    {
        $total = $items->count();

        $completed = $items
            ->filter(fn (ChecklistItem $item) => $item->completedAt() !== null)
            ->count();

        return [
            'completed' => $completed,
            'total' => $total,
            // An empty phase is 0%, not a division by zero and not 100% "done".
            'percent_complete' => $total > 0 ? (int) round($completed / $total * 100) : 0,
        ];
    }
}
