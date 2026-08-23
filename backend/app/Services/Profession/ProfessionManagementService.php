<?php

declare(strict_types=1);

namespace App\Services\Profession;

use App\Models\Profession;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ProfessionManagementService
{
    /**
     * @param  array{search?: string, industry_id?: int, is_active?: string, sort?: string, direction?: string, per_page?: int}  $filters
     */
    public function list(array $filters): LengthAwarePaginator
    {
        $query = Profession::query()->with('industry');

        if (! empty($filters['search'])) {
            $query->where('name', 'like', "%{$filters['search']}%");
        }

        if (! empty($filters['industry_id'])) {
            $query->where('industry_id', $filters['industry_id']);
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

    public function create(array $data): Profession
    {
        return Profession::create($data)->load('industry');
    }

    public function update(Profession $profession, array $data): Profession
    {
        $profession->update($data);

        return $profession->fresh('industry');
    }

    public function activate(Profession $profession): Profession
    {
        $profession->update(['is_active' => true]);

        return $profession;
    }

    public function deactivate(Profession $profession): Profession
    {
        $profession->update(['is_active' => false]);

        return $profession;
    }
}
