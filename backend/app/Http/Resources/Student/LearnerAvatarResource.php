<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\Student;
use App\Support\PublicUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One face in the learner stack, and nothing else.
 *
 * No id, no name, no initials — this is the one endpoint where a student reads
 * data about *other* students, so it carries the minimum that renders a circle.
 * Never widen it; a stack does not need to identify anyone.
 *
 * @mixin Student
 */
class LearnerAvatarResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            // Rebuilt against the requesting host: Media Library builds its URL
            // from APP_URL, which is not necessarily reachable from the phone.
            'photo_url' => PublicUrl::forRequest($this->profile_photo_url, $request),
        ];
    }
}
