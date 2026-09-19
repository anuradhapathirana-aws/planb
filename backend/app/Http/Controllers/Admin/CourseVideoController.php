<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Course\CompleteCourseVideoUploadRequest;
use App\Http\Requests\Course\UploadCourseVideoFileRequest;
use App\Http\Requests\Course\UploadCourseVideoThumbnailRequest;
use App\Http\Resources\CourseVideoResource;
use App\Models\CourseVideo;
use App\Services\Course\CourseVideoService;
use Illuminate\Http\JsonResponse;

/**
 * Lesson files are uploaded one at a time against an already-saved video row,
 * rather than inside the Course form's own submission — a course can carry
 * hundreds of megabytes of video, which no single form post would survive.
 */
class CourseVideoController extends Controller
{
    public function __construct(private readonly CourseVideoService $videos) {}

    public function uploadFile(UploadCourseVideoFileRequest $request, CourseVideo $video): JsonResponse
    {
        $updated = $this->videos->attachFile(
            $video,
            $request->file('file'),
            $request->integer('duration_seconds') ?: null,
        );

        return response()->json(['data' => new CourseVideoResource($updated)]);
    }

    /**
     * Credentials for the admin's browser to upload straight to Bunny Stream.
     *
     * The lesson file never passes through this server when Bunny is on — see
     * `CourseVideoService::createUploadTicket()`. The signature returned here
     * authorizes exactly one video id, for a few hours; the library API key that
     * produced it stays server-side.
     */
    public function uploadTicket(CourseVideo $video): JsonResponse
    {
        $this->authorize('update', $video->topic->programme);

        return response()->json(['data' => $this->videos->createUploadTicket($video)]);
    }

    /** Browser reports the upload finished; Bunny is probably still encoding. */
    public function completeUpload(CompleteCourseVideoUploadRequest $request, CourseVideo $video): JsonResponse
    {
        $updated = $this->videos->completeUpload($video, $request->integer('duration_seconds') ?: null);

        return response()->json(['data' => new CourseVideoResource($updated)]);
    }

    /** Lets the admin UI poll while a lesson transcodes. */
    public function processingStatus(CourseVideo $video): JsonResponse
    {
        $this->authorize('view', $video->topic->programme);

        return response()->json(['data' => new CourseVideoResource($this->videos->refreshProcessingStatus($video))]);
    }

    public function deleteFile(CourseVideo $video): JsonResponse
    {
        $this->authorize('update', $video->topic->programme);

        return response()->json(['data' => new CourseVideoResource($this->videos->removeFile($video))]);
    }

    public function uploadThumbnail(UploadCourseVideoThumbnailRequest $request, CourseVideo $video): JsonResponse
    {
        $updated = $this->videos->updateThumbnail($video, $request->file('thumbnail'));

        return response()->json(['data' => new CourseVideoResource($updated)]);
    }

    public function deleteThumbnail(CourseVideo $video): JsonResponse
    {
        $this->authorize('update', $video->topic->programme);

        return response()->json(['data' => new CourseVideoResource($this->videos->removeThumbnail($video))]);
    }

    /**
     * Hands back a short-lived signed playback link rather than a file URL, so
     * the admin preview player uses exactly the same path the student app will.
     */
    public function stream(CourseVideo $video): JsonResponse
    {
        $this->authorize('view', $video->topic->programme);

        abort_unless($video->isPlayable(), 404);

        return response()->json(['data' => $this->videos->playbackUrl($video)]);
    }
}
