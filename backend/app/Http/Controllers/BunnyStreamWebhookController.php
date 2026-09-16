<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\CourseVideo;
use App\Services\Course\CourseVideoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Bunny tells us a lesson finished encoding.
 *
 * Unlike a payment webhook there is no signature to verify — Bunny does not
 * sign these — so the body is treated as a *nudge*, never as fact: the only
 * thing taken from it is which video to go and look at, and the real status is
 * then read back from Bunny's API with our own key (CLAUDE.md §7.9).
 *
 * That makes a forged call harmless. The worst it can do is make us re-read a
 * status we already had, which is why it is rate-limited rather than secret.
 *
 * Always answers 200. A webhook that errors is retried by Bunny forever, and
 * there is nothing here a retry would fix — the status poll covers a miss.
 */
class BunnyStreamWebhookController extends Controller
{
    public function __construct(private readonly CourseVideoService $videos) {}

    public function __invoke(Request $request): JsonResponse
    {
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
}
