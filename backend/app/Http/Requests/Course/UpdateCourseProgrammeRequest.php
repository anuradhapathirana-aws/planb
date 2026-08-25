<?php

declare(strict_types=1);

namespace App\Http\Requests\Course;

use App\Models\CourseProgramme;
use Illuminate\Validation\Rule;

class UpdateCourseProgrammeRequest extends CourseProgrammeRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->programme());
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
                    ->whereNull('deleted_at')
                    ->ignore($this->programme()),
            ],
        ];
    }

    /**
     * An `id` here means "update this existing row". Scoping the check to this
     * programme stops a submission from reaching into a different course, which
     * the service would otherwise absorb by silently creating a duplicate row.
     */
    protected function topicIdRules(): array
    {
        return [
            'nullable',
            'integer',
            Rule::exists('course_topics', 'id')->where('course_programme_id', $this->programme()->id),
        ];
    }

    protected function videoIdRules(): array
    {
        return [
            'nullable',
            'integer',
            Rule::exists('course_videos', 'id')
                ->whereIn('course_topic_id', $this->programme()->topics()->pluck('id')),
        ];
    }

    private function programme(): CourseProgramme
    {
        /** @var CourseProgramme $programme */
        $programme = $this->route('programme');

        return $programme;
    }
}
