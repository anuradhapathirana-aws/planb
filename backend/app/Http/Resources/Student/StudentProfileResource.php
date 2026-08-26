<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Http\Resources\IndustryResource;
use App\Http\Resources\ProfessionResource;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The signed-in student, as they see themselves.
 *
 * Deliberately not `StudentResource`: that one is written for the admin panel
 * and carries `is_blocked` and `imported_by`. Reusing it would leak internal
 * bookkeeping to the student and couple the two payloads together, so per root
 * CLAUDE.md §16.5 a student-facing endpoint gets its own Resource.
 *
 * @mixin Student
 */
class StudentProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_id' => $this->student_id,
            'full_name' => $this->full_name,
            'email' => $this->email,
            'contact_number' => $this->contact_number,
            'address' => $this->address,
            'date_of_birth' => $this->date_of_birth?->toDateString(),
            'highest_qualification' => $this->highest_qualification,
            'industry' => $this->industry ? new IndustryResource($this->industry) : null,
            'profession' => $this->profession ? new ProfessionResource($this->profession) : null,
            'visa_status' => $this->visa_status?->value,
            'languages_spoken' => $this->languages_spoken ?? [],
            'profile_photo_url' => $this->profile_photo_url,
            'registered_at' => $this->registered_at?->toIso8601String(),
            'email_verified_at' => $this->email_verified_at?->toIso8601String(),
        ];
    }
}
