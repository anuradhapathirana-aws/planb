<?php

declare(strict_types=1);

namespace App\Http\Requests\Course;

use App\Enums\QuestionType;
use App\Models\CourseProgramme;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * The Q&A paper builder submits the whole paper — settings, questions and each
 * question's options — in one request, the same shape the Course form uses for
 * its topic tree.
 */
class SaveCoursePaperRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->programme());
    }

    public function rules(): array
    {
        $paperId = $this->programme()->paper?->id;

        return [
            'title' => ['required', 'string', 'max:255'],
            // Rich-text HTML, sanitized server-side before storage.
            'instructions' => ['nullable', 'string', 'max:20000'],
            'pass_mark' => ['nullable', 'integer', 'min:1', 'max:100'],
            // Null means unlimited retries (FR-MOB-024).
            'max_attempts' => ['nullable', 'integer', 'min:1', 'max:100'],
            'requires_all_videos_watched' => ['nullable', 'boolean'],

            // A paper with no questions is meaningless — delete the paper instead.
            'questions' => ['required', 'array', 'min:1'],
            'questions.*.id' => [
                'nullable',
                'integer',
                Rule::exists('course_questions', 'id')->where('course_paper_id', $paperId),
            ],
            'questions.*.text' => ['required', 'string', 'max:1000'],
            'questions.*.type' => ['required', Rule::in(QuestionType::values())],

            'questions.*.options' => ['required', 'array', 'min:2', 'max:6'],
            'questions.*.options.*.id' => ['nullable', 'integer', 'exists:course_question_options,id'],
            'questions.*.options.*.text' => ['required', 'string', 'max:500'],
            'questions.*.options.*.is_correct' => ['required', 'boolean'],
        ];
    }

    /**
     * Rules the array syntax can't express: every question needs exactly one
     * correct answer, and a Yes/No question needs exactly two options. Without
     * these a paper could be saved that is impossible to score.
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $questions = $this->input('questions');
                if (! is_array($questions)) {
                    return;
                }

                foreach ($questions as $index => $question) {
                    $options = is_array($question['options'] ?? null) ? $question['options'] : [];

                    $correct = array_filter($options, fn ($option) => filter_var(
                        $option['is_correct'] ?? false,
                        FILTER_VALIDATE_BOOLEAN
                    ));

                    if (count($correct) !== 1) {
                        $validator->errors()->add(
                            "questions.{$index}.options",
                            'Mark exactly one answer as correct.'
                        );
                    }

                    if (($question['type'] ?? null) === QuestionType::YesNo->value && count($options) !== 2) {
                        $validator->errors()->add(
                            "questions.{$index}.options",
                            'A Yes/No question needs exactly two answers.'
                        );
                    }
                }
            },
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'Enter a paper title.',
            'questions.required' => 'Add at least one question.',
            'questions.min' => 'Add at least one question.',
            'questions.*.text.required' => 'Enter the question.',
            'questions.*.options.required' => 'Add at least two answers.',
            'questions.*.options.min' => 'Add at least two answers.',
            'questions.*.options.max' => 'A question can have at most six answers.',
            'questions.*.options.*.text.required' => 'Enter the answer text.',
        ];
    }

    public function attributes(): array
    {
        return [
            'pass_mark' => 'pass mark',
            'max_attempts' => 'retry limit',
            'questions.*.text' => 'question',
            'questions.*.options.*.text' => 'answer',
        ];
    }

    private function programme(): CourseProgramme
    {
        /** @var CourseProgramme $programme */
        $programme = $this->route('programme');

        return $programme;
    }
}
