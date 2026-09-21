<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\CourseCategory;
use App\Support\PublicUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A course category as the student app draws it: a name, a glyph and — for a
 * top-level one — its sub-categories.
 *
 * Its own Resource rather than `CourseCategoryResource` (backend/CLAUDE.md §3):
 * the admin one carries `is_active`, `sort_order`, course counts and timestamps,
 * none of which a student needs — the list is already filtered and ordered.
 *
 * @mixin CourseCategory
 */
class StudentCourseCategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            // One name, already in the student's language (root CLAUDE.md §8).
            'name' => $this->translated('name'),
            // Null when no admin picked one; the app guesses from the name then.
            'icon' => $this->icon?->value,
            // A sub-category's uploaded icon. When set, the app draws it instead.
            'icon_image_url' => PublicUrl::forRequest($this->icon_image_url, $request),
            'children' => self::collection($this->whenLoaded('children')),
        ];
    }
}
