<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Student\ImportStudentsRequest;
use App\Http\Requests\Student\StoreStudentRequest;
use App\Http\Requests\Student\UpdateStudentRequest;
use App\Http\Requests\Student\UploadStudentPhotoRequest;
use App\Http\Resources\StudentResource;
use App\Models\Student;
use App\Services\Student\StudentManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentManagementController extends Controller
{
    public function __construct(private readonly StudentManagementService $students) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Student::class);

        $paginated = $this->students->list($request->only([
            'search', 'status', 'visa_status', 'sort', 'direction', 'per_page',
        ]));

        return response()->json([
            'data' => StudentResource::collection($paginated->items()),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    public function store(StoreStudentRequest $request): JsonResponse
    {
        $student = $this->students->create([
            ...$request->validated(),
            'imported_by' => $request->user()->id,
        ]);

        return response()->json(['data' => new StudentResource($student)], 201);
    }

    public function show(Student $student): JsonResponse
    {
        $this->authorize('view', $student);

        return response()->json(['data' => new StudentResource($student->load(['importedBy', 'industry', 'profession']))]);
    }

    public function update(UpdateStudentRequest $request, Student $student): JsonResponse
    {
        $updated = $this->students->update($student, $request->validated());

        return response()->json(['data' => new StudentResource($updated)]);
    }

    public function destroy(Student $student): JsonResponse
    {
        $this->authorize('delete', $student);

        $this->students->delete($student);

        return response()->json(['message' => 'Student record removed.']);
    }

    public function block(Student $student): JsonResponse
    {
        $this->authorize('update', $student);

        return response()->json(['data' => new StudentResource($this->students->block($student))]);
    }

    public function unblock(Student $student): JsonResponse
    {
        $this->authorize('update', $student);

        return response()->json(['data' => new StudentResource($this->students->unblock($student))]);
    }

    public function uploadPhoto(UploadStudentPhotoRequest $request, Student $student): JsonResponse
    {
        $updated = $this->students->updatePhoto($student, $request->file('photo'));

        return response()->json(['data' => new StudentResource($updated)]);
    }

    public function deletePhoto(Student $student): JsonResponse
    {
        $this->authorize('update', $student);

        return response()->json(['data' => new StudentResource($this->students->removePhoto($student))]);
    }

    public function import(ImportStudentsRequest $request): JsonResponse
    {
        $result = $this->students->import($request->file('file'), $request->user());

        return response()->json(['data' => $result]);
    }

    public function nextId(): JsonResponse
    {
        $this->authorize('create', Student::class);

        return response()->json(['data' => ['student_id' => $this->students->previewNextStudentId()]]);
    }

    public function stats(): JsonResponse
    {
        $this->authorize('viewAny', Student::class);

        return response()->json([
            'data' => [
                'total' => Student::count(),
                'registered' => Student::whereNotNull('registered_at')->count(),
                'pending_registration' => Student::whereNull('registered_at')->count(),
                'blocked' => Student::where('is_blocked', true)->count(),
                'new_this_month' => Student::where('created_at', '>=', now()->startOfMonth())->count(),
            ],
        ]);
    }
}
