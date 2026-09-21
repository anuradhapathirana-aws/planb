<?php

declare(strict_types=1);

namespace App\Http\Requests\Course;

use App\Models\CourseCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UploadCourseCategoryIconRequest extends FormRequest
{
    /** Recommended upload: a square transparent PNG. Stored no larger than this. */
    public const MAX_EDGE_PX = 256;

    public const MAX_UPLOAD_KB = 1024;

    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('category'));
    }

    public function rules(): array
    {
        return [
            /*
             * PNG only, checked by content AND extension (CLAUDE.md §7.4). Not
             * SVG: an SVG can carry script, and it cannot be re-encoded. Not JPEG:
             * an icon needs a transparent background to sit on a coloured tile.
             */
            'icon_image' => [
                'required',
                'image',
                'mimetypes:image/png',
                'mimes:png',
                'max:'.self::MAX_UPLOAD_KB,
            ],
        ];
    }

    /** @return list<callable(Validator): void> */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                /** @var CourseCategory $category */
                $category = $this->route('category');

                if (! $category->isSubCategory()) {
                    $validator->errors()->add(
                        'icon_image',
                        'Only sub-categories can have an uploaded icon. Pick one from the list instead.',
                    );
                }
            },
        ];
    }

    public function messages(): array
    {
        return [
            'icon_image.required' => 'Choose an image to upload.',
            'icon_image.image' => 'Upload a PNG image.',
            'icon_image.mimetypes' => 'Upload a PNG image.',
            'icon_image.mimes' => 'Upload a PNG image.',
            'icon_image.max' => 'The image must be under 1 MB.',
        ];
    }
}
