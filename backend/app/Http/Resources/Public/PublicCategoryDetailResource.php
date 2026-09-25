<?php

declare(strict_types=1);

namespace App\Http\Resources\Public;

use App\Http\Resources\Student\StudentCategoryDetailResource;
use App\Models\CourseCategory;
use App\Models\CourseProgramme;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;

/**
 * A category's public page, and so a course bundle's —
 * `GET api/v1/public/course-categories/{id}`.
 *
 * **Its own Resource, never {@see StudentCategoryDetailResource}.** That one
 * carries what one student owns and what THEY would pay for the rest. A visitor
 * gets the bundle's **list price** — every published course in it — and the
 * personal figure comes from the student endpoint after sign-in.
 *
 * Courses go through {@see PublicCourseSummaryResource}, so a course looks and
 * prices the same here as on the catalogue.
 *
 * @mixin CourseCategory
 */
class PublicCategoryDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var Collection<int, CourseProgramme> $courses */
        $courses = $this->getAttribute('public_courses');
        /** @var CourseCategory|null $owner */
        $owner = $this->getAttribute('bundle_owner');

        return [
            'id' => $this->id,
            'name' => $this->translated('name'),
            'icon' => $this->icon?->value,
            'parent' => $this->parent === null ? null : [
                'id' => $this->parent->id,
                'name' => $this->parent->translated('name'),
            ],

            'courses_count' => $courses->count(),
            'lessons_count' => (int) $courses->sum('videos_count'),
            'total_duration_seconds' => (int) $courses->sum(
                fn (CourseProgramme $course) => (int) ($course->getAttribute('total_duration_seconds') ?? 0),
            ),
            'courses' => PublicCourseSummaryResource::collection($courses),

            'children' => $this->getAttribute('public_children')
                ->map(fn (CourseCategory $child) => [
                    'id' => $child->id,
                    'name' => $child->translated('name'),
                    'courses_count' => (int) $child->getAttribute('courses_count'),
                    // Sold as its own bundle: linked to, not part of this page's.
                    'own_bundle' => (bool) $child->getAttribute('own_bundle'),
                ])
                ->values()
                ->all(),

            /*
             * Null when these courses are sold one by one. `category_id` is the
             * bundle's own page — this one, or the main category's when this
             * sub-category follows it; the website redirects there. The price is
             * the LIST price; a signed-in student's (less what they own) is theirs.
             */
            'bundle' => $owner === null ? null : [
                'category_id' => $owner->id,
                'name' => $owner->translated('name'),
                'price_cents' => $owner->purchasablePriceCents(),
                'currency' => $owner->purchasableCurrency(),
            ],
        ];
    }
}
