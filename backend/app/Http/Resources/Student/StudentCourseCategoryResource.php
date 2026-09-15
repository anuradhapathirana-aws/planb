<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\CourseCategory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A course category as the student app's Home row draws it: a name and a glyph.
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
            'name' => $this->name,
            // Null when no admin picked one; the app guesses from the name then.
            'icon' => $this->icon?->value,
        ];
    }
}
