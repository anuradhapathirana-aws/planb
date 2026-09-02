<?php

declare(strict_types=1);

namespace App\Http\Requests\Student;

use Illuminate\Foundation\Http\FormRequest;

class UploadStudentCvRequest extends FormRequest
{
    /** 5 MB, expressed in the kilobytes the `max` rule counts in. */
    public const MAX_KILOBYTES = 5 * 1024;

    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('student'));
    }

    public function rules(): array
    {
        return [
            'cv' => [
                'required',
                'file',
                // `mimes` checks the extension, `mimetypes` the sniffed content —
                // both, so a renamed .exe fails and so does a PDF named .txt.
                'mimes:pdf',
                'mimetypes:application/pdf',
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
            'cv.mimes' => 'The CV must be a PDF file.',
            'cv.mimetypes' => 'The CV must be a PDF file.',
            'cv.max' => 'The CV must be 5 MB or smaller.',
        ];
    }
}
