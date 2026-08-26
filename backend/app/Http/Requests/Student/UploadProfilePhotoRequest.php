<?php

declare(strict_types=1);

namespace App\Http\Requests\Student;

use Illuminate\Foundation\Http\FormRequest;

class UploadProfilePhotoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Both `mimetypes` (sniffed) and `mimes` (extension) — an attacker controls
     * the filename, so neither alone is sufficient (CLAUDE.md §7.4). The upload
     * is re-encoded before storage regardless.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'photo' => [
                'required',
                'file',
                'mimetypes:image/jpeg,image/png',
                'mimes:jpeg,jpg,png',
                'max:2048',
            ],
        ];
    }
}
