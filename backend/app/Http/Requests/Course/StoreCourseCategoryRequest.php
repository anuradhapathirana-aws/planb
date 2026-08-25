<?php

declare(strict_types=1);

namespace App\Http\Requests\Course;

use App\Models\CourseCategory;
use Illuminate\Foundation\Http\FormRequest;

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
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Enter a category name.',
            'name.unique' => 'A category with this name already exists.',
        ];
    }
}
