<?php

declare(strict_types=1);

namespace App\Services\Course;

use App\Models\CourseCategory;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

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
