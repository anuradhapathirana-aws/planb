<?php

declare(strict_types=1);

namespace App\Services\Course;

use App\Models\CourseCategory;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class CourseCategoryService
{
    /**
     * @param  array{search?: string, is_active?: string, sort?: string, direction?: string, per_page?: int}  $filters
     */
    public function list(array $filters): LengthAwarePaginator
    {
        $query = CourseCategory::query()->withCount('programmes');

        if (! empty($filters['search'])) {
            $query->where('name', 'like', "%{$filters['search']}%");
        }

        if (($filters['is_active'] ?? null) === '1') {
            $query->where('is_active', true);
        } elseif (($filters['is_active'] ?? null) === '0') {
            $query->where('is_active', false);
        }

        $sortable = ['name', 'sort_order', 'created_at'];
        $sort = in_array($filters['sort'] ?? null, $sortable, true) ? $filters['sort'] : 'sort_order';
        $direction = ($filters['direction'] ?? null) === 'desc' ? 'desc' : 'asc';

        return $query->orderBy($sort, $direction)
            ->orderBy('name')
            ->paginate($filters['per_page'] ?? 25)
            ->withQueryString();
    }

    /**
     * @param  array{name: string, description?: ?string, sort_order?: ?int}  $data
     */
    /**
     * The categories a student sees on Home: every ACTIVE one, in the admin's
     * sort order, including categories with no published courses yet.
     *
     * Empty categories are included on purpose — the admin decides what is on
     * the row by switching a category on or off, not by whether a course happens
     * to be published in it today. A student tapping one lands on All Courses'
     * own "nothing in this category" state. Deactivating a category is how an
     * admin takes it off the row.
     *
     * @return Collection<int, CourseCategory>
     */
    public function activeForStudents(): Collection
    {
        return CourseCategory::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'icon']);
    }

    public function create(array $data): CourseCategory
    {
        $data['sort_order'] ??= $this->nextSortOrder();

        return CourseCategory::create($data)->loadCount('programmes');
    }

    public function update(CourseCategory $category, array $data): CourseCategory
    {
        $category->update($data);

        return $category->fresh()->loadCount('programmes');
    }

    public function activate(CourseCategory $category): CourseCategory
    {
        $category->update(['is_active' => true]);

        return $category->loadCount('programmes');
    }

    public function deactivate(CourseCategory $category): CourseCategory
    {
        $category->update(['is_active' => false]);

        return $category->loadCount('programmes');
    }

    /** Appends new categories to the end of the list rather than the front. */
    private function nextSortOrder(): int
    {
        return (int) CourseCategory::max('sort_order') + 1;
    }
}
