<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use App\Models\SiteHeroSlide;
use Illuminate\Foundation\Http\FormRequest;

/**
 * The website hero's figures strip — Website Configuration > Hero Slider.
 */
class UpdateHeroFiguresRequest extends FormRequest
{
    /** The strip is laid out for four: one row on a laptop, two by two on a phone. */
    private const MAX_FIGURES = 4;

    public function authorize(): bool
    {
        // Part of the hero, so it is managed by whoever manages the hero slides.
        // The figures live on `company_settings`, but this request only ever
        // touches the `hero_figures` column, and the bank details are never sent.
        return $this->user()->can('manage', SiteHeroSlide::class);
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'figures' => ['present', 'array', 'max:'.self::MAX_FIGURES],
            'figures.*' => ['array:value,label,label_si'],
            // Short on purpose: "500+" and "12+" sit on one line at 3xl size.
            'figures.*.value' => ['nullable', 'string', 'max:12'],
            'figures.*.label' => ['nullable', 'string', 'max:40', 'required_with:figures.*.value'],
            'figures.*.label_si' => ['nullable', 'string', 'max:60'],
        ];
    }

    public function messages(): array
    {
        return [
            'figures.max' => 'The strip holds up to '.self::MAX_FIGURES.' figures.',
            'figures.*.value.max' => 'Keep the figure short, like 500+ (12 characters at most).',
            'figures.*.label.required_with' => 'Say what this figure counts.',
            'figures.*.label.max' => 'Keep the label under 40 characters.',
            'figures.*.label_si.max' => 'Keep the label under 60 characters.',
        ];
    }
}
