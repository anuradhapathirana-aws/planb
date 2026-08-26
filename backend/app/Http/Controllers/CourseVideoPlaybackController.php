<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\CourseVideo;
use App\Models\Student;
use App\Services\Course\CourseVideoService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * Serves the video bytes themselves. Deliberately outside the admin auth group:
 * a `<video>` element (and a native player) loads its source as a plain request
 * that carries no session cookie or bearer header, so the link's own signature
 * is what authorizes it (`signed` middleware — CLAUDE.md §7.11).
 */
class CourseVideoPlaybackController extends Controller
{
    public function __construct(private readonly CourseVideoService $videos) {}

    public function __invoke(Request $request, CourseVideo $video): BinaryFileResponse
    {
        /*
         * Student links carry the student id inside the signature, so it cannot be
         * swapped for someone else's without invalidating the URL. Re-checking here
         * means a student blocked *after* their link was issued stops playing
         * immediately, rather than at the 30-minute expiry.
         */
        $studentId = $request->integer('student');

        if ($studentId > 0) {
            abort_unless(
                Student::active()->whereKey($studentId)->exists(),
                Response::HTTP_FORBIDDEN,
            );
        }

        return $this->videos->streamResponse($video);
    }
}
