<?php

declare(strict_types=1);

namespace App\Http\Requests\Student;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Step one of signing up with an email address: the student's details.
 *
 * Mirrored by `registerSchema` in shared/src/schemas/studentAuth.ts, which is
 * UX only — this is the enforcement point (root CLAUDE.md §7.3).
 */
class RequestRegistrationCodeRequest extends FormRequest
{
    public const MIN_AGE_YEARS = 18;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * Tidy what people actually type before judging it: stray spaces in a
     * name, capitals in an address, and the spaces, dashes and brackets a phone
     * number is usually written with. The number is stored as `+94771234567`,
     * so the admin panel can search it however it was typed.
     */
    protected function prepareForValidation(): void
    {
        $name = $this->input('full_name');
        $email = $this->input('email');
        $phone = $this->input('contact_number');

        $this->merge([
            'full_name' => is_string($name) ? preg_replace('/\s+/u', ' ', trim($name)) : $name,
            'email' => is_string($email) ? mb_strtolower(trim($email)) : $email,
            'contact_number' => is_string($phone) ? preg_replace('/[\s\-().]/', '', $phone) : $phone,
        ]);
    }

    /**
     * Note what is NOT here: no `unique:students,email`. A 422 saying "that
     * email is taken" would tell anyone which addresses belong to Plan B
     * students — the exact oracle the sign-in endpoint refuses to be
     * (backend/CLAUDE.md §4). An existing address is handled, silently, in
     * StudentRegistrationService instead.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            // Letters in any script (Sinhala and Tamil names included), spaces,
            // and the punctuation real names carry. Digits and symbols are not a name.
            'full_name' => ['required', 'string', 'min:3', 'max:120', "regex:/^[\\p{L}\\p{M}][\\p{L}\\p{M} .'\\-]*$/u"],
            'email' => ['required', 'string', 'email:rfc', 'max:255'],
            // An optional +, then 9–15 digits: the E.164 range, which covers both
            // Sri Lankan and UAE numbers with or without the country code.
            'contact_number' => ['required', 'string', 'regex:/^\+?\d{9,15}$/'],
            'date_of_birth' => [
                'required',
                'date_format:Y-m-d',
                'after_or_equal:'.config('students.registration.earliest_birth_date'),
                'before_or_equal:-'.self::MIN_AGE_YEARS.' years',
            ],
            'accept_terms' => ['accepted'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'full_name.required' => 'Enter your full name.',
            'full_name.min' => 'Enter your full name.',
            'full_name.regex' => 'Use letters only in your name.',
            'email.required' => 'Enter your email address.',
            'email.email' => 'Enter a valid email address.',
            'contact_number.required' => 'Enter your mobile number.',
            'contact_number.regex' => 'Enter a valid mobile number, for example +94 77 123 4567.',
            'date_of_birth.required' => 'Enter your date of birth.',
            'date_of_birth.date_format' => 'Enter a valid date of birth.',
            'date_of_birth.after_or_equal' => 'Enter a valid date of birth.',
            'date_of_birth.before_or_equal' => 'You must be at least '.self::MIN_AGE_YEARS.' years old.',
            'accept_terms.accepted' => 'Please agree to the Terms and Privacy Policy.',
        ];
    }
}
