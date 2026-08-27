<?php

declare(strict_types=1);

namespace App\Http\Requests\Student;

use App\Enums\VisaStatus;
use App\Models\Profession;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
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
     * `full_name` and `visa_status` are editable at the client's explicit
     * request. Both feed Plan B's visa and employment paperwork, so a student
     * can now put a name here that does not match their passport — that risk
     * was raised and accepted.
     *
     * Absent on purpose, and each for a reason:
     *  - `email` — it IS the sign-in credential. An editable email field plus a
     *    live token on an unlocked phone is an account-takeover path.
     *  - `contact_number` — changing it requires proving control of the new
     *    number by SMS code (see StudentPhoneChangeService). Allowing a silent
     *    write here would defeat that entirely.
     *  - `student_id` — Plan B's identifier, not the student's.
     *  - `is_blocked`, `registered_at` — not the student's to set.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'full_name' => ['sometimes', 'required', 'string', 'max:255'],
            'visa_status' => ['sometimes', 'required', Rule::enum(VisaStatus::class)],
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
            'full_name.required' => 'Enter your full name.',
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
