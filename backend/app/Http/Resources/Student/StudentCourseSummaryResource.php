<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\CourseProgramme;
use App\Support\PublicUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

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
            'category_name' => $this->category?->name,
            'thumbnail_url' => PublicUrl::forRequest($this->thumbnail_url, $request),
            'price_cents' => (int) $this->price_cents,
            'currency' => $this->currency,
            'is_free' => $this->isFree(),
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
}
