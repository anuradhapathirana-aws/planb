<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\CourseTopic;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CourseTopic */
class StudentCourseTopicResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            // Sanitized on write by App\Support\HtmlSanitizer. Still needs
            // DOMPurify wherever it is rendered as markup (CLAUDE.md §7.6).
            'description' => $this->description,
            'videos' => StudentCourseVideoResource::collection($this->whenLoaded('videos')),
            'videos_watched' => (int) ($this->videos_watched ?? 0),
            'is_complete' => (bool) ($this->is_complete ?? false),
        ];
    }
}
