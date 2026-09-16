<?php

declare(strict_types=1);

namespace App\Http\Requests\Course;

use App\Models\CourseProgramme;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Sent after the browser finishes pushing a lesson to Bunny. There is no file
 * here — the bytes went straight to Bunny — only the duration the browser read
 * off the picked file, which is a hint until Bunny reports the real one.
 */
class CompleteCourseVideoUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', CourseProgramme::class);
    }

    public function rules(): array
    {
        return [
            'duration_seconds' => [
                'nullable', 'integer', 'min:0', 'max:'.config('courses.max_video_duration_seconds'),
            ],
        ];
    }
}
