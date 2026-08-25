<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Course\StoreCourseCategoryRequest;
use App\Http\Requests\Course\UpdateCourseCategoryRequest;
use App\Http\Resources\CourseCategoryResource;
use App\Models\CourseCategory;
use App\Services\Course\CourseCategoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseCategoryController extends Controller
{
    public function __construct(private readonly CourseCategoryService $categories) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', CourseCategory::class);

        $paginated = $this->categories->list($request->only([
            'search', 'is_active', 'sort', 'direction', 'per_page',
        ]));

        return response()->json([
            'data' => CourseCategoryResource::collection($paginated->items()),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    public function store(StoreCourseCategoryRequest $request): JsonResponse
    {
        $category = $this->categories->create($request->validated());

        return response()->json(['data' => new CourseCategoryResource($category)], 201);
    }

    public function show(CourseCategory $category): JsonResponse
    {
        $this->authorize('view', $category);

        return response()->json(['data' => new CourseCategoryResource($category->loadCount('programmes'))]);
    }

    public function update(UpdateCourseCategoryRequest $request, CourseCategory $category): JsonResponse
    {
        $updated = $this->categories->update($category, $request->validated());

        return response()->json(['data' => new CourseCategoryResource($updated)]);
    }

    public function activate(CourseCategory $category): JsonResponse
    {
        $this->authorize('update', $category);

        return response()->json(['data' => new CourseCategoryResource($this->categories->activate($category))]);
    }

    public function deactivate(CourseCategory $category): JsonResponse
    {
        $this->authorize('update', $category);

        return response()->json(['data' => new CourseCategoryResource($this->categories->deactivate($category))]);
    }
}
