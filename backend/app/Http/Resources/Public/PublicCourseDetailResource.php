<?php

declare(strict_types=1);

namespace App\Http\Resources\Public;

use App\Http\Resources\Student\StudentCourseDetailResource;
use App\Models\CourseProgramme;
use App\Models\CourseTopic;
use App\Models\CourseVideo;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A course's public page — `GET api/v1/public/courses/{id}`.
 *
 * **Its own Resource, never {@see StudentCourseDetailResource}.** That one
 * carries one student's progress, lock state and paper attempts. This one
 * starts from the public card ({@see PublicCourseSummaryResource}), so the card
 * and the page can never disagree about a price or a bundle, and adds only
 * what a buyer needs to decide:
 *
 *  - `description` — the full text. **Plain text**, the course description is
 *    a plain textarea in the admin (topic descriptions are the rich-text ones),
 *    so the page renders it as text and needs no sanitiser.
 *  - `topics` — the syllabus: topic and lesson **titles and durations only**.
 *    No lesson id, no file, no provider, no URL — nothing that locates a video
 *    or could be fed to the stream endpoint.
 *  - `assessment` — whether there is a final paper and how many questions.
 *    Never a question, never an option, never the answer key.
 *  - `bundle` — for a course sold only in its category's bundle, which bundle
 *    and its **list price**. What a particular student would pay (less what
 *    they own) is theirs, and comes from the student API after sign-in.
 *
 * @mixin CourseProgramme
 */
class PublicCourseDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $summary = (new PublicCourseSummaryResource($this->resource))->toArray($request);

        // The card's three bullets; the page sends the whole syllabus instead.
        unset($summary['topic_names']);

        $paper = $this->paper;
        $questions = (int) ($paper?->questions_count ?? 0);
        $bundle = $this->isSoldIndividually() ? null : $this->category?->bundleOwner();

        return [
            ...$summary,

            'description' => $this->translated('description'),

            'topics' => $this->topics->map(fn (CourseTopic $topic) => [
                'id' => $topic->id,
                'title' => $topic->translated('title'),
                'lessons_count' => $topic->videos->count(),
                'duration_seconds' => (int) $topic->videos->sum('duration_seconds'),
                'lessons' => $topic->videos->map(fn (CourseVideo $lesson) => [
                    'title' => $lesson->translated('title'),
                    'duration_seconds' => $lesson->duration_seconds === null ? null : (int) $lesson->duration_seconds,
                ])->values()->all(),
            ])->values()->all(),

            // A paper with no questions yet is not something to advertise.
            'assessment' => $questions > 0 ? ['questions_count' => $questions] : null,

            'bundle' => $bundle === null ? null : [
                'category_id' => $bundle->id,
                'name' => $bundle->translated('name'),
                'price_cents' => $bundle->purchasablePriceCents(),
                'currency' => $bundle->purchasableCurrency(),
            ],
        ];
    }
}
