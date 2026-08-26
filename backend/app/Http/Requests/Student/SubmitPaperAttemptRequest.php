<?php

declare(strict_types=1);

namespace App\Http\Requests\Student;

use Illuminate\Foundation\Http\FormRequest;

class SubmitPaperAttemptRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Ownership is checked by CoursePaperAttemptPolicy in the controller.
        return true;
    }

    /**
     * Shape only. That an option actually belongs to its question, and to this
     * paper, is checked in `CoursePaperAttemptService::submit()` — an `exists:`
     * rule here would accept any option id in the database, which is precisely
     * the tamper this needs to stop.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'answers' => ['required', 'array', 'min:1', 'max:200'],
            'answers.*.question_id' => ['required', 'integer', 'min:1'],
            'answers.*.option_id' => ['required', 'integer', 'min:1'],
        ];
    }
}
