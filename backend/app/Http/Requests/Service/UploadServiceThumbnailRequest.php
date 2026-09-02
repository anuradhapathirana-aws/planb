<?php

declare(strict_types=1);

namespace App\Http\Requests\Service;

use App\Models\Service;
use Illuminate\Foundation\Http\FormRequest;

class UploadServiceThumbnailRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Service $service */
        $service = $this->route('service');

        return $this->user()->can('update', $service);
    }

    public function rules(): array
    {
        return [
            // mimetypes checks the file's real content type, mimes its extension —
            // both, per root CLAUDE.md §7.4, so a renamed file cannot slip through.
            'thumbnail' => [
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
            'thumbnail.required' => 'Choose an image to upload.',
            'thumbnail.mimetypes' => 'Upload a JPG or PNG image.',
            'thumbnail.mimes' => 'Upload a JPG or PNG image.',
            'thumbnail.max' => 'The image must be under '.config('courses.max_thumbnail_upload_mb').' MB.',
        ];
    }
}
