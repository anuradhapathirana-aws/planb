<?php

declare(strict_types=1);

namespace App\Http\Requests\Course;

use App\Enums\CourseCategoryIcon;
use App\Enums\SellingMode;
use App\Models\CourseCategory;
use Illuminate\Database\Query\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Shared rules for adding and editing a category or sub-category.
 *
 * The tree is two levels deep and that is enforced here: a parent must itself
 * be top-level, and a category that already has children cannot be moved under
 * another one.
 */
abstract class CourseCategoryRequest extends FormRequest
{
    /** The category being edited, or null when adding one. */
    abstract protected function editing(): ?CourseCategory;

    public function rules(): array
    {
        $editing = $this->editing();
        $parentId = $this->filled('parent_id') ? (int) $this->input('parent_id') : null;

        return [
            'parent_id' => [
                'nullable',
                'integer',
                // Only a live, top-level category can be a parent — which is what
                // keeps the tree at two levels.
                Rule::exists('course_categories', 'id')
                    ->whereNull('parent_id')
                    ->whereNull('deleted_at'),
                ...($editing ? [Rule::notIn([$editing->id])] : []),
            ],
            'name' => [
                'required',
                'string',
                'max:255',
                // Unique among its siblings only: "UAE" may sit under Migration
                // and under Jobs. Deleted rows do not reserve a name.
                Rule::unique('course_categories', 'name')
                    ->where(fn (Builder $query) => $parentId === null
                        ? $query->whereNull('parent_id')
                        : $query->where('parent_id', $parentId))
                    ->whereNull('deleted_at')
                    ->ignore($editing?->id),
            ],
            // Optional and not unique, like every other Sinhala title.
            'name_si' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
            /*
             * The Home tile's glyph. Optional: left empty, the app guesses one
             * from the category name, so existing categories need no backfill. A
             * sub-category may also upload an image, which wins over this.
             */
            'icon' => ['nullable', Rule::in(CourseCategoryIcon::values())],

            /*
             * How this category's courses are sold. A main category: one by one
             * or as a bundle. A sub-category may also follow its main category
             * (`inherit`) — the only value that makes no sense on a main one.
             */
            'selling_mode' => [
                'sometimes',
                Rule::in($parentId === null ? SellingMode::forMainCategory() : SellingMode::values()),
            ],
        ];
    }

    /** @return list<callable(Validator): void> */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $editing = $this->editing();

                if ($editing === null || ! $this->filled('parent_id')) {
                    return;
                }

                // Moving a parent that has children under another category would
                // make a third level.
                if ($editing->children()->exists()) {
                    $validator->errors()->add(
                        'parent_id',
                        'This category has sub-categories, so it cannot be moved under another one.',
                    );
                }
            },
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Enter a category name.',
            'name.unique' => 'A category with this name already exists here.',
            'parent_id.exists' => 'Pick a main category as the parent.',
            'parent_id.not_in' => 'A category cannot be its own parent.',
            'icon.in' => 'Pick an icon from the list.',
            'selling_mode.in' => 'Pick how this category\'s courses are sold.',
        ];
    }

    public function attributes(): array
    {
        return [
            'parent_id' => 'parent category',
            'name_si' => 'Sinhala category name',
        ];
    }
}
