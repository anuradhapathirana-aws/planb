<?php

declare(strict_types=1);

namespace App\Services\Course;

use App\Enums\VideoProcessingStatus;
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
    public function __construct(private readonly BunnyStreamClient $bunny) {}

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
            'external_id' => null,
            // A local file is playable the moment it lands; only Bunny has an
            // encoding step to wait for.
            'processing_status' => VideoProcessingStatus::Ready,
            // The browser reads duration off the file before uploading, which is
            // both more accurate and far cheaper than probing it server-side.
            'duration_seconds' => $durationSeconds ?? $video->duration_seconds,
        ]);

        return $video->fresh(['media']);
    }

    /**
     * Reserves a Bunny video id and returns credentials the admin's browser
     * uploads against directly.
     *
     * The file never passes through this server: 100 GB of lessons would
     * otherwise cost the VPS its bandwidth twice over, need temp disk, and hit
     * PHP's upload limits. Any previous file for this lesson is cleared first so
     * a re-upload cannot leave two copies billing storage.
     *
     * @return array{endpoint: string, library_id: string, video_id: string, signature: string, expires: int, resolutions: string}
     */
    public function createUploadTicket(CourseVideo $video): array
    {
        abort_unless($this->bunny->enabled(), Response::HTTP_CONFLICT, 'Video hosting is not configured.');

        $this->discardExistingFile($video);

        $guid = $this->bunny->createVideo($video->title);

        $video->update([
            'provider' => VideoProvider::External,
            'external_url' => null,
            'external_id' => $guid,
            'processing_status' => VideoProcessingStatus::Pending,
        ]);

        return $this->bunny->uploadTicket($guid);
    }

    /**
     * Called once the browser finishes pushing bytes. Bunny is still encoding at
     * this point, so the lesson is marked processing rather than ready — the
     * webhook (or the next status read) promotes it.
     */
    public function completeUpload(CourseVideo $video, ?int $durationSeconds = null): CourseVideo
    {
        abort_unless($video->external_id !== null, Response::HTTP_CONFLICT, 'This lesson has no upload in progress.');

        $video->update([
            'processing_status' => VideoProcessingStatus::Processing,
            'duration_seconds' => $durationSeconds ?? $video->duration_seconds,
        ]);

        return $this->refreshProcessingStatus($video);
    }

    /**
     * Reads the true encoding state from Bunny and stores it.
     *
     * Deliberately ignores whatever a webhook body said: Bunny's webhook carries
     * no signature we can verify, so it is a nudge to come and look, never a
     * fact to write (CLAUDE.md §7.9).
     */
    public function refreshProcessingStatus(CourseVideo $video): CourseVideo
    {
        if (! $video->isRemotelyHosted() || ! $this->bunny->enabled()) {
            return $video;
        }

        $remote = $this->bunny->fetchVideo($video->external_id);

        if ($remote === null) {
            return $video;
        }

        $video->update([
            'processing_status' => $remote['status'],
            // Bunny's own measurement beats the browser's estimate, and the
            // no-skip rule is computed against this number.
            'duration_seconds' => $remote['duration_seconds'] ?? $video->duration_seconds,
        ]);

        return $video->fresh(['media']);
    }

    public function removeFile(CourseVideo $video): CourseVideo
    {
        $this->discardExistingFile($video);

        $video->update([
            'duration_seconds' => null,
            'processing_status' => VideoProcessingStatus::Ready,
        ]);

        return $video->fresh(['media']);
    }

    /**
     * Drops whichever copy exists — local file, remote video, or both after a
     * half-finished migration. Bunny bills storage until the video is deleted
     * there, so an abandoned upload must not be left behind.
     */
    private function discardExistingFile(CourseVideo $video): void
    {
        $video->clearMediaCollection(CourseVideo::VIDEO_COLLECTION);

        if ($video->external_id !== null && $this->bunny->enabled()) {
            $this->bunny->deleteVideo($video->external_id);
        }

        $video->update(['external_id' => null]);
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

        /*
         * Bunny-hosted: a token-signed HLS playlist. The token covers the whole
         * `/{guid}/` directory because a player fetches the playlist and then
         * every segment listed inside it, and those segment names are relative —
         * a query-string token would be dropped on all of them.
         *
         * The trade-off to know about: these bytes never touch this server, so
         * the mid-session block re-check in CourseVideoPlaybackController cannot
         * run. A student blocked during a lesson keeps playing until the token
         * expires, which is why the student window is the short one.
         */
        if ($video->isRemotelyHosted() && $this->bunny->enabled()) {
            return [
                'url' => $this->bunny->playbackUrl($video->external_id, $expiresAt->getTimestamp()),
                'expires_at' => $expiresAt->toIso8601String(),
            ];
        }

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
