<?php

declare(strict_types=1);

namespace App\Http\Requests\Student;

use Illuminate\Foundation\Http\FormRequest;

class RequestLoginCodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Note what is NOT here: no `exists:students,email` rule. That would turn a
     * 422 into a "this address is / isn't one of ours" oracle, which is exactly
     * what the silent-success design avoids (backend/CLAUDE.md §4).
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:255'],
        ];
    }
}
