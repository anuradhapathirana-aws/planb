<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\StudentVideoProgress;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The server's view of how far a student has got through a lesson.
 *
 * The player seeds its forward-seek clamp from `max_position_seconds` — never
 * from zero, or a returning student would be locked back to the start.
 *
 * @mixin StudentVideoProgress
 */
class StudentVideoProgressResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'course_video_id' => $this->course_video_id,
            'max_position_seconds' => $this->max_position_seconds,
            'watched_seconds' => $this->watched_seconds,
            'is_watched' => $this->is_watched,
            'watched_at' => $this->watched_at?->toIso8601String(),
        ];
    }
}
