<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\CoursePaper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CoursePaper */
class CoursePaperResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'course_programme_id' => $this->course_programme_id,
            'title' => $this->title,
            'instructions' => $this->instructions,
            'pass_mark' => $this->pass_mark,
            'max_attempts' => $this->max_attempts,
            'requires_all_videos_watched' => $this->requires_all_videos_watched,
            'questions' => CourseQuestionResource::collection($this->whenLoaded('questions')),
            'questions_count' => $this->whenCounted('questions'),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
