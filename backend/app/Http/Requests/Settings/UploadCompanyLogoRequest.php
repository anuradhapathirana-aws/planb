<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use App\Models\CompanySetting;
use Illuminate\Foundation\Http\FormRequest;

class UploadCompanyLogoRequest extends FormRequest
{
    private const MAX_MB = 2;

    public function authorize(): bool
    {
        return $this->user()->can('manageBranding', CompanySetting::class);
    }

    public function rules(): array
    {
        return [
            // Real content type and extension both (root CLAUDE.md §7.4).
            'logo' => [
                'required',
                'image',
                'mimetypes:image/png,image/jpeg,image/webp',
                'mimes:png,jpg,jpeg,webp',
                'max:'.(self::MAX_MB * 1024),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'logo.required' => 'Choose a logo to upload.',
            'logo.mimetypes' => 'Upload a PNG, JPG or WebP image.',
            'logo.mimes' => 'Upload a PNG, JPG or WebP image.',
            'logo.max' => 'The logo must be under '.self::MAX_MB.' MB.',
        ];
    }
}
