<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use App\Models\SiteHeroSlide;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * The slider's new order, as the sequence of slide ids the admin is looking at.
 * Position in the array is the order (root CLAUDE.md §8).
 */
class ReorderSiteHeroSlidesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage', SiteHeroSlide::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', Rule::exists('site_hero_slides', 'id')],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                /** @var list<int> $ids */
                $ids = $this->input('ids', []);

                /*
                 * A partial list would renumber only the slides sent and leave
                 * the rest colliding with them; a duplicate would put two
                 * slides in one position. Neither is expressible per-field.
                 */
                if (count($ids) !== count(array_unique($ids))) {
                    $validator->errors()->add('ids', 'The same slide was listed more than once.');

                    return;
                }

                if (count($ids) !== SiteHeroSlide::query()->count()) {
                    $validator->errors()->add('ids', 'Send every slide, in the order they should appear.');
                }
            },
        ];
    }
}
