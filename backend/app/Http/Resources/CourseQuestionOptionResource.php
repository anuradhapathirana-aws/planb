<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\CourseQuestionOption;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CourseQuestionOption */
class CourseQuestionOptionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'text' => $this->text,
            // Admin-only payload. A student-facing resource must never send this.
            'is_correct' => $this->is_correct,
            'sort_order' => $this->sort_order,
        ];
    }
}
