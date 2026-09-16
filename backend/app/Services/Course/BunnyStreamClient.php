<?php

declare(strict_types=1);

namespace App\Services\Course;

use App\Enums\VideoProcessingStatus;
use App\Support\BunnyToken;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * The only place in the application that talks to Bunny Stream.
 *
 * Same rule the payment gateways follow (CLAUDE.md §8): no controller, job or
 * other service calls the provider directly, so swapping Bunny for another host
 * — or back to self-hosting — is a change to this class and nothing else.
 *
 * The API key is a master credential for the whole library and never leaves the
 * server. Browsers get `uploadTicket()`, a per-video signature that expires.
 */
class BunnyStreamClient
{
    public function enabled(): bool
    {
        return (bool) config('bunny.enabled')
            && $this->libraryId() !== ''
            && $this->apiKey() !== '';
    }

    /**
     * Registers a video and returns its guid. Nothing is uploaded here — this
     * reserves the id that the browser then pushes bytes at.
     */
    public function createVideo(string $title): string
    {
        $response = $this->request()->post("/library/{$this->libraryId()}/videos", [
            'title' => $title,
        ]);

        $guid = $response->json('guid');

        if (! is_string($guid) || $guid === '') {
            throw new RuntimeException('Bunny Stream did not return a video id.');
        }

        return $guid;
    }

    /**
     * Credentials for a direct browser → Bunny resumable upload.
     *
     * The signature covers the video id and the expiry, so it authorizes bytes
     * for exactly one video and stops working afterwards. Bunny defines the
     * hash as sha256(library_id + api_key + expiry + video_id); the api key is
     * an input to the hash, never part of the output.
     *
     * @return array{endpoint: string, library_id: string, video_id: string, signature: string, expires: int, resolutions: string}
     */
    public function uploadTicket(string $guid): array
    {
        $expires = now()->addMinutes((int) config('bunny.upload_ticket_minutes'))->getTimestamp();

        return [
            'endpoint' => (string) config('bunny.tus_endpoint'),
            'library_id' => $this->libraryId(),
            'video_id' => $guid,
            'signature' => hash('sha256', $this->libraryId().$this->apiKey().$expires.$guid),
            'expires' => $expires,
            'resolutions' => (string) config('bunny.resolutions'),
        ];
    }

    /**
     * Current encoding state, read from Bunny rather than from whatever a
     * webhook body claimed. A Bunny webhook carries no signature we can verify,
     * so it is treated as a nudge to come and look, never as fact (CLAUDE.md §7.9).
     *
     * @return array{status: VideoProcessingStatus, duration_seconds: int|null}|null
     */
    public function fetchVideo(string $guid): ?array
    {
        try {
            $response = $this->request()->get("/library/{$this->libraryId()}/videos/{$guid}");
        } catch (ConnectionException $e) {
            Log::warning('Bunny Stream unreachable while reading video status.', ['error' => $e->getMessage()]);

            return null;
        }

        if ($response->status() === 404) {
            return null;
        }

        $length = $response->json('length');

        return [
            'status' => VideoProcessingStatus::fromBunnyStatus((int) $response->json('status')),
            // Bunny reports 0 until encoding has read the file.
            'duration_seconds' => is_numeric($length) && (int) $length > 0 ? (int) $length : null,
        ];
    }

    /**
     * Removes the video from Bunny. Storage is billed for as long as a video
     * exists, so a lesson deleted here must not survive there.
     */
    public function deleteVideo(string $guid): void
    {
        try {
            $this->request()->delete("/library/{$this->libraryId()}/videos/{$guid}");
        } catch (ConnectionException $e) {
            // Losing the local row matters more than a stray remote file; the
            // orphan is recoverable from the dashboard, a failed delete here
            // would block the admin from removing a lesson.
            Log::warning('Bunny Stream delete failed; video may be orphaned.', [
                'guid' => $guid,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Short-lived adaptive-streaming URL for a guid.
     *
     * Returns the HLS playlist rather than an MP4: the player then picks a
     * rendition per segment, which is what keeps a student on weak mobile data
     * watching instead of buffering.
     */
    public function playbackUrl(string $guid, int $expiresAt): string
    {
        $host = trim((string) config('bunny.cdn_hostname'), "/ \t\n\r\0\x0B");

        if ($host === '') {
            throw new RuntimeException('Bunny Stream CDN hostname is not configured.');
        }

        return BunnyToken::directoryUrl(
            host: $host,
            path: "/{$guid}/playlist.m3u8",
            directory: "/{$guid}/",
            securityKey: (string) config('bunny.token_key'),
            expires: $expiresAt,
        );
    }

    private function request(): PendingRequest
    {
        return Http::baseUrl((string) config('bunny.api_base_url'))
            ->withHeaders(['AccessKey' => $this->apiKey()])
            ->acceptJson()
            ->timeout(15)
            ->throw();
    }

    private function libraryId(): string
    {
        return (string) config('bunny.library_id');
    }

    private function apiKey(): string
    {
        return (string) config('bunny.api_key');
    }
}
