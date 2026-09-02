<?php

declare(strict_types=1);

namespace App\Services\Checklist;

use App\Enums\ChecklistPhase;
use App\Models\ChecklistItem;
use App\Models\Student;
use App\Models\StudentChecklistItem;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\UniqueConstraintViolationException;

/**
 * The student's side of the arrival checklists: read both phases with this
 * student's ticks attached, and set one step's state.
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
     * else. The student's ticks come back in the same two queries.
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
            ->with(['completions' => fn ($query) => $query->where('student_id', $student->id)])
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
     * Idempotent by design — the client sends the state it wants, not a flip,
     * so a retried request on a flaky connection lands on the same answer. The
     * returned model is attached to `$item` so the caller can serialize both
     * from one object.
     */
    public function setCompletion(
        Student $student,
        ChecklistItem $item,
        bool $completed,
    ): StudentChecklistItem {
        $keys = ['student_id' => $student->id, 'checklist_item_id' => $item->id];
        $values = ['completed_at' => $completed ? now() : null];

        try {
            $progress = StudentChecklistItem::updateOrCreate($keys, $values);
        } catch (UniqueConstraintViolationException) {
            /*
             * Two taps landed at once and both read "no row" before either
             * wrote. The unique index caught the loser; the row exists now, so
             * finish the job rather than 500 on a double tap.
             */
            $progress = StudentChecklistItem::query()->where($keys)->firstOrFail();
            $progress->update($values);
        }

        $item->setRelation('completions', new Collection([$progress]));

        return $progress;
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
            ->with(['completions' => fn ($query) => $query->where('student_id', $student->id)])
            ->forPhase($phase)
            ->get();

        return $this->summarize($items);
    }

    /**
     * @param  Collection<int, ChecklistItem>  $items  with `completions` already scoped to one student
     * @return array{completed: int, total: int, percent_complete: int}
     */
    private function summarize(Collection $items): array
    {
        $total = $items->count();

        $completed = $items
            ->filter(fn (ChecklistItem $item) => $item->completions->first()?->isCompleted() === true)
            ->count();

        return [
            'completed' => $completed,
            'total' => $total,
            // An empty phase is 0%, not a division by zero and not 100% "done".
            'percent_complete' => $total > 0 ? (int) round($completed / $total * 100) : 0,
        ];
    }
}
