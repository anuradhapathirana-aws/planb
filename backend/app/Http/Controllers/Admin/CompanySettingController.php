<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateAppIntroRequest;
use App\Http\Requests\Settings\UpdateBankDetailsRequest;
use App\Http\Requests\Settings\UploadCompanyLogoRequest;
use App\Http\Resources\BrandingResource;
use App\Http\Resources\CompanySettingResource;
use App\Models\CompanySetting;
use App\Services\Settings\CompanySettingsService;
use Illuminate\Http\JsonResponse;

/**
 * Settings > Bank Details and Settings > App Intro.
 *
 * One singleton row, saved in two halves so each settings page submits only
 * its own fields — and so the two halves can carry different permissions.
 * The logo uploads on its own endpoint, same as home banner images.
 */
class CompanySettingController extends Controller
{
    public function __construct(private readonly CompanySettingsService $settings) {}

    public function show(): JsonResponse
    {
        $this->authorize('view', CompanySetting::class);

        return response()->json(['data' => new CompanySettingResource($this->settings->current())]);
    }

    public function updateBankDetails(UpdateBankDetailsRequest $request): JsonResponse
    {
        return response()->json([
            'data' => new CompanySettingResource($this->settings->updateBankDetails($request->validated())),
        ]);
    }

    public function updateAppIntro(UpdateAppIntroRequest $request): JsonResponse
    {
        return response()->json([
            'data' => new CompanySettingResource($this->settings->updateAppIntro($request->validated())),
        ]);
    }

    public function uploadLogo(UploadCompanyLogoRequest $request): JsonResponse
    {
        return response()->json([
            'data' => new CompanySettingResource($this->settings->updateLogo($request->file('logo'))),
        ]);
    }

    public function deleteLogo(): JsonResponse
    {
        $this->authorize('manageBranding', CompanySetting::class);

        return response()->json(['data' => new CompanySettingResource($this->settings->removeLogo())]);
    }

    /**
     * The logo alone, unauthenticated, for the admin sign-in page — which is
     * shown before there is a session to authorize anything with.
     */
    public function branding(): JsonResponse
    {
        return response()->json(['data' => new BrandingResource($this->settings->current())]);
    }
}
