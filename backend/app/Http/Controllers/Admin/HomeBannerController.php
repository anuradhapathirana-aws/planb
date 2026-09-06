<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ReorderHomeBannersRequest;
use App\Http\Requests\Settings\SaveHomeBannerRequest;
use App\Http\Requests\Settings\UploadHomeBannerImageRequest;
use App\Http\Resources\HomeBannerResource;
use App\Models\HomeBanner;
use App\Services\Settings\HomeBannerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Mobile configuration > Home banners — the student app's Home carousel.
 *
 * An ordered collection, not a singleton: `sort_order` is the carousel
 * position, and `reorder` rewrites the whole sequence from the list the client
 * is showing rather than reconciling per-row numbers.
 *
 * The image is uploaded separately from the wording, deliberately: a multi-MB
 * file riding along with every wording tweak would make saving a typo slow, and
 * a failed upload would take the wording with it. It also means a new slide has
 * to be created before its image can be attached — Media Library needs a saved
 * model with an id.
 */
class HomeBannerController extends Controller
{
    public function __construct(private readonly HomeBannerService $banners) {}

    public function index(): AnonymousResourceCollection
    {
        $this->authorize('view', HomeBanner::class);

        return HomeBannerResource::collection($this->banners->all());
    }

    public function show(HomeBanner $homeBanner): JsonResponse
    {
        $this->authorize('view', HomeBanner::class);

        return response()->json([
            'data' => new HomeBannerResource($homeBanner->load('linkedCourse')),
        ]);
    }

    public function store(SaveHomeBannerRequest $request): JsonResponse
    {
        return response()->json(
            ['data' => new HomeBannerResource($this->banners->create($request->validated()))],
            201,
        );
    }

    public function update(SaveHomeBannerRequest $request, HomeBanner $homeBanner): JsonResponse
    {
        return response()->json([
            'data' => new HomeBannerResource($this->banners->update($homeBanner, $request->validated())),
        ]);
    }

    public function destroy(HomeBanner $homeBanner): JsonResponse
    {
        $this->authorize('manage', HomeBanner::class);

        $this->banners->delete($homeBanner);

        return response()->json(null, 204);
    }

    public function reorder(ReorderHomeBannersRequest $request): AnonymousResourceCollection
    {
        /** @var list<int> $ids */
        $ids = $request->validated('ids');

        $this->banners->reorder($ids);

        // Answers with the new sequence so the client seeds from the server's
        // order rather than trusting the one it optimistically drew.
        return HomeBannerResource::collection($this->banners->all());
    }

    public function uploadImage(
        UploadHomeBannerImageRequest $request,
        HomeBanner $homeBanner,
    ): JsonResponse {
        return response()->json([
            'data' => new HomeBannerResource(
                $this->banners->updateImage($homeBanner, $request->file('image')),
            ),
        ]);
    }

    public function deleteImage(HomeBanner $homeBanner): JsonResponse
    {
        $this->authorize('manage', HomeBanner::class);

        return response()->json([
            'data' => new HomeBannerResource($this->banners->removeImage($homeBanner)),
        ]);
    }
}
