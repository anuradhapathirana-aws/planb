<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\CoursePaper;
use Illuminate\Http\Request;

/** @mixin CoursePaper */
class StudentPaperDetailResource extends StudentPaperSummaryResource
{
    public function toArray(Request $request): array
    {
        return parent::toArray($request) + [
            'questions' => StudentQuestionResource::collection($this->whenLoaded('questions')),
        ];
    }
}
