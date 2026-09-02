<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Enums\HomeBannerLink;
use App\Models\HomeBanner;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The banner as the app renders it.
 *
 * Its own resource, not the admin one (root CLAUDE.md §16.5). The difference is
 * not just fewer fields: the link arrives **resolved** — one `target` the app
 * switches on — rather than as three columns the client would have to
 * re-implement the "which one applies" rule over.
 *
 * @mixin HomeBanner
 */
class StudentHomeBannerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'image_url' => $this->image_url,
            'title' => $this->title,
            'subtitle' => $this->subtitle,
            'link' => $this->resolveLink(),
        ];
    }

    /**
     * @return array{type: string, course_id?: int, url?: string}
     */
    private function resolveLink(): array
    {
        return match ($this->link_type) {
            HomeBannerLink::Course => $this->link_course_programme_id === null
                // The course was deleted after the banner was set up. Degrade to
                // signage rather than sending the student to a 404.
                ? ['type' => HomeBannerLink::None->value]
                : ['type' => HomeBannerLink::Course->value, 'course_id' => $this->link_course_programme_id],

            HomeBannerLink::Url => $this->link_url === null
                ? ['type' => HomeBannerLink::None->value]
                : ['type' => HomeBannerLink::Url->value, 'url' => $this->link_url],

            default => ['type' => $this->link_type->value],
        };
    }
}
