<?php

declare(strict_types=1);

namespace App\Http\Requests\Public;

use App\Services\Course\PublicCourseService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Query parameters for the public course catalogue.
 *
 * **`authorize()` returns true because there is nobody to authorize.** This is
 * the anonymous catalogue; visibility is enforced in
 * {@see PublicCourseService::list} by scoping the query to published courses in
 * active categories, which is the pattern `backend/CLAUDE.md` §2 describes — the
 * scope *is* the authorization.
 *
 * What this class is actually for is bounding the input. Every parameter here
 * arrives from the open internet, and each one is a knob on a database query.
 */
class ListPublicCoursesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            /*
             * Capped short. This feeds a `LIKE %term%` across four columns and
             * a `whereHas`, and no real search is 200 characters long — a long
             * one is someone probing.
             */
            'search' => ['nullable', 'string', 'max:80'],

            /*
             * Not `exists:course_categories,id` — a stranger must not be able to
             * use a 422 to enumerate which category ids exist. An unknown id
             * simply matches nothing, which is the same answer as an empty
             * category and leaks nothing either way.
             */
            'category_id' => ['nullable', 'integer', 'min:1'],

            /*
             * Closed lists, never a column name. `sort` in particular is mapped
             * to an ORDER BY inside the Service from this fixed set — a value
             * from the request never reaches the query builder as a column.
             */
            'price' => ['nullable', 'string', Rule::in(PublicCourseService::PRICE_FILTERS)],
            'sort' => ['nullable', 'string', Rule::in(PublicCourseService::SORTS)],

            // The Service clamps to MAX_PER_PAGE as well; this is so an
            // out-of-range value is an honest 422 rather than a silent clamp.
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.PublicCourseService::MAX_PER_PAGE],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }

    /**
     * @return array{search: string|null, category_id: int|null, price: string|null, sort: string|null, per_page: int|null}
     */
    public function filters(): array
    {
        return [
            'search' => $this->validated('search'),
            'category_id' => $this->validated('category_id') === null
                ? null
                : (int) $this->validated('category_id'),
            'price' => $this->validated('price'),
            'sort' => $this->validated('sort'),
            'per_page' => $this->validated('per_page') === null
                ? null
                : (int) $this->validated('per_page'),
        ];
    }

    public function messages(): array
    {
        return [
            'per_page.max' => 'Ask for at most '.PublicCourseService::MAX_PER_PAGE.' courses at a time.',
        ];
    }
}
