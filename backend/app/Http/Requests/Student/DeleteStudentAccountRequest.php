<?php

declare(strict_types=1);

namespace App\Http\Requests\Student;

use Illuminate\Foundation\Http\FormRequest;

class DeleteStudentAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        // The route's student guard is the authorization: a student can only
        // ever delete the account they are signed in to.
        return true;
    }

    /** @return array<string, array<int, string>> */
    public function rules(): array
    {
        $length = (int) config('students.login_code.length');

        return [
            // Kept as a string so a leading zero survives.
            'code' => ['required', 'string', 'regex:/^\d{'.$length.'}$/'],
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
