<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\CourseVideo;
use App\Services\Course\CourseVideoService;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Serves the video bytes themselves. Deliberately outside the admin auth group:
 * a `<video>` element loads its source as a plain cross-origin request that
 * carries no session cookie, so the link's own signature is what authorizes it
 * (`signed` middleware, ~90-minute lifetime — CLAUDE.md §7.11).
 */
class CourseVideoPlaybackController extends Controller
{
    public function __construct(private readonly CourseVideoService $videos) {}

    public function __invoke(CourseVideo $video): BinaryFileResponse
    {
        return $this->videos->streamResponse($video);
    }
}
