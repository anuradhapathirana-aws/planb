<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Requests\Payment\SubmitBankTransferRequest;
use App\Http\Resources\Student\StudentOrderResource;
use App\Http\Resources\Student\StudentPaymentResource;
use App\Models\Order;
use App\Models\Student;
use App\Services\Payment\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function __construct(private readonly PaymentService $payments) {}

    /** Transaction history (FR-MOB-036). */
    public function index(Request $request): JsonResponse
    {
        $orders = $this->student($request)
            ->orders()
            ->with('payments.media')
            ->paginate(min(max($request->integer('per_page', 20), 1), 50));

        return response()->json([
            'data' => StudentOrderResource::collection($orders->items()),
            'meta' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
            ],
        ]);
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        $this->assertOwned($request, $order);

        return response()->json([
            'data' => new StudentOrderResource($order->load('payments.media')),
        ]);
    }

    /**
     * Hands back what the app needs to open the gateway's hosted checkout.
     *
     * The response deliberately does NOT say the order is paid. That is decided
     * later, by the signed server-to-server webhook — a student who closes the
     * browser mid-payment must still get their access, and one who fakes a
     * "success" redirect must not.
     */
    public function payByCard(Request $request, Order $order): JsonResponse
    {
        $this->assertOwned($request, $order);

        $result = $this->payments->startCardPayment($order);

        return response()->json([
            'data' => [
                'payment_id' => $result['payment_id'],
                'order' => new StudentOrderResource($result['order']->load('payments')),
                /*
                 * `redirect_url` is the ONLY field a client should act on: it is
                 * a plain URL for every driver, including the ones whose real
                 * checkout is a signed form POST. `fields` is carried for a web
                 * client that can post a form itself; the app ignores it.
                 */
                'checkout' => $result['checkout']->toArray() + [
                    'redirect_url' => $result['redirect_url'],
                ],
            ],
        ], 201);
    }

    /** FR-MOB-033/034: submit proof, then wait for an admin to verify it. */
    public function payByBankTransfer(SubmitBankTransferRequest $request, Order $order): JsonResponse
    {
        $this->assertOwned($request, $order);

        $payment = $this->payments->submitBankTransfer(
            $order,
            $request->validated('reference_number'),
            $request->file('receipt'),
        );

        return response()->json([
            'data' => [
                'payment' => new StudentPaymentResource($payment),
                'order' => new StudentOrderResource($order->refresh()->load('payments')),
            ],
        ], 201);
    }

    /** Where to send the money. Not secret — the student needs it to pay. */
    public function bankDetails(): JsonResponse
    {
        return response()->json([
            'data' => [
                'enabled' => (bool) config('payments.bank_transfer.enabled'),
                'account' => config('payments.bank_transfer.account'),
                'max_receipt_mb' => (int) config('payments.bank_transfer.max_receipt_mb'),
            ],
        ]);
    }

    /**
     * Ownership, checked explicitly rather than through `Route::bind`.
     *
     * A binder would have been tidier, but `Route::bind` registers on the router
     * GLOBALLY — an `order` binder here also rewrites the admin panel's
     * `/admin/orders/{order}` route, which is exactly the trap `routes/api_student.php`
     * warns about for `course`. 404 rather than 403: a student has no business
     * learning that someone else's order exists.
     */
    private function assertOwned(Request $request, Order $order): void
    {
        abort_unless($order->student_id === $this->student($request)->id, 404);
    }

    private function student(Request $request): Student
    {
        /** @var Student $student — guaranteed by the `student.actor` middleware. */
        $student = $request->user();

        return $student;
    }
}
