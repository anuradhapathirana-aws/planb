<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\CourseVideo;
use App\Support\PublicUrl;
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
            // Raw for the admin form — see CourseProgrammeResource's note.
            'title_si' => $this->title_si,
            'provider' => $this->provider->value,
            'duration_seconds' => $this->duration_seconds,
            'sort_order' => $this->sort_order,
            // Never the file URL itself — playback goes through the signed
            // stream endpoint (CLAUDE.md §13.13). Nor the Bunny guid: it is the
            // one thing needed to build a playback URL, so it stays server-side.
            'has_file' => $this->hasVideoFile(),
            'processing_status' => $this->processing_status->value,
            'file_name' => $media?->file_name,
            'file_size_bytes' => $media?->size,
            'thumbnail_url' => PublicUrl::forRequest($this->thumbnail_url, $request),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
