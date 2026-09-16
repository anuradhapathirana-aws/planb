<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use App\Enums\IntroAnimation;
use App\Models\CompanySetting;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAppIntroRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manageBranding', CompanySetting::class);
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'intro_is_enabled' => ['required', 'boolean'],
            // Optional: with no greeting the app plays the logo on its own.
            'intro_greeting_en' => ['nullable', 'string', 'max:160'],
            // Optional: the app falls back to the English text in Sinhala mode.
            'intro_greeting_si' => ['nullable', 'string', 'max:160'],
            'intro_animation' => ['required', Rule::in(IntroAnimation::values())],
        ];
    }

    public function messages(): array
    {
        return [
            'intro_animation.in' => 'Choose one of the listed animations.',
        ];
    }
}
