<?php

declare(strict_types=1);

namespace App\Http\Requests\Course;

use App\Models\CourseProgramme;
use Illuminate\Foundation\Http\FormRequest;

class UploadCourseVideoFileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', CourseProgramme::class);
    }

    public function rules(): array
    {
        return [
            // mimetypes checks the file's actual content type, mimes its extension —
            // both, per CLAUDE.md §7.4, so a renamed file can't slip through.
            'file' => [
                'required',
                'file',
                'mimetypes:video/mp4,video/quicktime',
                'mimes:mp4,mov',
                'max:'.(config('courses.max_video_upload_mb') * 1024),
            ],
            'duration_seconds' => [
                'nullable', 'integer', 'min:0', 'max:'.config('courses.max_video_duration_seconds'),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'file.required' => 'Choose a video file to upload.',
            'file.mimetypes' => 'Upload an MP4 or MOV video.',
            'file.mimes' => 'Upload an MP4 or MOV video.',
            'file.max' => 'The video must be under '.config('courses.max_video_upload_mb').' MB.',
        ];
    }
}
