<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\CourseProgramme;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A programme as a list row: no topics, so the courses list stays one small
 * response even on a slow connection.
 *
 * @mixin CourseProgramme
 */
class StudentCourseSummaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'category_name' => $this->category?->name,
            'topics_count' => (int) ($this->topics_count ?? 0),
            'videos_count' => (int) ($this->videos_count ?? 0),
            'has_paper' => $this->paper !== null,
            'progress' => $this->progress_summary,
        ];
    }
}
