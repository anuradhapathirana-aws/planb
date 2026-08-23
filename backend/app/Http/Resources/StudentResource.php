<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Student */
class StudentResource extends JsonResource
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
            'industry_id' => $this->industry_id,
            'profession_id' => $this->profession_id,
            'industry' => $this->industry ? new IndustryResource($this->industry) : null,
            'profession' => $this->profession ? new ProfessionResource($this->profession) : null,
            'visa_status' => $this->visa_status?->value,
            'languages_spoken' => $this->languages_spoken ?? [],
            'is_blocked' => $this->is_blocked,
            'is_registered' => $this->isRegistered(),
            'registered_at' => $this->registered_at?->toIso8601String(),
            'profile_photo_url' => $this->profile_photo_url,
            'imported_by' => $this->whenLoaded('importedBy', fn () => $this->importedBy?->name),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
