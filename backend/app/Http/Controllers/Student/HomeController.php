<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Resources\Student\StudentHomeBannerResource;
use App\Services\Settings\HomeBannerService;
use Illuminate\Http\JsonResponse;

/**
 * Home screen content that is not already served by another tab's endpoint.
 *
 * Today that is just the banner. The screen's two progress summaries come from
 * `GET /student/courses` and `GET /student/checklists` — the *same* requests the
 * Courses and Checklists tabs use, so Home warms their caches instead of
 * duplicating their data behind a third shape that could disagree with them.
 */
class HomeController extends Controller
{
    public function banner(HomeBannerService $banners): JsonResponse
    {
        $banner = $banners->forStudents();

        // Null is a normal answer — nothing set up, switched off, or no image.
        // The app has its own branded hero for all three.
        return response()->json([
            'data' => $banner === null ? null : new StudentHomeBannerResource($banner),
        ]);
    }
}
