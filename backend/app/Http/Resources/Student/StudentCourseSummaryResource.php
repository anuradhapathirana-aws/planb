<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\CourseProgramme;
use App\Support\PublicUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;

/**
 * A programme as a list row: no topics, so the courses list stays one small
 * response even on a slow connection.
 *
 * @mixin CourseProgramme
 */
class StudentCourseSummaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            // The student's language, falling back to English where no Sinhala
            // name has been entered. The app renders whatever arrives here — it
            // never sees both names and never chooses between them.
            'name' => $this->translated('name'),
            'description' => $this->description,
            // Ids for relations, the name for display only — renaming a category
            // must never break a filter.
            'category_id' => $this->course_category_id,
            // Set when the course sits on a sub-category: the top-level one above it.
            'parent_category_id' => $this->category?->parent_id,
            'category_name' => $this->category?->translated('name'),
            /*
             * "Course N" of its own category — the order the admin wants the
             * category taken in. Counts published courses only, so there is no
             * gap where a draft sits. A suggestion, never a lock.
             */
            'position' => $this->getAttribute('position'),
            'thumbnail_url' => PublicUrl::forRequest($this->thumbnail_url, $request),
            'price_cents' => (int) $this->price_cents,
            'currency' => $this->currency,
            'is_free' => $this->isFree(),
            /*
             * False when this paid course is sold only in its category's bundle —
             * the app then points at the bundle instead of a price. The enrol
             * endpoint enforces the same rule; this only decides what is drawn.
             */
            'sold_individually' => $this->isSoldIndividually(),
            'bundle' => $this->bundleSummary(),
            // Whether this student may open the content, not whether it exists.
            'is_enrolled' => (bool) $this->getAttribute('is_enrolled'),
            // Whether THIS student has saved it to their wishlist.
            'is_wishlisted' => (bool) $this->getAttribute('is_wishlisted'),
            'topics_count' => (int) ($this->topics_count ?? 0),
            'videos_count' => (int) ($this->videos_count ?? 0),
            // Sum of every lesson's duration. 0 when nothing has a duration yet.
            'total_duration_seconds' => (int) ($this->getAttribute('total_duration_seconds') ?? 0),
            'has_paper' => $this->paper !== null,
            'published_at' => $this->published_at?->toIso8601String(),
            // Drives the Home search's "New" tab. Computed here rather than
            // shipping a raw date the client would have to reason about.
            'is_new' => $this->isNewlyPublished(),
            /*
             * Only set on a search response, and only when the course's own
             * name did NOT match — it is the reason this row is in the results.
             * Absent otherwise, so a normal list response carries no dead field.
             */
            'matched_topic' => $this->whenNotNull($this->getAttribute('matched_topic')),
            'progress' => $this->progress_summary,
        ];
    }

    /**
     * The bundle this course is sold in — its category's own, or its main
     * category's when it follows that one; null when sold one by one. The remaining count and price are this student's and are
     * only worked out on the detail response (null on a list row).
     *
     * @return array{category_id: int, name: ?string, remaining_count: ?int, remaining_price_cents: ?int, currency: string}|null
     */
    private function bundleSummary(): ?array
    {
        $bundle = $this->category?->bundleOwner();

        if ($bundle === null) {
            return null;
        }

        /** @var array{remaining: Collection, remaining_price_cents: int}|null $quote */
        $quote = $this->getAttribute('bundle_quote');

        return [
            'category_id' => $bundle->id,
            'name' => $bundle->translated('name'),
            'remaining_count' => $quote === null ? null : $quote['remaining']->count(),
            'remaining_price_cents' => $quote === null ? null : $quote['remaining_price_cents'],
            'currency' => $bundle->purchasableCurrency(),
        ];
    }
}
