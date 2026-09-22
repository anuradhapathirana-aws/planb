<?php

declare(strict_types=1);

namespace App\Services\Course;

use App\Enums\CourseStatus;
use App\Models\CourseCategory;
use App\Models\CourseProgramme;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * The order a category's courses are meant to be taken in — "Course 1",
 * "Course 2" — and the one place that turns `sort_order` into those numbers.
 *
 * Numbering is per category: a main category's own courses count from 1, and so
 * does each sub-category, because a sub-category is its own path. It is a
 * suggested path, not a lock — any course can still be opened or bought.
 */
class CourseOrderService
{
    /**
     * Every course sitting directly in this category (not its sub-categories),
     * drafts included, in order, each with its `position`.
     *
     * @return Collection<int, CourseProgramme>
     */
    public function forCategory(CourseCategory $category): Collection
    {
        $programmes = $this->ordered(CourseProgramme::query()->where('course_category_id', $category->id))
            ->with('media')
            ->get();

        foreach ($programmes->values() as $index => $programme) {
            $programme->setAttribute('position', $index + 1);
        }

        return $programmes;
    }

    /**
     * Saves the order the admin arranged. The request has already checked that
     * the list is exactly this category's courses, each once.
     *
     * Rewritten as 1..N rather than patched, so gaps left by deleted courses and
     * ties from older rows that all sat at 0 disappear on the first save.
     *
     * @param  list<int>  $programmeIds
     * @return Collection<int, CourseProgramme>
     */
    public function reorder(CourseCategory $category, array $programmeIds): Collection
    {
        DB::transaction(function () use ($category, $programmeIds): void {
            foreach ($programmeIds as $index => $id) {
                CourseProgramme::query()
                    ->where('course_category_id', $category->id)
                    ->whereKey($id)
                    ->update(['sort_order' => $index + 1]);
            }
        });

        return $this->forCategory($category);
    }

    /**
     * Sets `position` on each programme: its place among the courses in its own
     * category. One query for the whole page, not one per row.
     *
     * A student counts published courses only, so they see 1, 2, 3 with no hole
     * where a draft sits; the admin counts every course, since drafts are part
     * of what they are arranging.
     *
     * @param  Collection<int, CourseProgramme>  $programmes
     */
    public function attachPositions(Collection $programmes, bool $publishedOnly): void
    {
        $categoryIds = $programmes->pluck('course_category_id')->unique()->values()->all();

        if ($categoryIds === []) {
            return;
        }

        $rows = $this->ordered(CourseProgramme::query()->whereIn('course_category_id', $categoryIds))
            ->when($publishedOnly, fn (Builder $query) => $query->where('status', CourseStatus::Published))
            ->get(['id', 'course_category_id']);

        /** @var array<int, int> $positions */
        $positions = [];
        /** @var array<int, int> $seen */
        $seen = [];

        foreach ($rows as $row) {
            $category = (int) $row->course_category_id;
            $seen[$category] = ($seen[$category] ?? 0) + 1;
            $positions[$row->id] = $seen[$category];
        }

        foreach ($programmes as $programme) {
            $programme->setAttribute('position', $positions[$programme->id] ?? null);
        }
    }

    /**
     * The course order, with name then id breaking ties so rows saved before
     * anyone arranged them still number the same way on every request.
     *
     * @param  Builder<CourseProgramme>  $query
     * @return Builder<CourseProgramme>
     */
    public function ordered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('name')->orderBy('id');
    }
}
