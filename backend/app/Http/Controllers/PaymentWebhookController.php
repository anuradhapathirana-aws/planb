<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Services\Payment\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Where gateways tell us a payment settled.
 *
 * Unauthenticated by necessity — the caller is the gateway's server, which holds
 * no session and no bearer token. The **signature** is the authentication, and
 * every driver verifies it before a single row is touched
 * (`PaymentGateway::verifyWebhookSignature`, root CLAUDE.md §7.9).
 *
 * This is the only path that may mark a card order paid. The browser redirect
 * the student comes back through is cosmetic: they can close it, lose signal, or
 * forge it, and none of that may decide whether they get access.
 */
class PaymentWebhookController extends Controller
{
    public function __construct(private readonly PaymentService $payments) {}

    public function __invoke(Request $request, string $gateway): JsonResponse
    {
        try {
            $outcome = $this->payments->handleWebhook($gateway, $request->all());
        } catch (ValidationException) {
            // 400, not 422: this is a machine caller, and a validation-shaped
            // body would be meaningless to it.
            return response()->json(['message' => 'Invalid webhook.'], 400);
        }

        /*
         * Always 200 once the signature checks out, including for duplicates.
         * A gateway retries anything that is not 2xx, so returning an error for
         * an event we have already handled would produce an endless retry loop.
         */
        return response()->json(['status' => $outcome]);
    }

    /**
     * Local-only stand-in for a hosted checkout page.
     *
     * Reached through a signed URL from SandboxGateway, it posts a success back
     * through the very same webhook path a real gateway would use, so the
     * idempotency and settlement logic is genuinely exercised in development.
     */
    public function sandboxConfirm(Request $request, Payment $payment): JsonResponse
    {
        abort_if(app()->environment('production'), 404);

        $outcome = $this->payments->handleWebhook('sandbox', [
            'payment_id' => $payment->id,
            'amount_cents' => $payment->amount_cents,
            'currency' => $payment->currency,
            'result' => $request->query('result', 'success'),
            'event_id' => (string) $request->query('event_id', 'confirm'),
        ]);

        return response()->json([
            'status' => $outcome,
            'payment_status' => $payment->refresh()->status->value,
            'order_status' => $payment->order->refresh()->status->value,
            'paid' => $payment->status === PaymentStatus::Succeeded,
        ]);
    }
}
