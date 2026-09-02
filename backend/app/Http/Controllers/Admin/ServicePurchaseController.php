<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\ServicePurchaseStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Service\AdvanceServicePurchaseRequest;
use App\Http\Resources\ServicePurchaseResource;
use App\Models\ServicePurchase;
use App\Services\Service\ServicePurchaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The delivery queue: every service a student has paid for, and how far Plan B
 * has got with it.
 */
class ServicePurchaseController extends Controller
{
    public function __construct(private readonly ServicePurchaseService $purchases) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', ServicePurchase::class);

        $paginated = $this->purchases->list($request->only([
            'search', 'status', 'service_id', 'student_id', 'sort', 'direction', 'per_page',
        ]));

        return response()->json([
            'data' => ServicePurchaseResource::collection($paginated->items()),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    public function show(ServicePurchase $purchase): JsonResponse
    {
        $this->authorize('view', $purchase);

        return response()->json([
            'data' => new ServicePurchaseResource($this->purchases->loadDetail($purchase)),
        ]);
    }

    /** The count that tells an admin whether anything is waiting on them today. */
    public function stats(): JsonResponse
    {
        $this->authorize('viewAny', ServicePurchase::class);

        return response()->json([
            'data' => [
                'pending' => ServicePurchase::where('status', ServicePurchaseStatus::Pending)->count(),
                'in_progress' => ServicePurchase::where('status', ServicePurchaseStatus::InProgress)->count(),
                'completed' => ServicePurchase::where('status', ServicePurchaseStatus::Completed)->count(),
            ],
        ]);
    }

    public function advance(AdvanceServicePurchaseRequest $request, ServicePurchase $purchase): JsonResponse
    {
        $updated = $this->purchases->advance(
            $purchase,
            ServicePurchaseStatus::from($request->validated('status')),
            $request->user(),
            $request->validated('note'),
        );

        return response()->json(['data' => new ServicePurchaseResource($updated)]);
    }
}
