<?php

declare(strict_types=1);

namespace App\Services\Course;

use App\Enums\VideoProcessingStatus;
use App\Support\BunnyToken;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response as ClientResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

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
        try {
            $response = $this->request()->post("/library/{$this->libraryId()}/videos", [
                'title' => $title,
            ]);
        } catch (ConnectionException $e) {
            $this->fail('Video hosting could not be reached. Try again in a moment.', [
                'error' => $e->getMessage(),
            ]);
        }

        if ($response->failed()) {
            /*
             * Nearly always a configuration problem rather than a bug: a key
             * from a different library, a mistyped library id, or an account
             * with no balance. A bare 500 sent the admin to the developer; this
             * says which of those it is, and the status is in the log.
             */
            $this->fail(
                match ($response->status()) {
                    401, 403 => 'Video hosting refused the API key. Check BUNNY_STREAM_API_KEY and BUNNY_STREAM_LIBRARY_ID belong to the same library.',
                    404 => 'That video library was not found. Check BUNNY_STREAM_LIBRARY_ID.',
                    default => 'Video hosting rejected the upload ('.$response->status().'). Check the Bunny Stream account.',
                },
                ['status' => $response->status(), 'body' => Str::limit($response->body(), 300)],
            );
        }

        $guid = $response->json('guid');

        if (! is_string($guid) || $guid === '') {
            $this->fail('Video hosting returned an unexpected response.', [
                'body' => Str::limit($response->body(), 300),
            ]);
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
            /*
             * Bunny has no such video: it was deleted there, or this lesson
             * belongs to a library the current keys no longer point at (moving
             * to a different Bunny account does exactly that). Definitive, so
             * the lesson is marked failed and the admin is told to upload it
             * again — the alternative is a lesson stuck on "Processing" forever.
             */
            Log::warning('Bunny Stream does not know this video.', ['guid' => $guid]);

            return ['status' => VideoProcessingStatus::Failed, 'duration_seconds' => null];
        }

        if ($response->failed()) {
            // Status unknown, not failed: the scheduled refresh asks again in a
            // minute, so a wrong key or a blip must not mark a good lesson broken.
            Log::warning('Bunny Stream would not report a video status.', [
                'status' => $response->status(),
            ]);

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

    /**
     * Checks every configured value against Bunny, for `bunny:check`.
     *
     * Deliberately reports only pass/fail and a hint: the output of this is the
     * thing people paste into a chat window, so no key may appear in it.
     *
     * @return list<array{label: string, passed: bool, detail: string}>
     */
    public function diagnostics(): array
    {
        $results = [];
        $add = function (string $label, bool $passed, string $detail = '') use (&$results): void {
            $results[] = ['label' => $label, 'passed' => $passed, 'detail' => $detail];
        };

        $host = trim((string) config('bunny.cdn_hostname'), "/ \t\n\r\0\x0B");

        $add('Bunny Stream is switched on', (bool) config('bunny.enabled'), 'BUNNY_STREAM_ENABLED');
        $add('Library id is a number', ctype_digit($this->libraryId()), 'BUNNY_STREAM_LIBRARY_ID');
        $add(
            'CDN hostname looks right',
            (bool) preg_match('/^[a-z0-9.-]+\.b-cdn\.net$/i', $host),
            'BUNNY_STREAM_CDN_HOSTNAME, no https:// and no trailing slash',
        );

        if (! $this->enabled() || $host === '') {
            return $results;
        }

        $videos = "/library/{$this->libraryId()}/videos";
        $api = $this->safeGet($this->request(), $videos);
        $add('API key opens this library', $api?->successful() === true, $api === null ? 'could not reach Bunny' : 'HTTP '.$api->status().' — BUNNY_STREAM_API_KEY / library id');

        $webhookKey = (string) config('bunny.webhook_key');
        if ($webhookKey === '') {
            $add('Webhook key is set', false, 'BUNNY_STREAM_WEBHOOK_KEY is empty: webhooks are accepted unchecked');
        } else {
            $readOnly = $this->safeGet(
                Http::baseUrl((string) config('bunny.api_base_url'))->withHeaders(['AccessKey' => $webhookKey])->acceptJson()->timeout(15),
                $videos,
            );
            $add('Webhook key belongs to this library', $readOnly?->successful() === true, 'BUNNY_STREAM_WEBHOOK_KEY = the library\'s Read-Only API key');
            $add('Webhook key is not the full API key', $webhookKey !== $this->apiKey(), 'they must be different keys');
        }

        // A guid that cannot exist: the token gate answers before storage does,
        // so 403 means "refused" and anything else means "let through".
        $directory = '/00000000-0000-0000-0000-000000000000/';
        $unsigned = $this->safeGet(Http::timeout(15), "https://{$host}{$directory}playlist.m3u8");
        $add('Token authentication is ON at Bunny', $unsigned?->status() === 403, 'an unsigned link must be refused — pull zone → Security');

        if ((string) config('bunny.token_key') !== '') {
            $signed = $this->safeGet(Http::timeout(15), BunnyToken::directoryUrl(
                host: $host,
                path: "{$directory}playlist.m3u8",
                directory: $directory,
                securityKey: (string) config('bunny.token_key'),
                expires: time() + 300,
            ));
            $add('Token key signs links Bunny accepts', $signed !== null && $signed->status() !== 403, '403 means BUNNY_STREAM_TOKEN_KEY is the wrong key (use the pull zone key, not the embed key)');
        } else {
            $add('Token key is set', false, 'BUNNY_STREAM_TOKEN_KEY is empty');
        }

        return $results;
    }

    private function safeGet(PendingRequest $request, string $url): ?ClientResponse
    {
        try {
            return $request->get($url);
        } catch (ConnectionException) {
            return null;
        }
    }

    /**
     * Logs what Bunny actually said, then gives the admin a sentence they can
     * act on. 502 rather than 500: the failure is upstream, not in this app.
     *
     * @param  array<string, mixed>  $context
     * @return never
     */
    private function fail(string $message, array $context): void
    {
        Log::error('Bunny Stream call failed.', $context);

        abort(Response::HTTP_BAD_GATEWAY, $message);
    }

    private function request(): PendingRequest
    {
        return Http::baseUrl((string) config('bunny.api_base_url'))
            ->withHeaders(['AccessKey' => $this->apiKey()])
            ->acceptJson()
            ->timeout(15);
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
