<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Resources\Student\StudentOrderResource;
use App\Http\Resources\Student\StudentServiceDetailResource;
use App\Http\Resources\Student\StudentServicePurchaseResource;
use App\Http\Resources\Student\StudentServiceSummaryResource;
use App\Models\Student;
use App\Services\Service\ServicePurchaseService;
use App\Services\Service\StudentServiceCatalogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Browsing and buying premium services.
 *
 * The route parameters are plain ids, not model-bound: a published-only binder
 * named `service` would apply to the admin panel's `/admin/services/{service}`
 * too, because `Route::bind` registers globally. Resolution happens in
 * `StudentServiceCatalogService`, and that scope is the authorization — a draft
 * or deleted service 404s.
 */
class ServiceController extends Controller
{
    public function __construct(
        private readonly StudentServiceCatalogService $catalogue,
        private readonly ServicePurchaseService $purchases,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $services = $this->catalogue->list(
            $this->student($request),
            $request->only(['search', 'per_page']),
        );

        return response()->json([
            'data' => StudentServiceSummaryResource::collection($services->items()),
            'meta' => [
                'current_page' => $services->currentPage(),
                'last_page' => $services->lastPage(),
                'per_page' => $services->perPage(),
                'total' => $services->total(),
            ],
        ]);
    }

    public function show(Request $request, string $service): JsonResponse
    {
        $found = $this->catalogue->findPublishedOrFail($this->student($request), $service);

        return response()->json(['data' => new StudentServiceDetailResource($found)]);
    }

    /**
     * Opens an order for this service.
     *
     * Deliberately never says the service is paid for: that is decided later, by
     * the signature-verified webhook, which is also what creates the delivery
     * job. The response is an order to pay against, and the amount on it came
     * from the service on the server.
     */
    public function purchase(Request $request, string $service): JsonResponse
    {
        $student = $this->student($request);
        $found = $this->catalogue->findPublishedOrFail($student, $service);

        $order = $this->purchases->purchase($student, $found);

        return response()->json([
            'data' => [
                'status' => 'payment_required',
                'order' => new StudentOrderResource($order->load('payments')),
            ],
        ], 201);
    }

    /** "My services" — what this student has bought and how it is going. */
    public function purchases(Request $request): JsonResponse
    {
        $purchases = $this->purchases->listForStudent(
            $this->student($request),
            $request->input('per_page'),
        );

        return response()->json([
            'data' => StudentServicePurchaseResource::collection($purchases->items()),
            'meta' => [
                'current_page' => $purchases->currentPage(),
                'last_page' => $purchases->lastPage(),
                'per_page' => $purchases->perPage(),
                'total' => $purchases->total(),
            ],
        ]);
    }

    private function student(Request $request): Student
    {
        /** @var Student $student — guaranteed by the `student.actor` middleware. */
        $student = $request->user();

        return $student;
    }
}
