<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Resources\Student\LearnerAvatarResource;
use App\Models\Student;
use App\Services\Student\LearnerAvatarService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LearnerController extends Controller
{
    /**
     * Photos of a few other learners, for the avatar stack on Course Details.
     *
     * An empty array is a normal answer on a fresh install, and the app handles
     * it — the student's own photo leads the stack either way.
     */
    public function __invoke(Request $request, LearnerAvatarService $avatars): JsonResponse
    {
        /** @var Student $student */
        $student = $request->user();

        return response()->json([
            'data' => LearnerAvatarResource::collection($avatars->recent($student)),
        ]);
    }
}
