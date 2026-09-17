<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\Student;
use App\Services\Student\LearnerAvatarService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One circle in the learner stack: initials, and nothing else.
 *
 * No photo, no id, no name — this is the one endpoint where a student reads data
 * about *other* students, so it carries the minimum that renders a circle. Never
 * widen it; a stack does not need to identify anyone.
 *
 * @mixin Student
 */
class LearnerAvatarResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'initials' => LearnerAvatarService::initials((string) $this->full_name),
        ];
    }
}
