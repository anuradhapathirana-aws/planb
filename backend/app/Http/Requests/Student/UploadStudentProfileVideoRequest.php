<?php

declare(strict_types=1);

namespace App\Http\Requests\Student;

use Illuminate\Foundation\Http\FormRequest;

class UploadStudentProfileVideoRequest extends FormRequest
{
    /** 10 MB, expressed in the kilobytes the `max` rule counts in. */
    public const MAX_KILOBYTES = 10 * 1024;

    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('student'));
    }

    /**
     * The "3 minutes" in the field's name is guidance, not a rule: reading a
     * duration server-side means probing the file with ffprobe, a dependency the
     * VPS doesn't carry. The size cap is the enforced limit, and the browser
     * shows the length it read off the file so the admin can judge.
     */
    public function rules(): array
    {
        return [
            'profile_video' => [
                'required',
                'file',
                'mimes:mp4,mov',
                'mimetypes:video/mp4,video/quicktime',
                'max:'.self::MAX_KILOBYTES,
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'profile_video.mimes' => 'The profile video must be an MP4 or MOV file.',
            'profile_video.mimetypes' => 'The profile video must be an MP4 or MOV file.',
            'profile_video.max' => 'The profile video must be 10 MB or smaller.',
        ];
    }
}
