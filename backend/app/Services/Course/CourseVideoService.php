<?php

declare(strict_types=1);

namespace App\Services\Course;

use App\Enums\VideoProvider;
use App\Models\CourseVideo;
use App\Models\Student;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Intervention\Image\ImageManager;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;

class CourseVideoService
{
    /** Playback links stay well inside the 2-hour ceiling in CLAUDE.md §7.11. */
    private const SIGNED_URL_MINUTES = 90;

    /**
     * Student links are shorter-lived than the admin preview's. A shared link is
     * still playable for its lifetime — that is inherent to handing a URL to a
     * platform video player — so the window is kept small. The real fix is Bunny
     * Stream token auth, which would change only this method.
     */
    private const STUDENT_URL_MINUTES = 30;

    public function attachFile(CourseVideo $video, UploadedFile $file, ?int $durationSeconds = null): CourseVideo
    {
        $video->addMedia($file->getRealPath())
            ->usingFileName($this->safeFileName($video, $file))
            ->withCustomProperties(['original_name' => $file->getClientOriginalName()])
            ->toMediaCollection(CourseVideo::VIDEO_COLLECTION);

        $video->update([
            'provider' => VideoProvider::Upload,
            'external_url' => null,
            // The browser reads duration off the file before uploading, which is
            // both more accurate and far cheaper than probing it server-side.
            'duration_seconds' => $durationSeconds ?? $video->duration_seconds,
        ]);

        return $video->fresh(['media']);
    }

    public function removeFile(CourseVideo $video): CourseVideo
    {
        $video->clearMediaCollection(CourseVideo::VIDEO_COLLECTION);
        $video->update(['duration_seconds' => null]);

        return $video->fresh(['media']);
    }

    /**
     * Re-encodes the thumbnail before storage (CLAUDE.md §7.4) — same treatment
     * student profile photos get, so no admin-supplied bytes are served as-is.
     */
    public function updateThumbnail(CourseVideo $video, UploadedFile $file): CourseVideo
    {
        $encoded = ImageManager::gd()
            ->read($file->getRealPath())
            ->cover(1280, 720)
            ->toJpeg(82);

        $tempPath = tempnam(sys_get_temp_dir(), 'planb_video_thumb_').'.jpg';
        file_put_contents($tempPath, (string) $encoded);

        $video->addMedia($tempPath)
            ->usingFileName('video-'.$video->id.'-thumb.jpg')
            ->toMediaCollection(CourseVideo::THUMBNAIL_COLLECTION);

        return $video->fresh(['media']);
    }

    public function removeThumbnail(CourseVideo $video): CourseVideo
    {
        $video->clearMediaCollection(CourseVideo::THUMBNAIL_COLLECTION);

        return $video->fresh(['media']);
    }

    /**
     * Short-lived signed playback link. The player is given this instead of a
     * file URL so a copied link stops working, and so swapping storage for Bunny
     * Stream later changes only what this method returns.
     *
     * Passing a `$student` shortens the window and stamps their id into the
     * signature, so the byte route can re-check the block flag at play time.
     *
     * @return array{url: string, expires_at: string}
     */
    public function playbackUrl(CourseVideo $video, ?Student $student = null): array
    {
        $minutes = $student !== null ? self::STUDENT_URL_MINUTES : self::SIGNED_URL_MINUTES;
        $expiresAt = now()->addMinutes($minutes);

        if ($video->provider === VideoProvider::External && $video->external_url !== null) {
            return ['url' => $video->external_url, 'expires_at' => $expiresAt->toIso8601String()];
        }

        $parameters = ['video' => $video->id];

        if ($student !== null) {
            $parameters['student'] = $student->id;
        }

        return [
            'url' => URL::temporarySignedRoute('course-videos.playback', $expiresAt, $parameters),
            'expires_at' => $expiresAt->toIso8601String(),
        ];
    }

    /**
     * Serves the file itself. Symfony resolves `Range` requests on a file
     * response, which is what lets the player seek and buffer in chunks instead
     * of pulling the whole lesson down before it can start.
     */
    public function streamResponse(CourseVideo $video): BinaryFileResponse
    {
        $media = $video->videoMedia();

        abort_if($media === null, Response::HTTP_NOT_FOUND);

        $path = $media->getPath();

        abort_unless(is_file($path), Response::HTTP_NOT_FOUND);

        return response()->file($path, [
            'Content-Type' => $media->mime_type,
            'Accept-Ranges' => 'bytes',
            // Signed URLs expire, so nothing downstream should hold a copy.
            'Cache-Control' => 'private, no-store',
            'Content-Disposition' => 'inline',
        ]);
    }

    /** Keeps the stored name predictable and free of anything path-like. */
    private function safeFileName(CourseVideo $video, UploadedFile $file): string
    {
        $extension = strtolower($file->getClientOriginalExtension()) ?: 'mp4';

        return Str::slug('video-'.$video->id.'-'.$video->title).'.'.$extension;
    }
}
