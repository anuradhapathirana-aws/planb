<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\CourseProgramme;
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
            'description' => $this->description,
            'status' => $this->status->value,
            'thumbnail_url' => $this->thumbnail_url,
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
