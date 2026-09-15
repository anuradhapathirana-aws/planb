<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Resources\Student\StudentAppConfigResource;
use App\Services\Settings\CompanySettingsService;
use Illuminate\Http\JsonResponse;

/**
 * The logo and intro the app shows on launch, set under Settings > App Intro.
 *
 * Public: it is fetched before the app knows whether a session exists.
 */
class AppConfigController extends Controller
{
    public function show(CompanySettingsService $settings): JsonResponse
    {
        return response()->json(['data' => new StudentAppConfigResource($settings->current())]);
    }
}
