<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use App\Models\SiteHeroSlide;
use Illuminate\Foundation\Http\FormRequest;

class UploadSiteHeroSlideImageRequest extends FormRequest
{
    private const MAX_MB = 5;

    public function authorize(): bool
    {
        return $this->user()->can('manage', SiteHeroSlide::class);
    }

    public function rules(): array
    {
        return [
            // `mimetypes` checks the file's real content type, `mimes` its
            // extension — both, per root CLAUDE.md §7.4, so a renamed file
            // cannot slip through. The Service re-encodes it after this.
            'image' => [
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
            'image.required' => 'Choose an image to upload.',
            'image.mimetypes' => 'Upload a JPG or PNG image.',
            'image.mimes' => 'Upload a JPG or PNG image.',
            'image.max' => 'The image must be under '.self::MAX_MB.' MB.',
        ];
    }
}
