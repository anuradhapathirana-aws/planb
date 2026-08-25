<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
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

        abort_unless($video->hasVideoFile(), 404);

        return response()->json(['data' => $this->videos->playbackUrl($video)]);
    }
}
