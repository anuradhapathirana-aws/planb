<?php

declare(strict_types=1);

namespace App\Http\Requests\Course;

use App\Models\CourseProgramme;
use Illuminate\Validation\Rule;

class StoreCourseProgrammeRequest extends CourseProgrammeRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', CourseProgramme::class);
    }

    protected function programmeRules(): array
    {
        return [
            'course_category_id' => ['required', 'integer', 'exists:course_categories,id'],
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('course_programmes', 'name')
                    ->where('course_category_id', $this->input('course_category_id'))
                    ->whereNull('deleted_at'),
            ],
        ];
    }

    /** Nothing exists yet, so any client-sent row id is ignored rather than trusted. */
    protected function topicIdRules(): array
    {
        return ['nullable', 'integer'];
    }

    protected function videoIdRules(): array
    {
        return ['nullable', 'integer'];
    }
}
