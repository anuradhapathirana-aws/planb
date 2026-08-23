<?php

declare(strict_types=1);

namespace App\Services\Industry;

use App\Models\Industry;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class IndustryManagementService
{
    /**
     * @param  array{search?: string, is_active?: string, sort?: string, direction?: string, per_page?: int}  $filters
     */
    public function list(array $filters): LengthAwarePaginator
    {
        $query = Industry::query()->withCount('professions');

        if (! empty($filters['search'])) {
            $query->where('name', 'like', "%{$filters['search']}%");
        }

        if (($filters['is_active'] ?? null) === '1') {
            $query->where('is_active', true);
        } elseif (($filters['is_active'] ?? null) === '0') {
            $query->where('is_active', false);
        }

        $sortable = ['name', 'created_at'];
        $sort = in_array($filters['sort'] ?? null, $sortable, true) ? $filters['sort'] : 'name';
        $direction = ($filters['direction'] ?? null) === 'desc' ? 'desc' : 'asc';

        return $query->orderBy($sort, $direction)
            ->paginate($filters['per_page'] ?? 50)
            ->withQueryString();
    }

    public function create(array $data): Industry
    {
        return Industry::create($data);
    }

    public function update(Industry $industry, array $data): Industry
    {
        $industry->update($data);

        return $industry->fresh();
    }

    public function activate(Industry $industry): Industry
    {
        $industry->update(['is_active' => true]);

        return $industry;
    }

    public function deactivate(Industry $industry): Industry
    {
        $industry->update(['is_active' => false]);

        return $industry;
    }
}
