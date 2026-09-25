<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\SiteHeroSlide;
use App\Support\PublicUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A hero slide as the ADMIN form needs it: every stored column, including the
 * ones the current button targets are not using, so switching a target in the
 * form does not blank a value the admin has not saved yet.
 *
 * **Both language columns are sent raw, never the fallback.** The form edits
 * them, and a fallback rendered into the Sinhala input gets saved back over the
 * empty column on the next edit (root CLAUDE.md §8).
 *
 * The visitor-facing shape is {@see Public\PublicHeroSlideResource} and is
 * deliberately different: it resolves the language and the button destination
 * rather than exposing the columns.
 *
 * @mixin SiteHeroSlide
 */
class SiteHeroSlideResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'eyebrow' => $this->eyebrow,
            'eyebrow_si' => $this->eyebrow_si,
            'heading' => $this->heading,
            'heading_si' => $this->heading_si,
            'body' => $this->body,
            'body_si' => $this->body_si,

            'primary_cta_label' => $this->primary_cta_label,
            'primary_cta_label_si' => $this->primary_cta_label_si,
            'primary_cta_target' => $this->primary_cta_target->value,
            'primary_cta_course_programme_id' => $this->primary_cta_course_programme_id,
            'primary_cta_course_name' => $this->primaryCtaCourse?->name,
            'primary_cta_url' => $this->primary_cta_url,

            'secondary_cta_label' => $this->secondary_cta_label,
            'secondary_cta_label_si' => $this->secondary_cta_label_si,
            'secondary_cta_target' => $this->secondary_cta_target->value,
            'secondary_cta_course_programme_id' => $this->secondary_cta_course_programme_id,
            'secondary_cta_course_name' => $this->secondaryCtaCourse?->name,
            'secondary_cta_url' => $this->secondary_cta_url,

            'stat_one_value' => $this->stat_one_value,
            'stat_one_label' => $this->stat_one_label,
            'stat_one_label_si' => $this->stat_one_label_si,
            'stat_two_value' => $this->stat_two_value,
            'stat_two_label' => $this->stat_two_label,
            'stat_two_label_si' => $this->stat_two_label_si,

            'icon' => $this->icon->value,
            'is_visible' => $this->is_visible,
            'sort_order' => $this->sort_order,
            'image_url' => PublicUrl::forRequest($this->image_url, $request),
            // Lets the admin screen warn "switched on, but visitors see nothing".
            'is_live' => $this->isPublishable(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
