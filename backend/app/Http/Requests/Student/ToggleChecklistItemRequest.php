<?php

declare(strict_types=1);

namespace App\Http\Requests\Student;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Ticking a step off.
 *
 * `is_completed` is sent explicitly rather than the endpoint being a "toggle":
 * a student on a slow connection can tap twice, and two toggles cancel out
 * while two identical sets do not. The client already knows the state it wants.
 */
class ToggleChecklistItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, string>> */
    public function rules(): array
    {
        return [
            'is_completed' => ['required', 'boolean'],
        ];
    }
}
