<?php

declare(strict_types=1);

namespace App\Http\Requests\Course;

use App\Models\CourseProgramme;
use Illuminate\Foundation\Http\FormRequest;

class UploadCourseVideoThumbnailRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', CourseProgramme::class);
    }

    public function rules(): array
    {
        return [
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
            'thumbnail.max' => 'The image must be under '.config('courses.max_thumbnail_upload_mb').' MB.',
        ];
    }
}
