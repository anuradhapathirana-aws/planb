<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use App\Enums\CourseStatus;
use App\Enums\SiteHeroIcon;
use App\Enums\SiteLinkTarget;
use App\Models\CourseProgramme;
use App\Models\SiteHeroSlide;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveSiteHeroSlideRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage', SiteHeroSlide::class);
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'eyebrow' => ['nullable', 'string', 'max:60'],
            'eyebrow_si' => ['nullable', 'string', 'max:60'],

            /*
             * Required: a slide with no headline is dropped by
             * `SiteHeroSlide::isPublishable()`, so accepting one would be
             * accepting a row that can never appear. Unlike a home banner,
             * artwork alone is not a website hero — the copy is the slide.
             */
            'heading' => ['required', 'string', 'max:120'],
            'heading_si' => ['nullable', 'string', 'max:120'],

            'body' => ['nullable', 'string', 'max:300'],
            'body_si' => ['nullable', 'string', 'max:300'],

            ...$this->ctaRules('primary'),
            ...$this->ctaRules('secondary'),

            'stat_one_value' => ['nullable', 'string', 'max:12'],
            'stat_one_label' => ['nullable', 'string', 'max:24'],
            'stat_one_label_si' => ['nullable', 'string', 'max:24'],
            'stat_two_value' => ['nullable', 'string', 'max:12'],
            'stat_two_label' => ['nullable', 'string', 'max:24'],
            'stat_two_label_si' => ['nullable', 'string', 'max:24'],

            'icon' => ['required', Rule::in(SiteHeroIcon::values())],
            'is_visible' => ['required', 'boolean'],
        ];
    }

    /**
     * Rules the array syntax cannot express (root CLAUDE.md §8): each button
     * target needs its own field, a button pointing at an unpublished course is
     * a dead end, and the highlight markers have to come in pairs.
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $this->validateCta($validator, 'primary');
                $this->validateCta($validator, 'secondary');
                $this->validateHighlightMarkers($validator);
            },
        ];
    }

    public function messages(): array
    {
        return [
            'heading.required' => 'Enter the headline for this slide.',
            'primary_cta_url.url' => 'Enter a full web address starting with http:// or https://.',
            'secondary_cta_url.url' => 'Enter a full web address starting with http:// or https://.',
            'icon.in' => 'Choose one of the listed icons.',
        ];
    }

    /**
     * @param  'primary'|'secondary'  $slot
     * @return array<string, array<int, mixed>>
     */
    private function ctaRules(string $slot): array
    {
        return [
            $slot.'_cta_label' => ['nullable', 'string', 'max:40'],
            $slot.'_cta_label_si' => ['nullable', 'string', 'max:40'],
            $slot.'_cta_target' => ['required', Rule::in(SiteLinkTarget::values())],

            // `exists` is safe here — an admin is choosing from a list they can
            // already see, so confirming an id exists leaks nothing.
            $slot.'_cta_course_programme_id' => [
                'nullable',
                'integer',
                Rule::exists('course_programmes', 'id')->whereNull('deleted_at'),
            ],

            /*
             * Schemes restricted to what a browser should be handed. The enum
             * already keeps every other destination off free text; this covers
             * the one case that is free text, so a `javascript:` or `data:`
             * URL cannot become the front page's primary button.
             */
            $slot.'_cta_url' => ['nullable', 'string', 'max:2048', 'url:http,https'],
        ];
    }

    /**
     * @param  'primary'|'secondary'  $slot
     */
    private function validateCta(Validator $validator, string $slot): void
    {
        $target = SiteLinkTarget::tryFrom((string) $this->input($slot.'_cta_target'));

        if ($target === null || $target === SiteLinkTarget::None) {
            return;
        }

        $label = trim((string) $this->input($slot.'_cta_label'));

        if ($label === '') {
            $validator->errors()->add(
                $slot.'_cta_label',
                'Enter the wording for this button, or set it to show no button.',
            );
        }

        if ($target->needsCourse()) {
            $courseId = $this->input($slot.'_cta_course_programme_id');

            if ($courseId === null || $courseId === '') {
                $validator->errors()->add(
                    $slot.'_cta_course_programme_id',
                    'Choose the course this button opens.',
                );

                return;
            }

            $isPublished = CourseProgramme::query()
                ->whereKey($courseId)
                ->where('status', CourseStatus::Published)
                ->exists();

            if (! $isPublished) {
                $validator->errors()->add(
                    $slot.'_cta_course_programme_id',
                    'That course is not published, so visitors would land on a page they cannot open.',
                );
            }
        }

        if ($target->needsUrl() && trim((string) $this->input($slot.'_cta_url')) === '') {
            $validator->errors()->add($slot.'_cta_url', 'Enter the web address this button opens.');
        }
    }

    /**
     * `**word**` marks the gold segment of a heading. An odd number of markers
     * means one is unclosed, and the website renders the asterisks literally —
     * which the admin will not discover until they look at the live page. It is
     * cheaper to refuse it here.
     */
    private function validateHighlightMarkers(Validator $validator): void
    {
        foreach (['heading', 'heading_si'] as $field) {
            $value = (string) $this->input($field);

            if ($value === '') {
                continue;
            }

            if (substr_count($value, '**') % 2 !== 0) {
                $validator->errors()->add(
                    $field,
                    'Highlighted words need ** on both sides, like **this**.',
                );
            }
        }
    }
}
