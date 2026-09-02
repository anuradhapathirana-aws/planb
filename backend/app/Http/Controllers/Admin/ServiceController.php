<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Service\StoreServiceRequest;
use App\Http\Requests\Service\UpdateServiceRequest;
use App\Http\Requests\Service\UploadServiceThumbnailRequest;
use App\Http\Resources\ServiceResource;
use App\Models\Service;
use App\Services\Service\ServiceCatalogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    public function __construct(private readonly ServiceCatalogService $services) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Service::class);

        $paginated = $this->services->list($request->only([
            'search', 'status', 'sort', 'direction', 'per_page',
        ]));

        return response()->json([
            'data' => ServiceResource::collection($paginated->items()),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    public function store(StoreServiceRequest $request): JsonResponse
    {
        $service = $this->services->create($request->validated());

        return response()->json(['data' => new ServiceResource($service)], 201);
    }

    public function show(Service $service): JsonResponse
    {
        $this->authorize('view', $service);

        return response()->json(['data' => new ServiceResource($this->services->loadDetail($service))]);
    }

    public function update(UpdateServiceRequest $request, Service $service): JsonResponse
    {
        $updated = $this->services->update($service, $request->validated());

        return response()->json(['data' => new ServiceResource($updated)]);
    }

    public function destroy(Service $service): JsonResponse
    {
        $this->authorize('delete', $service);

        $this->services->delete($service);

        return response()->json(null, 204);
    }

    /**
     * Catalogue art. Uploaded against a saved service rather than inside the
     * form's own submit, so a multi-MB image does not ride along with every
     * wording change — the arrangement course art already uses.
     */
    public function uploadThumbnail(UploadServiceThumbnailRequest $request, Service $service): JsonResponse
    {
        $updated = $this->services->updateThumbnail($service, $request->file('thumbnail'));

        return response()->json(['data' => new ServiceResource($updated)]);
    }

    public function deleteThumbnail(Service $service): JsonResponse
    {
        $this->authorize('update', $service);

        return response()->json(['data' => new ServiceResource($this->services->removeThumbnail($service))]);
    }

    public function publish(Service $service): JsonResponse
    {
        $this->authorize('update', $service);

        return response()->json(['data' => new ServiceResource($this->services->publish($service))]);
    }

    public function unpublish(Service $service): JsonResponse
    {
        $this->authorize('update', $service);

        return response()->json(['data' => new ServiceResource($this->services->unpublish($service))]);
    }
}
