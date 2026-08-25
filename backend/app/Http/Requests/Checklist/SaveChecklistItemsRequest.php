<?php

declare(strict_types=1);

namespace App\Http\Requests\Checklist;

use App\Enums\ChecklistPhase;
use App\Models\ChecklistItem;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
        ];
    }

    public function messages(): array
    {
        return [
            'items.max' => 'A checklist can hold at most 200 items.',
            'items.*.id.exists' => 'This item no longer belongs to this checklist. Reload the page and try again.',
            'items.*.title.required' => 'Enter the checklist item.',
            'items.*.description.max' => 'This description is too long.',
        ];
    }

    public function attributes(): array
    {
        return [
            'items.*.title' => 'checklist item',
            'items.*.description' => 'description',
        ];
    }

    private function phase(): ChecklistPhase
    {
        /** @var ChecklistPhase $phase */
        $phase = $this->route('phase');

        return $phase;
    }
}
