<?php

declare(strict_types=1);

namespace App\Http\Requests\Checklist;

use App\Enums\ChecklistPhase;
use App\Models\ChecklistItem;
use App\Models\ChecklistItemPoint;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * One phase's checklist is submitted whole — the admin edits a list, reorders
 * it and saves once, so position in the array *is* the stored `sort_order`.
 *
 * An empty list is valid: "nothing to do before arrival yet" is a real state,
 * unlike a Q&A paper with no questions.
 */
class SaveChecklistItemsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage', ChecklistItem::class);
    }

    public function rules(): array
    {
        return [
            'items' => ['present', 'array', 'max:200'],
            // Scoped to this phase, so an id from the *other* tab is a 422 rather
            // than silently moving that item across.
            'items.*.id' => [
                'nullable',
                'integer',
                Rule::exists('checklist_items', 'id')->where('phase', $this->phase()->value),
            ],
            'items.*.title' => ['required', 'string', 'max:255'],
            // Rich-text HTML, sanitized server-side before storage.
            'items.*.description' => ['nullable', 'string', 'max:20000'],
            // Optional checking points. None means the item is ticked directly.
            'items.*.points' => ['sometimes', 'array', 'max:50'],
            'items.*.points.*.id' => ['nullable', 'integer'],
            'items.*.points.*.title' => ['required', 'string', 'max:255'],
            // Rich-text HTML, sanitized server-side before storage.
            'items.*.points.*.description' => ['nullable', 'string', 'max:5000'],
        ];
    }

    /**
     * A saved point id must belong to the item it is submitted under — the array
     * rules can't express "the sibling `id`'s child". Without this, a stale or
     * forged id would move another item's point (and every student's tick on it)
     * across. A new item has no saved points, so any point id under it fails.
     *
     * @return array<int, \Closure(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $items = $this->input('items');

                if (! is_array($items)) {
                    return;
                }

                foreach ($items as $index => $item) {
                    $pointIds = collect(is_array($item['points'] ?? null) ? $item['points'] : [])
                        ->map(fn ($point) => is_array($point) ? ($point['id'] ?? null) : null)
                        ->filter(fn ($id) => is_int($id));

                    if ($pointIds->isEmpty()) {
                        continue;
                    }

                    $owned = is_int($item['id'] ?? null)
                        ? ChecklistItemPoint::query()
                            ->where('checklist_item_id', $item['id'])
                            ->whereIn('id', $pointIds)
                            ->pluck('id')
                        : collect();

                    foreach ($item['points'] as $pointIndex => $point) {
                        $id = $point['id'] ?? null;

                        if (is_int($id) && ! $owned->contains($id)) {
                            $validator->errors()->add(
                                "items.{$index}.points.{$pointIndex}.id",
                                'This checking point no longer belongs to this item. Reload the page and try again.',
                            );
                        }
                    }
                }
            },
        ];
    }

    public function messages(): array
    {
        return [
            'items.max' => 'A checklist can hold at most 200 items.',
            'items.*.id.exists' => 'This item no longer belongs to this checklist. Reload the page and try again.',
            'items.*.title.required' => 'Enter the checklist item.',
            'items.*.description.max' => 'This description is too long.',
            'items.*.points.max' => 'An item can hold at most 50 checking points.',
            'items.*.points.*.title.required' => 'Enter the checking point.',
            'items.*.points.*.description.max' => 'This description is too long.',
        ];
    }

    public function attributes(): array
    {
        return [
            'items.*.title' => 'checklist item',
            'items.*.description' => 'description',
            'items.*.points.*.title' => 'checking point',
        ];
    }

    private function phase(): ChecklistPhase
    {
        /** @var ChecklistPhase $phase */
        $phase = $this->route('phase');

        return $phase;
    }
}
