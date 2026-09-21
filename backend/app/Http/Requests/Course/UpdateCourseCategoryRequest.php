<?php

declare(strict_types=1);

namespace App\Http\Requests\Course;

use App\Models\CourseCategory;

class UpdateCourseCategoryRequest extends CourseCategoryRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('category'));
    }

    protected function editing(): ?CourseCategory
    {
        /** @var CourseCategory $category */
        $category = $this->route('category');

        return $category;
    }
}
