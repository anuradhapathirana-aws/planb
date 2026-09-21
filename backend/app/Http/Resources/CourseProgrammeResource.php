<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\CourseProgramme;
use App\Support\PublicUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CourseProgramme */
class CourseProgrammeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'course_category_id' => $this->course_category_id,
            'name' => $this->name,
            /*
             * Raw, never the English fallback: this feeds the admin form's
             * Sinhala input, and showing the fallback there would save it back
             * into the column on the next edit — turning "not translated yet"
             * into a permanent English entry nobody can tell apart.
             */
            'name_si' => $this->name_si,
            'description' => $this->description,
            'status' => $this->status->value,
            'price_cents' => (int) $this->price_cents,
            'currency' => $this->currency,
            'is_free' => $this->isFree(),
            'enrolments_count' => $this->whenCounted('enrolments'),
            'thumbnail_url' => PublicUrl::forRequest($this->thumbnail_url, $request),
            'sort_order' => $this->sort_order,
            'category' => $this->whenLoaded('category', fn () => new CourseCategoryResource($this->category)),
            'topics' => CourseTopicResource::collection($this->whenLoaded('topics')),
            // Summary only (no questions) — the builder page fetches the full paper.
            'paper' => $this->whenLoaded(
                'paper',
                fn () => $this->paper ? new CoursePaperResource($this->paper) : null,
            ),
            'topics_count' => $this->whenCounted('topics'),
            'videos_count' => $this->whenCounted('videos'),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
