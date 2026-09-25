<?php

declare(strict_types=1);

namespace App\Http\Resources\Public;

use App\Http\Resources\Student\StudentCourseSummaryResource;
use App\Models\CourseProgramme;
use App\Support\PlainText;
use App\Support\PublicUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A course as a card on the public website.
 *
 * **Its own Resource, never {@see StudentCourseSummaryResource}.**
 * That one carries `is_enrolled`, `is_wishlisted` and `progress` — one student's
 * private state — and a `bundle` block quoting *their* remaining price. A
 * stranger must receive none of it, and the way to guarantee that is a class
 * that has no such fields rather than a shared class with a flag.
 *
 * Two deliberate differences beyond the omissions:
 *
 *  - **`excerpt` is plain text, not the stored HTML.** The description is
 *    rich text an admin authored. Sending the markup would mean the website had
 *    to render it with `dangerouslySetInnerHTML` + DOMPurify on a page anyone
 *    can reach, to produce two clamped lines. Sending flattened text means the
 *    card cannot be an injection surface at all (root CLAUDE.md §7.6). The full
 *    description belongs on the course detail page, where it is worth the
 *    sanitiser.
 *  - **No `position`.** "Course 3 of Migration" is guidance for someone working
 *    through a category they have access to; on a marketing card it only invites
 *    the question of where courses one and two went.
 *
 * @mixin CourseProgramme
 */
class PublicCourseSummaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            // The visitor's language, falling back to English. The server picks
            // the column; the client never sees both names (root §8).
            'name' => $this->translated('name'),
            'excerpt' => PlainText::excerptFromHtml($this->translated('description')),

            // The id for filtering, the name for display — renaming a category
            // must never break a filter.
            'category_id' => $this->course_category_id,
            'category_name' => $this->category?->translated('name'),
            /*
             * A key into a fixed registry (`App\Enums\CourseCategoryIcon`), not
             * a class or component name. The website looks it up in an
             * exhaustive map and draws the fallback panel with it when a course
             * has no thumbnail. Null is normal — an unset icon stays unset.
             */
            'category_icon' => $this->category?->icon?->value,

            'thumbnail_url' => PublicUrl::forRequest($this->thumbnail_url, $request),

            'price_cents' => (int) $this->price_cents,
            'currency' => $this->currency,
            'is_free' => $this->isFree(),
            /*
             * False when this paid course is sold only in its category's bundle.
             * The card then says so instead of printing a price nobody can pay
             * on its own — the enrol endpoint enforces the same rule, this only
             * decides what is drawn.
             */
            'sold_individually' => $this->isSoldIndividually(),

            'topics_count' => (int) ($this->topics_count ?? 0),
            'lessons_count' => (int) ($this->videos_count ?? 0),
            // 0 when no lesson has a duration yet; the card hides the chip then
            // rather than showing "0m".
            'total_duration_seconds' => (int) ($this->getAttribute('total_duration_seconds') ?? 0),

            /*
             * The card's three bullet points. Real topic titles rather than a
             * separate "highlights" field an admin would have to fill in twice
             * — these are already written, already translated, and already
             * describe what the course covers. The query limits the relation to
             * three, so this is the whole loaded set.
             *
             * @var list<string>
             */
            'topic_names' => $this->topics
                ->map(fn ($topic) => $topic->translated('title'))
                ->filter(fn (?string $title) => $title !== null && $title !== '')
                ->values()
                ->all(),
        ];
    }
}
