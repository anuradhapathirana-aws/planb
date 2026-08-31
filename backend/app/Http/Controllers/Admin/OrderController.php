<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Payment\ReviewBankTransferRequest;
use App\Http\Resources\OrderResource;
use App\Http\Resources\PaymentResource;
use App\Models\Order;
use App\Models\Payment;
use App\Services\Payment\OrderService;
use App\Services\Payment\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function __construct(
        private readonly OrderService $orders,
        private readonly PaymentService $payments,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Order::class);

        $paginated = $this->orders->list($request->only([
            'search', 'status', 'method', 'student_id', 'sort', 'direction', 'per_page',
        ]));

        return response()->json([
            'data' => OrderResource::collection($paginated->items()),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    public function show(Order $order): JsonResponse
    {
        $this->authorize('view', $order);

        return response()->json([
            'data' => new OrderResource($order->load(['student', 'payments.reviewer', 'payments.media'])),
        ]);
    }

    /** FR-ADM-025: the count that drives the dashboard's "needs attention" badge. */
    public function stats(): JsonResponse
    {
        $this->authorize('viewAny', Order::class);

        return response()->json([
            'data' => [
                'pending_bank_transfers' => Payment::where('method', PaymentMethod::BankTransfer)
                    ->where('status', PaymentStatus::Pending)
                    ->count(),
                'paid_orders' => Order::where('status', OrderStatus::Paid)->count(),
                'revenue_cents_this_month' => (int) Order::where('status', OrderStatus::Paid)
                    ->whereBetween('paid_at', [now()->startOfMonth(), now()->endOfMonth()])
                    ->sum('amount_cents'),
                'currency' => (string) config('payments.currency'),
            ],
        ]);
    }

    public function approve(ReviewBankTransferRequest $request, Payment $payment): JsonResponse
    {
        $updated = $this->payments->approveBankTransfer(
            $payment,
            $request->user(),
            $request->validated('remark'),
        );

        return response()->json(['data' => new PaymentResource($updated)]);
    }

    public function reject(ReviewBankTransferRequest $request, Payment $payment): JsonResponse
    {
        $updated = $this->payments->rejectBankTransfer(
            $payment,
            $request->user(),
            $request->validated('remark'),
        );

        return response()->json(['data' => new PaymentResource($updated)]);
    }
}
