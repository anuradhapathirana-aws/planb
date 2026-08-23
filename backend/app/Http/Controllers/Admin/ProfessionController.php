<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profession\StoreProfessionRequest;
use App\Http\Requests\Profession\UpdateProfessionRequest;
use App\Http\Resources\ProfessionResource;
use App\Models\Profession;
use App\Services\Profession\ProfessionManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfessionController extends Controller
{
    public function __construct(private readonly ProfessionManagementService $professions) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Profession::class);

        $paginated = $this->professions->list($request->only([
            'search', 'industry_id', 'is_active', 'sort', 'direction', 'per_page',
        ]));

        return response()->json([
            'data' => ProfessionResource::collection($paginated->items()),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    public function store(StoreProfessionRequest $request): JsonResponse
    {
        $profession = $this->professions->create($request->validated());

        return response()->json(['data' => new ProfessionResource($profession)], 201);
    }

    public function show(Profession $profession): JsonResponse
    {
        $this->authorize('view', $profession);

        return response()->json(['data' => new ProfessionResource($profession->load('industry'))]);
    }

    public function update(UpdateProfessionRequest $request, Profession $profession): JsonResponse
    {
        $updated = $this->professions->update($profession, $request->validated());

        return response()->json(['data' => new ProfessionResource($updated)]);
    }

    public function activate(Profession $profession): JsonResponse
    {
        $this->authorize('update', $profession);

        return response()->json(['data' => new ProfessionResource($this->professions->activate($profession)->load('industry'))]);
    }

    public function deactivate(Profession $profession): JsonResponse
    {
        $this->authorize('update', $profession);

        return response()->json(['data' => new ProfessionResource($this->professions->deactivate($profession)->load('industry'))]);
    }
}
