<?php

declare(strict_types=1);

namespace App\Http\Requests\Course;

use App\Models\CourseCategory;

class StoreCourseCategoryRequest extends CourseCategoryRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', CourseCategory::class);
    }

    protected function editing(): ?CourseCategory
    {
        return null;
    }
}
