<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use App\Enums\CourseStatus;
use App\Enums\HomeBannerLink;
use App\Models\CourseProgramme;
use App\Models\HomeBanner;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveHomeBannerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage', HomeBanner::class);
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'title' => ['nullable', 'string', 'max:120'],
            'subtitle' => ['nullable', 'string', 'max:200'],
            'link_type' => ['required', Rule::in(HomeBannerLink::values())],

            /*
             * `exists` is safe here — unlike the paper endpoints, this is an
             * admin choosing from a list they can already see, so confirming an
             * id exists leaks nothing.
             */
            'link_course_programme_id' => [
                'nullable',
                'integer',
                Rule::exists('course_programmes', 'id')->whereNull('deleted_at'),
            ],

            // Schemes are restricted to what a browser should be handed; a
            // `javascript:` or `intent:` URL has no business in a promo banner.
            'link_url' => ['nullable', 'string', 'max:2048', 'url:http,https'],

            'is_active' => ['required', 'boolean'],
        ];
    }

    /**
     * Rules the array syntax can't express (root CLAUDE.md §8): each link type
     * needs its own field, and a banner pointing at a course students cannot
     * open is a dead end rather than a promotion.
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $type = HomeBannerLink::tryFrom((string) $this->input('link_type'));

                if ($type === HomeBannerLink::Course) {
                    $courseId = $this->input('link_course_programme_id');

                    if ($courseId === null || $courseId === '') {
                        $validator->errors()->add('link_course_programme_id', 'Choose the course this banner opens.');

                        return;
                    }

                    $isPublished = CourseProgramme::query()
                        ->whereKey($courseId)
                        ->where('status', CourseStatus::Published)
                        ->exists();

                    if (! $isPublished) {
                        $validator->errors()->add(
                            'link_course_programme_id',
                            'That course is not published yet, so students would land on a page they cannot open.',
                        );
                    }
                }

                if ($type === HomeBannerLink::Url && ($this->input('link_url') === null || $this->input('link_url') === '')) {
                    $validator->errors()->add('link_url', 'Enter the web address this banner opens.');
                }
            },
        ];
    }

    public function messages(): array
    {
        return [
            'link_url.url' => 'Enter a full web address starting with http:// or https://.',
        ];
    }
}
