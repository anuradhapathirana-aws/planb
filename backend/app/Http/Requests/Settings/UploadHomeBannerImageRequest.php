<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use App\Models\HomeBanner;
use Illuminate\Foundation\Http\FormRequest;

class UploadHomeBannerImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage', HomeBanner::class);
    }

    public function rules(): array
    {
        return [
            // mimetypes checks the file's real content type, mimes its extension —
            // both, per CLAUDE.md §7.4, so a renamed file can't slip through.
            'image' => [
                'required',
                'image',
                'mimetypes:image/jpeg,image/png',
                'mimes:jpg,jpeg,png',
                'max:'.(config('courses.max_thumbnail_upload_mb') * 1024),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'image.required' => 'Choose an image to upload.',
            'image.mimetypes' => 'Upload a JPG or PNG image.',
            'image.mimes' => 'Upload a JPG or PNG image.',
            'image.max' => 'The image must be under '.config('courses.max_thumbnail_upload_mb').' MB.',
        ];
    }
}
