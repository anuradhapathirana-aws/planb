<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Requests\Student\UpdateStudentProfileRequest;
use App\Http\Requests\Student\UploadProfilePhotoRequest;
use App\Http\Resources\Student\StudentProfileResource;
use App\Models\Student;
use App\Services\Student\StudentManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function __construct(private readonly StudentManagementService $students) {}

    public function show(Request $request): JsonResponse
    {
        return $this->respond($this->student($request));
    }

    public function update(UpdateStudentProfileRequest $request): JsonResponse
    {
        $student = $this->student($request);

        $student->update($request->validated());

        return $this->respond($student->fresh(['industry', 'profession']));
    }

    /**
     * Reuses the admin path so a student's photo gets exactly the same treatment
     * — Intervention re-encode to 600×600 before storage (CLAUDE.md §7.4), same
     * single-file `profile_photo` collection.
     */
    public function uploadPhoto(UploadProfilePhotoRequest $request): JsonResponse
    {
        $student = $this->students->updatePhoto($this->student($request), $request->file('photo'));

        return $this->respond($student->load(['industry', 'profession']));
    }

    public function deletePhoto(Request $request): JsonResponse
    {
        $student = $this->students->removePhoto($this->student($request));

        return $this->respond($student->load(['industry', 'profession']));
    }

    private function respond(Student $student): JsonResponse
    {
        return response()->json([
            'data' => new StudentProfileResource($student->loadMissing(['industry', 'profession'])),
        ]);
    }

    private function student(Request $request): Student
    {
        /** @var Student $student — guaranteed by the `student.actor` middleware. */
        $student = $request->user();

        return $student;
    }
}
