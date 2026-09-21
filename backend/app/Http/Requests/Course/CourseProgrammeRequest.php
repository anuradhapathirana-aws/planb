<?php

declare(strict_types=1);

namespace App\Http\Requests\Course;

use App\Enums\CourseStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Shared rules for the Course form, which saves the whole
 * programme → topics → videos tree in one submission.
 *
 * Video *files* are not part of this payload — the client uploads each one
 * separately against the saved video IDs, so this request only ever validates
 * lesson metadata.
 */
abstract class CourseProgrammeRequest extends FormRequest
{
    public function rules(): array
    {
        return array_merge($this->programmeRules(), [
            /*
             * Sinhala titles are optional everywhere and carry no uniqueness
             * rule. Optional because the catalogue is translated course by
             * course, and a blank one falls back to English at read time; not
             * unique because uniqueness is enforced on the English name, which
             * is the record — a second rule here would block saving an
             * untranslated course alongside an untranslated one.
             */
            'name_si' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],

            /*
             * Smallest currency unit, integer (CLAUDE.md §4.11). 0 means free -
             * the student is enrolled on first open with no order. Capped well
             * above any realistic course fee to catch a stray extra zero.
             */
            'price_cents' => ['nullable', 'integer', 'min:0', 'max:100000000'],
            'currency' => ['nullable', 'string', 'size:3'],
            'status' => ['nullable', Rule::in(CourseStatus::values())],

            // FR-MOB-017: a programme has to contain at least one topic.
            'topics' => ['required', 'array', 'min:1'],
            'topics.*.id' => $this->topicIdRules(),
            'topics.*.title' => ['required', 'string', 'max:255'],
            'topics.*.title_si' => ['nullable', 'string', 'max:255'],
            // Sanitized server-side before storage; the cap is generous because
            // the value is rich-text HTML, not the plain text the admin typed.
            'topics.*.description' => ['nullable', 'string', 'max:20000'],

            'topics.*.videos' => ['nullable', 'array'],
            'topics.*.videos.*.id' => $this->videoIdRules(),
            'topics.*.videos.*.title' => ['required', 'string', 'max:255'],
            'topics.*.videos.*.title_si' => ['nullable', 'string', 'max:255'],
            'topics.*.videos.*.duration_seconds' => [
                'nullable', 'integer', 'min:0', 'max:'.config('courses.max_video_duration_seconds'),
            ],
        ]);
    }

    /** @return array<string, mixed> */
    abstract protected function programmeRules(): array;

    /**
     * A course sits on a parent category or on a sub-category — either is valid,
     * so this only asks that the category exists and has not been deleted.
     *
     * @return list<mixed>
     */
    protected function categoryRules(): array
    {
        return [
            'required',
            'integer',
            Rule::exists('course_categories', 'id')->whereNull('deleted_at'),
        ];
    }

    /** @return list<mixed> */
    abstract protected function topicIdRules(): array;

    /** @return list<mixed> */
    abstract protected function videoIdRules(): array;

    public function messages(): array
    {
        return [
            'course_category_id.required' => 'Select a course category.',
            'price_cents.min' => 'A price cannot be negative.',
            'price_cents.integer' => 'Enter the price as a number.',
            'name.required' => 'Enter a course programme name.',
            'name.unique' => 'This category already has a programme with that name.',
            'topics.required' => 'Add at least one topic.',
            'topics.min' => 'Add at least one topic.',
            'topics.*.title.required' => 'Enter a topic name.',
            'topics.*.videos.*.title.required' => 'Enter a video title.',
        ];
    }

    public function attributes(): array
    {
        return [
            'course_category_id' => 'course category',
            'price_cents' => 'price',
            'name_si' => 'Sinhala course programme name',
            'topics.*.title' => 'topic name',
            'topics.*.title_si' => 'Sinhala topic name',
            'topics.*.description' => 'topic description',
            'topics.*.videos.*.title' => 'video title',
            'topics.*.videos.*.title_si' => 'Sinhala video title',
            'topics.*.videos.*.duration_seconds' => 'video duration',
        ];
    }
}
