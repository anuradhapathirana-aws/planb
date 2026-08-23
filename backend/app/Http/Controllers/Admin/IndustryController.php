<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Industry\StoreIndustryRequest;
use App\Http\Requests\Industry\UpdateIndustryRequest;
use App\Http\Resources\IndustryResource;
use App\Models\Industry;
use App\Services\Industry\IndustryManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IndustryController extends Controller
{
    public function __construct(private readonly IndustryManagementService $industries) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Industry::class);

        $paginated = $this->industries->list($request->only([
            'search', 'is_active', 'sort', 'direction', 'per_page',
        ]));

        return response()->json([
            'data' => IndustryResource::collection($paginated->items()),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    public function store(StoreIndustryRequest $request): JsonResponse
    {
        $industry = $this->industries->create($request->validated());

        return response()->json(['data' => new IndustryResource($industry)], 201);
    }

    public function show(Industry $industry): JsonResponse
    {
        $this->authorize('view', $industry);

        return response()->json(['data' => new IndustryResource($industry->loadCount('professions'))]);
    }

    public function update(UpdateIndustryRequest $request, Industry $industry): JsonResponse
    {
        $updated = $this->industries->update($industry, $request->validated());

        return response()->json(['data' => new IndustryResource($updated)]);
    }

    public function activate(Industry $industry): JsonResponse
    {
        $this->authorize('update', $industry);

        return response()->json(['data' => new IndustryResource($this->industries->activate($industry))]);
    }

    public function deactivate(Industry $industry): JsonResponse
    {
        $this->authorize('update', $industry);

        return response()->json(['data' => new IndustryResource($this->industries->deactivate($industry))]);
    }
}
