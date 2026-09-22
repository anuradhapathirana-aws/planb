<?php

declare(strict_types=1);

namespace App\Http\Requests\Course;

use App\Models\CourseCategory;
use App\Models\CourseProgramme;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * The course order for one category, as the full list of its course ids.
 * Position in the array is the order — there is no number to type.
 */
class ReorderCategoryCoursesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', CourseProgramme::class);
    }

    public function rules(): array
    {
        return [
            'programme_ids' => ['required', 'array', 'min:1'],
            'programme_ids.*' => [
                'required',
                'integer',
                'distinct',
                Rule::exists('course_programmes', 'id')
                    ->where('course_category_id', $this->category()->id)
                    ->whereNull('deleted_at'),
            ],
        ];
    }

    /**
     * The whole list or nothing. A partial list would leave the missing courses
     * on their old numbers, colliding with the new ones — and a stale screen
     * (a course added in another tab) must be told to reload, not half-saved.
     *
     * @return list<callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $expected = $this->category()->programmes()->count();

                if (count((array) $this->input('programme_ids')) !== $expected) {
                    $validator->errors()->add(
                        'programme_ids',
                        'The course list has changed since you opened it. Reload and try again.',
                    );
                }
            },
        ];
    }

    public function messages(): array
    {
        return [
            'programme_ids.required' => 'This category has no courses to arrange.',
            'programme_ids.*.distinct' => 'A course appears twice in the list.',
            'programme_ids.*.exists' => 'The course list has changed since you opened it. Reload and try again.',
        ];
    }

    /** @return list<int> */
    public function programmeIds(): array
    {
        return array_map('intval', $this->validated('programme_ids'));
    }

    private function category(): CourseCategory
    {
        /** @var CourseCategory $category */
        $category = $this->route('category');

        return $category;
    }
}
