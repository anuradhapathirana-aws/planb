<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Enums\SellingMode;
use App\Models\CourseCategory;
use App\Support\PublicUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;

/**
 * The student app's Category page: what is inside and, for a bundle, what this
 * student still pays. Every figure is worked out on the server — the app never
 * adds up prices itself.
 *
 * @mixin CourseCategory
 */
class StudentCategoryDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var CourseCategory|null $owner */
        $owner = $this->getAttribute('bundle_owner');
        /** @var array{courses: Collection, remaining: Collection, owned_count: int, remaining_price_cents: int, currency: string}|null $quote */
        $quote = $this->getAttribute('bundle_quote');

        return [
            'id' => $this->id,
            'name' => $this->translated('name'),
            'icon' => $this->icon?->value,
            'icon_image_url' => PublicUrl::forRequest($this->icon_image_url, $request),
            'parent' => $this->parent === null ? null : [
                'id' => $this->parent->id,
                'name' => $this->parent->translated('name'),
                'icon' => $this->parent->icon?->value,
            ],
            /*
             * Active sub-categories. `own_bundle` marks one sold as a bundle of
             * its own — not part of this page's bundle — so the page can point
             * to where it is bought.
             */
            'children' => $this->whenLoaded('children', fn () => $this->children->map(fn (CourseCategory $child) => [
                'id' => $child->id,
                'name' => $child->translated('name'),
                'icon' => $child->icon?->value,
                'icon_image_url' => PublicUrl::forRequest($child->icon_image_url, $request),
                'own_bundle' => $child->selling_mode === SellingMode::Bundle,
            ])->values()),
            'courses' => StudentCourseSummaryResource::collection($this->getAttribute('courses') ?? []),
            'courses_count' => (int) $this->getAttribute('courses_count'),
            'total_duration_seconds' => (int) $this->getAttribute('total_duration_seconds'),
            'owned_count' => (int) $this->getAttribute('owned_count'),
            // How the courses sitting directly in this category are sold.
            'selling_mode' => $owner === null ? SellingMode::Single->value : SellingMode::Bundle->value,
            /*
             * The bundle this page sells — this category's own, or its main
             * category's when it follows that one. Null when sold one by one.
             * `remaining_*` leave out what the student already owns;
             * `is_available` is the server's say-so to show the buy button.
             */
            'bundle' => $quote === null || $owner === null ? null : [
                'category_id' => $owner->id,
                'name' => $owner->translated('name'),
                'courses_count' => $quote['courses']->count(),
                'owned_count' => $quote['owned_count'],
                'remaining_count' => $quote['remaining']->count(),
                'remaining_price_cents' => $quote['remaining_price_cents'],
                'currency' => $quote['currency'],
                'is_available' => $owner->isPurchasable() && $quote['remaining']->isNotEmpty(),
            ],
        ];
    }
}
