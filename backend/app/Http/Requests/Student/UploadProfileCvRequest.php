<?php

declare(strict_types=1);

namespace App\Http\Requests\Student;

use Illuminate\Foundation\Http\FormRequest;

class UploadProfileCvRequest extends FormRequest
{
    /** 5 MB, expressed in the kilobytes the `max` rule counts in. */
    public const MAX_KILOBYTES = 5 * 1024;

    /**
     * The student can only ever reach their own record here — the route carries
     * no id and the controller reads `$request->user()`.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Same rules the admin path enforces (`UploadStudentCvRequest`): `mimes`
     * checks the extension and `mimetypes` the sniffed content, because an
     * uploader controls the filename and neither alone is sufficient (§7.4).
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'cv' => [
                'required',
                'file',
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
            'cv.mimes' => 'Your CV must be a PDF file.',
            'cv.mimetypes' => 'Your CV must be a PDF file.',
            'cv.max' => 'Your CV must be 5 MB or smaller.',
        ];
    }
}
