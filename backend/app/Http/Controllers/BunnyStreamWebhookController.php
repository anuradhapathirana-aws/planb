<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\CourseVideo;
use App\Services\Course\CourseVideoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Bunny tells us a lesson's encoding state changed.
 *
 * Two layers, and the second is the one that matters. Bunny signs each webhook
 * with the library's Read-Only API key, which is checked when configured. But
 * even a genuine body is treated as a *nudge*, never as fact: the only thing
 * taken from it is which video to go and look at, and the real status is then
 * read back from Bunny's API with our own key (CLAUDE.md §7.9). The webhook's
 * status codes are a different numbering from the API's anyway.
 *
 * Always answers 200. A webhook that errors is retried by Bunny, and there is
 * nothing here a retry would fix — the admin page's status poll covers a miss.
 */
class BunnyStreamWebhookController extends Controller
{
    public function __construct(private readonly CourseVideoService $videos) {}

    public function __invoke(Request $request): JsonResponse
    {
        if (! $this->hasValidSignature($request)) {
            Log::warning('Bunny Stream webhook ignored: signature missing or invalid.');

            return response()->json(['received' => true]);
        }

        $guid = $request->input('VideoGuid');
        $libraryId = (string) $request->input('VideoLibraryId');

        if (! is_string($guid) || $guid === '' || $libraryId !== (string) config('bunny.library_id')) {
            return response()->json(['received' => true]);
        }

        $video = CourseVideo::query()->where('external_id', $guid)->first();

        if ($video !== null) {
            $this->videos->refreshProcessingStatus($video);
        }

        return response()->json(['received' => true]);
    }

    /**
     * Bunny's v1 scheme: lowercase hex HMAC-SHA256 of the exact raw body.
     * Unconfigured means unchecked — the re-read above keeps that safe.
     */
    private function hasValidSignature(Request $request): bool
    {
        $key = (string) config('bunny.webhook_key');

        if ($key === '') {
            return true;
        }

        if ($request->header('X-BunnyStream-Signature-Version') !== 'v1'
            || $request->header('X-BunnyStream-Signature-Algorithm') !== 'hmac-sha256') {
            return false;
        }

        $expected = hash_hmac('sha256', $request->getContent(), $key);

        return hash_equals($expected, (string) $request->header('X-BunnyStream-Signature'));
    }
}
