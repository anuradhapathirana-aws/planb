<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Resources\Student\StudentExchangeRateResource;
use App\Http\Resources\Student\StudentHomeBannerResource;
use App\Jobs\RefreshExchangeRate;
use App\Services\Exchange\ExchangeRateService;
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

    /**
     * The LKR/AED rate behind Home's converter.
     *
     * Reads the cache and nothing else - the provider is only ever called from
     * a queued job (root CLAUDE.md §4.7), so a slow or broken currency feed can
     * neither delay this response nor fail it.
     *
     * `{"data": null}` is a normal answer, the same way an empty banner list is:
     * it covers a cold cache and a provider that has never answered, and the app
     * simply does not draw the rate. A 503 here would surface as an error toast
     * on the most-opened screen in the app over a feature nobody asked for yet.
     * A cold cache also dispatches the refresh, so the next open has a number
     * rather than waiting for the scheduler.
     */
    public function exchangeRate(ExchangeRateService $rates): JsonResponse
    {
        $rate = $rates->current();

        if ($rate === null) {
            // Unique-for-5-minutes, so a crowd of cold-cache requests queues one
            // job between them rather than one each.
            RefreshExchangeRate::dispatch();

            return response()->json(['data' => null]);
        }

        return response()->json(['data' => new StudentExchangeRateResource($rate)]);
    }
}
