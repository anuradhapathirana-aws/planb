<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Course\StoreCourseProgrammeRequest;
use App\Http\Requests\Course\UpdateCourseProgrammeRequest;
use App\Http\Resources\CourseProgrammeResource;
use App\Models\CourseProgramme;
use App\Services\Course\CourseProgrammeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseProgrammeController extends Controller
{
    public function __construct(private readonly CourseProgrammeService $programmes) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', CourseProgramme::class);

        $paginated = $this->programmes->list($request->only([
            'search', 'course_category_id', 'status', 'sort', 'direction', 'per_page',
        ]));

        return response()->json([
            'data' => CourseProgrammeResource::collection($paginated->items()),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    public function store(StoreCourseProgrammeRequest $request): JsonResponse
    {
        $programme = $this->programmes->create($request->validated());

        return response()->json(['data' => new CourseProgrammeResource($programme)], 201);
    }

    public function show(CourseProgramme $programme): JsonResponse
    {
        $this->authorize('view', $programme);

        return response()->json(['data' => new CourseProgrammeResource($this->programmes->loadTree($programme))]);
    }

    public function update(UpdateCourseProgrammeRequest $request, CourseProgramme $programme): JsonResponse
    {
        $updated = $this->programmes->update($programme, $request->validated());

        return response()->json(['data' => new CourseProgrammeResource($updated)]);
    }

    public function destroy(CourseProgramme $programme): JsonResponse
    {
        $this->authorize('delete', $programme);

        $this->programmes->delete($programme);

        return response()->json(null, 204);
    }

    public function publish(CourseProgramme $programme): JsonResponse
    {
        $this->authorize('update', $programme);

        return response()->json(['data' => new CourseProgrammeResource($this->programmes->publish($programme))]);
    }

    public function unpublish(CourseProgramme $programme): JsonResponse
    {
        $this->authorize('update', $programme);

        return response()->json(['data' => new CourseProgrammeResource($this->programmes->unpublish($programme))]);
    }
}
