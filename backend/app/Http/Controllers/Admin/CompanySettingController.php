<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateAppIntroRequest;
use App\Http\Requests\Settings\UpdateBankDetailsRequest;
use App\Http\Requests\Settings\UpdateWebsiteContentRequest;
use App\Http\Requests\Settings\UploadCommunityPosterRequest;
use App\Http\Requests\Settings\UploadCompanyLogoRequest;
use App\Http\Resources\BrandingResource;
use App\Http\Resources\CompanySettingResource;
use App\Models\CompanySetting;
use App\Services\Settings\CompanySettingsService;
use Illuminate\Http\JsonResponse;

/**
 * Settings > Bank Details, Settings > App Intro, and Website Configuration >
 * About Video.
 *
 * One singleton row, saved in separate halves so each settings page submits
 * only its own fields — and so the halves can carry different permissions: the
 * bank account decides where every student's money goes and is Super Admin
 * only, while the app intro and the website copy are content work.
 *
 * Images upload on their own endpoints, same as home banner artwork.
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

    public function updateWebsiteContent(UpdateWebsiteContentRequest $request): JsonResponse
    {
        return response()->json([
            'data' => new CompanySettingResource($this->settings->updateWebsiteContent($request->validated())),
        ]);
    }

    public function uploadCommunityPoster(UploadCommunityPosterRequest $request): JsonResponse
    {
        return response()->json([
            'data' => new CompanySettingResource(
                $this->settings->updateCommunityPoster($request->file('poster')),
            ),
        ]);
    }

    public function deleteCommunityPoster(): JsonResponse
    {
        $this->authorize('manageBranding', CompanySetting::class);

        return response()->json([
            'data' => new CompanySettingResource($this->settings->removeCommunityPoster()),
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
