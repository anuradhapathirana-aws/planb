<?php

declare(strict_types=1);

namespace App\Http\Requests\Student;

use App\Enums\VisaStatus;
use App\Http\Requests\Concerns\NormalizesBio;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStudentRequest extends FormRequest
{
    use NormalizesBio;

    /** Students must be adults to enrol for migration programmes. */
    private const MIN_AGE_YEARS = 18;

    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('student'));
    }

    protected function prepareForValidation(): void
    {
        $this->normalizeBio();
    }

    public function rules(): array
    {
        $studentId = $this->route('student')->id;

        return [
            'student_id' => ['required', 'string', 'max:50', Rule::unique('students', 'student_id')->ignore($studentId)],
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('students', 'email')->ignore($studentId)],
            'contact_number' => ['required', 'string', 'max:30'],
            'address' => ['required', 'string', 'max:500'],
            'date_of_birth' => [
                'required',
                'date',
                'before_or_equal:'.now()->subYears(self::MIN_AGE_YEARS)->toDateString(),
            ],
            'highest_qualification' => ['nullable', 'string', 'max:255'],
            // One column, written from here and from the student's own profile
            // screen, so the rules come from one place — see NormalizesBio.
            'bio' => $this->bioRules(),
            'industry_id' => ['required', 'integer', 'exists:industries,id'],
            'profession_id' => [
                'required',
                'integer',
                Rule::exists('professions', 'id')->where(function ($query) {
                    if ($this->filled('industry_id')) {
                        $query->where('industry_id', $this->input('industry_id'));
                    }
                }),
            ],
            'visa_status' => ['required', Rule::enum(VisaStatus::class)],
            'languages_spoken' => ['nullable', 'array'],
            'languages_spoken.*' => ['string', 'max:100'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'date_of_birth.before_or_equal' => 'Student must be at least '.self::MIN_AGE_YEARS.' years old.',
        ];
    }
}
