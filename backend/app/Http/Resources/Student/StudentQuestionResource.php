<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\CourseQuestion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CourseQuestion */
class StudentQuestionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'text' => $this->text,
            'type' => $this->type->value,
            'options' => StudentQuestionOptionResource::collection($this->whenLoaded('options')),
        ];
    }
}
