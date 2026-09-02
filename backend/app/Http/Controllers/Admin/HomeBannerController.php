<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\SaveHomeBannerRequest;
use App\Http\Requests\Settings\UploadHomeBannerImageRequest;
use App\Http\Resources\HomeBannerResource;
use App\Models\HomeBanner;
use App\Services\Settings\HomeBannerService;
use Illuminate\Http\JsonResponse;

/**
 * The student app's Home hero banner. A singleton, so there is no index and no
 * `{banner}` parameter — the same shape as the checklist phases, which are also
 * edited as one document rather than browsed as a collection.
 *
 * The image is uploaded separately from the text, deliberately: a multi-MB file
 * riding along with every wording tweak would make saving a typo slow, and a
 * failed upload would take the wording with it.
 */
class HomeBannerController extends Controller
{
    public function __construct(private readonly HomeBannerService $banner) {}

    public function show(): JsonResponse
    {
        $this->authorize('view', HomeBanner::class);

        return response()->json(['data' => new HomeBannerResource($this->banner->current())]);
    }

    public function update(SaveHomeBannerRequest $request): JsonResponse
    {
        return response()->json([
            'data' => new HomeBannerResource($this->banner->save($request->validated())),
        ]);
    }

    public function uploadImage(UploadHomeBannerImageRequest $request): JsonResponse
    {
        return response()->json([
            'data' => new HomeBannerResource($this->banner->updateImage($request->file('image'))),
        ]);
    }

    public function deleteImage(): JsonResponse
    {
        $this->authorize('manage', HomeBanner::class);

        return response()->json(['data' => new HomeBannerResource($this->banner->removeImage())]);
    }
}
