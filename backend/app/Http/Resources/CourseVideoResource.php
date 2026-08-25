<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\CourseVideo;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CourseVideo */
class CourseVideoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $media = $this->videoMedia();

        return [
            'id' => $this->id,
            'course_topic_id' => $this->course_topic_id,
            'title' => $this->title,
            'provider' => $this->provider->value,
            'duration_seconds' => $this->duration_seconds,
            'sort_order' => $this->sort_order,
            // Never the file URL itself — playback goes through the signed
            // stream endpoint (CLAUDE.md §13.13).
            'has_file' => $media !== null,
            'file_name' => $media?->file_name,
            'file_size_bytes' => $media?->size,
            'thumbnail_url' => $this->thumbnail_url,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
