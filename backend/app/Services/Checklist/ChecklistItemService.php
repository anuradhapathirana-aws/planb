<?php

declare(strict_types=1);

namespace App\Services\Checklist;

use App\Enums\ChecklistPhase;
use App\Models\ChecklistItem;
use App\Support\HtmlSanitizer;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class ChecklistItemService
{
    /** @return Collection<int, ChecklistItem> */
    public function listFor(ChecklistPhase $phase): Collection
    {
        return ChecklistItem::query()->forPhase($phase)->get();
    }

    /**
     * Replaces one phase's checklist with what the admin submitted, in a single
     * transaction — a half-saved checklist would show students a list that
     * doesn't match the order or wording the admin signed off on.
     *
     * Rows carrying an `id` are updated in place, rows without one are created,
     * and anything dropped from the list is deleted. Position in the array is
     * the `sort_order`.
     *
     * @param  list<array{id?: int|null, title: string, description?: string|null}>  $items
     * @return Collection<int, ChecklistItem>
     */
    public function sync(ChecklistPhase $phase, array $items): Collection
    {
        DB::transaction(function () use ($phase, $items): void {
            $keptIds = [];

            foreach ($items as $position => $item) {
                $attributes = [
                    'phase' => $phase->value,
                    'title' => $item['title'],
                    'description' => HtmlSanitizer::clean($item['description'] ?? null),
                    'sort_order' => $position,
                ];

                $model = isset($item['id'])
                    ? ChecklistItem::query()->forPhase($phase)->whereKey($item['id'])->first()
                    : null;

                if ($model === null) {
                    $model = ChecklistItem::create($attributes);
                } else {
                    $model->update($attributes);
                }

                $keptIds[] = $model->id;
            }

            ChecklistItem::query()
                ->where('phase', $phase->value)
                ->when($keptIds !== [], fn ($query) => $query->whereNotIn('id', $keptIds))
                ->delete();
        });

        return $this->listFor($phase);
    }
}
