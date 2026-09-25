<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use App\Models\TeamMember;
use Illuminate\Foundation\Http\FormRequest;

class UploadTeamMemberPhotoRequest extends FormRequest
{
    private const MAX_MB = 5;

    public function authorize(): bool
    {
        return $this->user()->can('manage', TeamMember::class);
    }

    public function rules(): array
    {
        return [
            // Real content type and extension both (root CLAUDE.md §7.4). The
            // Service re-encodes to JPEG afterwards, which is what actually
            // strips anything the source file was carrying.
            'photo' => [
                'required',
                'image',
                'mimetypes:image/jpeg,image/png',
                'mimes:jpg,jpeg,png',
                'max:'.(self::MAX_MB * 1024),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'photo.required' => 'Choose a photo to upload.',
            'photo.mimetypes' => 'Upload a JPG or PNG image.',
            'photo.mimes' => 'Upload a JPG or PNG image.',
            'photo.max' => 'The photo must be under '.self::MAX_MB.' MB.',
        ];
    }
}
