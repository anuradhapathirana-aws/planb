<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Course\ReorderCategoryCoursesRequest;
use App\Http\Resources\CourseProgrammeResource;
use App\Models\CourseCategory;
use App\Models\CourseProgramme;
use App\Services\Course\CourseOrderService;
use Illuminate\Http\JsonResponse;

/** "Course 1, Course 2…" — the order a category's courses are meant to be taken in. */
class CourseOrderController extends Controller
{
    public function __construct(private readonly CourseOrderService $order) {}

    public function show(CourseCategory $category): JsonResponse
    {
        $this->authorize('viewAny', CourseProgramme::class);

        return response()->json([
            'data' => CourseProgrammeResource::collection($this->order->forCategory($category)),
        ]);
    }

    public function update(ReorderCategoryCoursesRequest $request, CourseCategory $category): JsonResponse
    {
        return response()->json([
            'data' => CourseProgrammeResource::collection(
                $this->order->reorder($category, $request->programmeIds()),
            ),
        ]);
    }
}
