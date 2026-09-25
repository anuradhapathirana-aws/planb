<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use App\Models\TeamMember;
use Illuminate\Foundation\Http\FormRequest;

class SaveTeamMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage', TeamMember::class);
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'role' => ['nullable', 'string', 'max:120'],
            // Optional: a blank Sinhala column means "not translated yet" and
            // the website falls back to English (root CLAUDE.md §8).
            'role_si' => ['nullable', 'string', 'max:120'],
            'is_visible' => ['required', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Enter this person’s name.',
        ];
    }
}
