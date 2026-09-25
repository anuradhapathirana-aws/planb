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
            /*
             * `url:http,https` is the security control, not a formatting nicety:
             * the website renders these as real anchors, and a `javascript:` or
             * `data:` value pasted here would otherwise be an admin-authored XSS
             * vector on the company's front page. Same rule as the hero slide's
             * CTA address, for the same reason.
             */
            'facebook_url' => ['nullable', 'string', 'max:2048', 'url:http,https'],
            'linkedin_url' => ['nullable', 'string', 'max:2048', 'url:http,https'],
            'is_visible' => ['required', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Enter this person’s name.',
            'facebook_url.url' => 'Enter a full web address starting with http:// or https://.',
            'linkedin_url.url' => 'Enter a full web address starting with http:// or https://.',
        ];
    }
}
