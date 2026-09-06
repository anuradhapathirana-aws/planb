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
 * Today that is just the carousel. The screen's two progress summaries come from
 * `GET /student/courses` and `GET /student/checklists` — the *same* requests the
 * Courses and Checklists tabs use, so Home warms their caches instead of
 * duplicating their data behind a third shape that could disagree with them.
 */
class HomeController extends Controller
{
    /**
     * The Home carousel, in the admin's order.
     *
     * An empty array is a normal answer — nothing set up, every slide switched
     * off, or none of them has an image. The app falls back to its own branded
     * hero rather than showing a gap, so this never needs to invent a slide.
     */
    public function banners(HomeBannerService $banners): JsonResponse
    {
        return response()->json([
            'data' => StudentHomeBannerResource::collection($banners->liveForStudents()),
        ]);
    }
}
