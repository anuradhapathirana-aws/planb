<?php

declare(strict_types=1);

namespace App\Http\Resources\Public;

use App\Enums\CourseStatus;
use App\Enums\SiteLinkTarget;
use App\Models\SiteHeroSlide;
use App\Support\PublicUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A hero slide as an anonymous visitor's browser renders it.
 *
 * Its own shape, not the admin one (root CLAUDE.md §16.5), and the difference is
 * not only fewer fields:
 *
 *  - **One language, picked by the server.** `translated()` resolves the `_si`
 *    pair from the request's `Accept-Language`; the client never chooses a
 *    column. Sending both would ship text the visitor cannot read and leave
 *    every component free to forget the rule.
 *  - **The button arrives resolved**, as a small discriminated union, so the
 *    site switches on `cta.type` instead of re-implementing "which column
 *    applies". `sort_order`, `is_visible` and `is_live` are admin bookkeeping
 *    and are not sent at all — a visitor has no use for them and they describe
 *    content that was deliberately withheld.
 *
 * @mixin SiteHeroSlide
 */
class PublicHeroSlideResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'eyebrow' => $this->translated('eyebrow'),
            'heading' => $this->translated('heading'),
            'body' => $this->translated('body'),
            'icon' => $this->icon->value,
            'image_url' => PublicUrl::forRequest($this->image_url, $request),
            'primary_cta' => $this->cta('primary'),
            'secondary_cta' => $this->cta('secondary'),
            'stats' => $this->stats(),
        ];
    }

    /**
     * One button, or null when the admin set it to show nothing.
     *
     * A `course` target whose programme has since been unpublished or deleted
     * resolves to null rather than to a link: the page it points at 404s, and a
     * dead primary button on the front page is worse than one fewer button.
     *
     * @param  'primary'|'secondary'  $slot
     * @return array<string, mixed>|null
     */
    private function cta(string $slot): ?array
    {
        /** @var SiteLinkTarget $target */
        $target = $this->{$slot.'_cta_target'};
        $label = trim((string) $this->translated($slot.'_cta_label'));

        if ($target === SiteLinkTarget::None || $label === '') {
            return null;
        }

        if ($target->needsCourse()) {
            $course = $this->{$slot === 'primary' ? 'primaryCtaCourse' : 'secondaryCtaCourse'};

            if ($course === null || $course->status !== CourseStatus::Published) {
                return null;
            }

            return ['label' => $label, 'type' => 'course', 'course_id' => $course->id];
        }

        if ($target->needsUrl()) {
            $url = trim((string) $this->{$slot.'_cta_url'});

            return $url === '' ? null : ['label' => $label, 'type' => 'url', 'url' => $url];
        }

        return ['label' => $label, 'type' => $target->value];
    }

    /**
     * The floating figures, as a list so the component maps over it. A pair with
     * no value is dropped rather than sent empty — the slide is designed for
     * zero, one or two, and an empty card is not one of the three.
     *
     * @return list<array{value: string, label: string}>
     */
    private function stats(): array
    {
        $stats = [];

        foreach (['one', 'two'] as $slot) {
            $value = trim((string) $this->{'stat_'.$slot.'_value'});

            if ($value === '') {
                continue;
            }

            $stats[] = [
                'value' => $value,
                'label' => (string) ($this->translated('stat_'.$slot.'_label') ?? ''),
            ];
        }

        return $stats;
    }
}
