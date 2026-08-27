<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\CourseVideo;
use App\Support\PublicUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A lesson as a student sees it.
 *
 * As with the admin resource, **no file URL of any kind** (CLAUDE.md §13.13):
 * playback goes through the signed stream endpoint, fetched fresh each time.
 *
 * @mixin CourseVideo
 */
class StudentCourseVideoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $progress = $this->student_progress;

        return [
            'id' => $this->id,
            'title' => $this->title,
            'duration_seconds' => $this->duration_seconds,
            'thumbnail_url' => PublicUrl::forRequest($this->thumbnail_url, $request),
            // Locked until the previous lesson is watched. The app greys the row
            // out rather than hiding it, so the student can see what is next.
            'is_locked' => (bool) $this->is_locked,
            'progress' => [
                'course_video_id' => $this->id,
                'max_position_seconds' => (int) ($progress?->max_position_seconds ?? 0),
                'watched_seconds' => (int) ($progress?->watched_seconds ?? 0),
                'is_watched' => (bool) ($progress?->is_watched ?? false),
                'watched_at' => $progress?->watched_at?->toIso8601String(),
            ],
        ];
    }
}
