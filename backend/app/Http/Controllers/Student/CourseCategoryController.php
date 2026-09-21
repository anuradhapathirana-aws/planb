<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Resources\Student\StudentCourseCategoryResource;
use App\Services\Course\CourseCategoryService;
use Illuminate\Http\JsonResponse;

/**
 * The category tree behind Home's "Top Categories" row and the course filter.
 *
 * Nothing per student here, so no scoping: which categories exist is Plan B's
 * catalogue structure, and the active filter in the service is the whole rule.
 */
class CourseCategoryController extends Controller
{
    public function __construct(private readonly CourseCategoryService $categories) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => StudentCourseCategoryResource::collection($this->categories->visibleTreeForStudents()),
        ]);
    }
}
