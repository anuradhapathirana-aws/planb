<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use App\Models\CompanySetting;
use Illuminate\Foundation\Http\FormRequest;

class UploadCommunityPosterRequest extends FormRequest
{
    private const MAX_MB = 5;

    public function authorize(): bool
    {
        return $this->user()->can('manageBranding', CompanySetting::class);
    }

    public function rules(): array
    {
        return [
            // Real content type and extension both (root CLAUDE.md §7.4).
            'poster' => [
                'required',
                'image',
                'mimetypes:image/jpeg,image/png',
                'mimes:jpg,jpeg,png',
                'max:'.(self::MAX_MB * 1024),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'poster.required' => 'Choose an image to upload.',
            'poster.mimetypes' => 'Upload a JPG or PNG image.',
            'poster.mimes' => 'Upload a JPG or PNG image.',
            'poster.max' => 'The image must be under '.self::MAX_MB.' MB.',
        ];
    }
}
