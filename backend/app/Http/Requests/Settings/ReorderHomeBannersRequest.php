<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use App\Models\HomeBanner;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * The carousel's new order, as the sequence of slide ids the admin is looking at.
 *
 * Position in the array is the order (root CLAUDE.md §8) — there is no explicit
 * sort number to disagree with itself.
 */
class ReorderHomeBannersRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage', HomeBanner::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => [
                'integer',
                // Safe to confirm existence: an admin is reordering rows they
                // are already looking at, so this leaks nothing.
                Rule::exists('home_banners', 'id'),
            ],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                /** @var list<int> $ids */
                $ids = $this->input('ids', []);

                /*
                 * A partial list would silently renumber only the slides sent
                 * and leave the rest colliding with them. A duplicate would put
                 * two slides in one position. Neither is expressible per-field,
                 * so both live here (root CLAUDE.md §8).
                 */
                if (count($ids) !== count(array_unique($ids))) {
                    $validator->errors()->add('ids', 'The same banner was listed more than once.');

                    return;
                }

                if (count($ids) !== HomeBanner::query()->count()) {
                    $validator->errors()->add('ids', 'Send every banner, in the order they should appear.');
                }
            },
        ];
    }
}
