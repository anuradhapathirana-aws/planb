<?php

declare(strict_types=1);

namespace App\Http\Requests\Course;

use App\Enums\CourseCategoryIcon;
use App\Models\CourseCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCourseCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', CourseCategory::class);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', 'unique:course_categories,name'],
            'description' => ['nullable', 'string', 'max:500'],
            /*
             * The Home tile's glyph. Optional: left empty, the app guesses one
             * from the category name, so existing categories need no backfill.
             */
            'icon' => ['nullable', Rule::in(CourseCategoryIcon::values())],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Enter a category name.',
            'name.unique' => 'A category with this name already exists.',
            'icon.in' => 'Pick an icon from the list.',
        ];
    }
}
