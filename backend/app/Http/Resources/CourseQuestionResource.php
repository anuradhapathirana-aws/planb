<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\CourseQuestion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CourseQuestion */
class CourseQuestionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'course_paper_id' => $this->course_paper_id,
            'text' => $this->text,
            'type' => $this->type->value,
            'sort_order' => $this->sort_order,
            'options' => CourseQuestionOptionResource::collection($this->whenLoaded('options')),
        ];
    }
}
