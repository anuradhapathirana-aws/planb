<?php

declare(strict_types=1);

namespace App\Http\Requests\Student;

use Illuminate\Foundation\Http\FormRequest;

class VerifyLoginCodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, string>> */
    public function rules(): array
    {
        $length = (int) config('students.login_code.length');

        return [
            'email' => ['required', 'string', 'email', 'max:255'],
            // Kept as a string so a leading zero survives.
            'code' => ['required', 'string', 'regex:/^\d{'.$length.'}$/'],
            // Labels the token in the student's session list; never trusted.
            'device_name' => ['nullable', 'string', 'max:60'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'code.regex' => 'Enter the '.config('students.login_code.length').'-digit code from your email.',
        ];
    }
}
