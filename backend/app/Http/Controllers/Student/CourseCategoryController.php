<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Resources\Student\StudentCategoryDetailResource;
use App\Http\Resources\Student\StudentCourseCategoryResource;
use App\Http\Resources\Student\StudentOrderResource;
use App\Models\Student;
use App\Services\Course\CourseBundleService;
use App\Services\Course\CourseCategoryService;
use App\Services\Course\StudentCategoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Course categories as a student sees them: the tree behind Home's row and the
 * course filter, one category's page, and buying its course bundle.
 */
class CourseCategoryController extends Controller
{
    public function __construct(
        private readonly CourseCategoryService $categories,
        private readonly StudentCategoryService $studentCategories,
        private readonly CourseBundleService $bundles,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => StudentCourseCategoryResource::collection($this->categories->visibleTreeForStudents()),
        ]);
    }

    public function show(Request $request, string $category): JsonResponse
    {
        $student = $this->student($request);
        $found = $this->studentCategories->findForStudent($student, (int) $category);

        return response()->json([
            'data' => new StudentCategoryDetailResource($this->studentCategories->detail($student, $found)),
        ]);
    }

    /**
     * Buys the rest of the course bundle this category's courses are sold in —
     * its own, or its main category's when it follows that one. The same answer shape as
     * enrolling in a course, so the app hands it to the same checkout: an order
     * to pay, or `enrolled` when nothing is left to pay for. What the student
     * pays is summed from the courses they do not own, on the server
     * (root CLAUDE.md §7.3).
     */
    public function purchase(Request $request, string $category): JsonResponse
    {
        $student = $this->student($request);
        $bundle = $this->studentCategories->findForStudent($student, (int) $category)->bundleOwner();

        if ($bundle === null) {
            throw ValidationException::withMessages([
                'category' => 'These courses are sold one by one, not as a bundle.',
            ]);
        }

        $order = $this->bundles->purchase($student, $bundle);

        if ($order === null) {
            return response()->json(['data' => ['status' => 'enrolled', 'order' => null]]);
        }

        return response()->json([
            'data' => [
                'status' => 'payment_required',
                'order' => new StudentOrderResource($order->load(['payments', 'items'])),
            ],
        ], 201);
    }

    private function student(Request $request): Student
    {
        /** @var Student $student — guaranteed by the `student.actor` middleware. */
        $student = $request->user();

        return $student;
    }
}
