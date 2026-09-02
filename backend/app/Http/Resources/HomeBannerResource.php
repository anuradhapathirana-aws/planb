<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\HomeBanner;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The banner as the ADMIN form needs it: every stored field, including the ones
 * the current `link_type` isn't using, so switching the link type in the form
 * doesn't blank a value the admin hasn't saved yet.
 *
 * The student-facing shape is {@see Student\StudentHomeBannerResource} and is
 * deliberately different — it resolves the link instead of exposing the columns.
 *
 * @mixin HomeBanner
 */
class HomeBannerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'subtitle' => $this->subtitle,
            'link_type' => $this->link_type->value,
            'link_course_programme_id' => $this->link_course_programme_id,
            'link_course_name' => $this->linkedCourse?->name,
            'link_url' => $this->link_url,
            'is_active' => $this->is_active,
            'image_url' => $this->image_url,
            // Lets the admin screen warn "switched on, but students see nothing".
            'is_live' => $this->isPublishable(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
