<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ReorderSiteHeroSlidesRequest;
use App\Http\Requests\Settings\SaveSiteHeroSlideRequest;
use App\Http\Requests\Settings\UploadSiteHeroSlideImageRequest;
use App\Http\Resources\SiteHeroSlideResource;
use App\Models\SiteHeroSlide;
use App\Services\Settings\SiteHeroSlideService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Website Configuration > Hero Slider — the public site's hero.
 *
 * Shaped exactly like {@see HomeBannerController}, which manages the mobile
 * app's carousel: an ordered collection where `sort_order` is the position, and
 * `reorder` rewrites the whole sequence from the list the client is showing
 * rather than reconciling per-row numbers.
 *
 * The image uploads separately from the wording, deliberately: a multi-MB file
 * riding along with every wording tweak would make fixing a typo slow, and a
 * failed upload would take the wording with it. It also means a new slide has
 * to be created before it can be given artwork — Media Library needs a saved
 * model with an id.
 */
class SiteHeroSlideController extends Controller
{
    public function __construct(private readonly SiteHeroSlideService $slides) {}

    public function index(): AnonymousResourceCollection
    {
        $this->authorize('view', SiteHeroSlide::class);

        return SiteHeroSlideResource::collection($this->slides->all());
    }

    public function show(SiteHeroSlide $siteHeroSlide): JsonResponse
    {
        $this->authorize('view', SiteHeroSlide::class);

        return response()->json([
            'data' => new SiteHeroSlideResource(
                $siteHeroSlide->load(['primaryCtaCourse', 'secondaryCtaCourse']),
            ),
        ]);
    }

    public function store(SaveSiteHeroSlideRequest $request): JsonResponse
    {
        return response()->json(
            ['data' => new SiteHeroSlideResource($this->slides->create($request->validated()))],
            201,
        );
    }

    public function update(SaveSiteHeroSlideRequest $request, SiteHeroSlide $siteHeroSlide): JsonResponse
    {
        return response()->json([
            'data' => new SiteHeroSlideResource($this->slides->update($siteHeroSlide, $request->validated())),
        ]);
    }

    public function destroy(SiteHeroSlide $siteHeroSlide): JsonResponse
    {
        $this->authorize('manage', SiteHeroSlide::class);

        $this->slides->delete($siteHeroSlide);

        return response()->json(null, 204);
    }

    public function reorder(ReorderSiteHeroSlidesRequest $request): AnonymousResourceCollection
    {
        /** @var list<int> $ids */
        $ids = $request->validated('ids');

        $this->slides->reorder($ids);

        // Answers with the new sequence so the client seeds from the server's
        // order rather than trusting the one it optimistically drew.
        return SiteHeroSlideResource::collection($this->slides->all());
    }

    public function uploadImage(
        UploadSiteHeroSlideImageRequest $request,
        SiteHeroSlide $siteHeroSlide,
    ): JsonResponse {
        return response()->json([
            'data' => new SiteHeroSlideResource(
                $this->slides->updateImage($siteHeroSlide, $request->file('image')),
            ),
        ]);
    }

    public function deleteImage(SiteHeroSlide $siteHeroSlide): JsonResponse
    {
        $this->authorize('manage', SiteHeroSlide::class);

        return response()->json([
            'data' => new SiteHeroSlideResource($this->slides->removeImage($siteHeroSlide)),
        ]);
    }
}
