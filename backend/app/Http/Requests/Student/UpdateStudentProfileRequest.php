<?php

declare(strict_types=1);

namespace App\Http\Requests\Student;

use App\Models\Profession;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateStudentProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * What a student may change about themselves.
     *
     * Absent on purpose, and each for a reason:
     *  - `email` — it IS the credential. Changing it needs a verify-old-then-
     *    verify-new flow, not a profile field; until that exists it goes through
     *    support.
     *  - `student_id`, `full_name` — admin-owned identity.
     *  - `visa_status` — admin-verified.
     *  - `is_blocked`, `registered_at` — not the student's to set, obviously.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'contact_number' => ['sometimes', 'nullable', 'string', 'max:20'],
            'address' => ['sometimes', 'nullable', 'string', 'max:500'],
            // Matches the admin form's minimum-age rule.
            'date_of_birth' => ['sometimes', 'nullable', 'date', 'before:-18 years'],
            'highest_qualification' => ['sometimes', 'nullable', 'string', 'max:255'],
            'industry_id' => ['sometimes', 'nullable', 'integer', 'exists:industries,id'],
            'profession_id' => ['sometimes', 'nullable', 'integer', 'exists:professions,id'],
            'languages_spoken' => ['sometimes', 'nullable', 'array', 'max:20'],
            'languages_spoken.*' => ['string', 'max:50'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'date_of_birth.before' => 'You must be at least 18 years old.',
        ];
    }

    /** The cross-field rule the array syntax can't express, mirroring the admin form. */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                $professionId = $this->input('profession_id');
                $industryId = $this->input('industry_id');

                if ($professionId === null || $industryId === null) {
                    return;
                }

                $belongs = Profession::where('id', $professionId)
                    ->where('industry_id', $industryId)
                    ->exists();

                if (! $belongs) {
                    $validator->errors()->add(
                        'profession_id',
                        'That profession does not belong to the selected industry.',
                    );
                }
            },
        ];
    }
}
