<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use App\Models\SiteHeroSlide;
use Illuminate\Foundation\Http\FormRequest;

class UploadSiteHeroSlideImageRequest extends FormRequest
{
    /** Room for a full-quality 1920x1080 (or larger) export. Re-encoded to a few hundred KB. */
    private const MAX_MB = 8;

    public function authorize(): bool
    {
        return $this->user()->can('manage', SiteHeroSlide::class);
    }

    public function rules(): array
    {
        return [
            // `mimetypes` checks the file's real content type, `mimes` its
            // extension — both, per root CLAUDE.md §7.4, so a renamed file
            // cannot slip through. The Service re-encodes it to JPEG after
            // this, so a WebP upload is never stored or served as WebP.
            'image' => [
                'required',
                'image',
                'mimetypes:image/jpeg,image/png,image/webp',
                'mimes:jpg,jpeg,png,webp',
                'max:'.(self::MAX_MB * 1024),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'image.required' => 'Choose an image to upload.',
            'image.mimetypes' => 'Upload a JPG, PNG or WebP image.',
            'image.mimes' => 'Upload a JPG, PNG or WebP image.',
            'image.max' => 'The image must be under '.self::MAX_MB.' MB.',
        ];
    }
}
