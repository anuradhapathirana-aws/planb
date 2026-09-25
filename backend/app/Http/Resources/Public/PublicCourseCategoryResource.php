<?php

declare(strict_types=1);

namespace App\Http\Resources\Public;

use App\Models\CourseCategory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A category as a filter on the public course catalogue.
 *
 * Its own Resource, never the admin or student one: those carry selling mode,
 * bundle prices and — on the student side — what one student owns. A filter
 * needs a name, an icon key and a count, and nothing else leaves the server.
 *
 * @mixin CourseCategory
 */
class PublicCourseCategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            // The visitor's language, chosen by the server (root CLAUDE.md §8).
            'name' => $this->translated('name'),
            // A key into the fixed icon registry, never a class or component name.
            'icon' => $this->icon?->value,
            // Visible, published courses — a parent's includes its sub-categories'.
            'courses_count' => (int) $this->getAttribute('courses_count'),
            'children' => $this->when(
                $this->parent_id === null,
                fn () => self::collection($this->children),
            ),
        ];
    }
}
