<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\CourseProgramme;
use Illuminate\Http\Request;

/** @mixin CourseProgramme */
class StudentCourseDetailResource extends StudentCourseSummaryResource
{
    public function toArray(Request $request): array
    {
        return parent::toArray($request) + [
            'topics' => StudentCourseTopicResource::collection($this->whenLoaded('topics')),
            // Null when the programme has no Q&A paper — most do not. Matches the
            // admin convention of `data: null` rather than omitting the key.
            'paper' => $this->paper
                ? new StudentPaperSummaryResource($this->paper)
                : null,
        ];
    }
}
