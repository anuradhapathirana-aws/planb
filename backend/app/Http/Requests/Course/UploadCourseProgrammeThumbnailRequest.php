<?php

declare(strict_types=1);

namespace App\Http\Requests\Course;

use App\Models\CourseProgramme;
use Illuminate\Foundation\Http\FormRequest;

class UploadCourseProgrammeThumbnailRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var CourseProgramme $programme */
        $programme = $this->route('programme');

        return $this->user()->can('update', $programme);
    }

    public function rules(): array
    {
        return [
            // mimetypes checks the file's real content type, mimes its extension —
            // both, per CLAUDE.md §7.4, so a renamed file can't slip through.
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
