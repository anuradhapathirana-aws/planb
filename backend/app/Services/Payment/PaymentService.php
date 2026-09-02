<?php

declare(strict_types=1);

namespace App\Services\Payment;

use App\Enums\EnrolmentSource;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\CourseProgramme;
use App\Models\Order;
use App\Models\Payment;
use App\Models\PaymentWebhookEvent;
use App\Models\Service;
use App\Models\User;
use App\Services\Enrolment\EnrolmentService;
use App\Services\Service\ServicePurchaseService;
use App\Support\Payment\CheckoutSession;
use App\Support\Payment\WebhookResult;
use Illuminate\Database\QueryException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\ValidationException;

/**
 * Everything that moves an order from "opened" to "paid", for either method.
 *
 * Two rules hold this together and neither may be relaxed:
 *
 * 1. **The client never decides an order is paid.** A card order is settled only
 *    by a signature-verified server-to-server webhook; the browser redirect is
 *    cosmetic, because a student can close it before it fires.
 * 2. **Settling is idempotent and locked.** Gateways retry callbacks, so the same
 *    success arrives repeatedly. Settlement runs inside a row lock and exits
 *    early if the order is already paid.
 */
class PaymentService
{
    public function __construct(
        private readonly PaymentGatewayManager $gateways,
        private readonly EnrolmentService $enrolments,
        private readonly ServicePurchaseService $servicePurchases,
    ) {}

    /**
     * Starts a card payment and returns what the client needs to open the
     * gateway's hosted checkout. No card data passes through us (FR-MOB-032).
     */
    public function startCardPayment(Order $order): array
    {
        $this->guardPayable($order);

        /*
         * A transfer sitting in the verification queue means money may already be
         * on its way. Letting a card payment start alongside it is how a student
         * pays twice: both can settle, the second finds the order already paid
         * and returns quietly, and nobody notices until they ask for a refund.
         * They wait for the decision, or an admin rejects the transfer - which
         * returns the order to payable (FR-MOB-035).
         */
        $awaitingReview = $order->payments()
            ->where('method', PaymentMethod::BankTransfer)
            ->where('status', PaymentStatus::Pending)
            ->exists();

        if ($awaitingReview) {
            throw ValidationException::withMessages([
                'order' => 'Your bank transfer is still being checked. Please wait for that before paying another way.',
            ]);
        }

        $gateway = $this->gateways->driver();

        $payment = DB::transaction(function () use ($order, $gateway): Payment {
            // Any earlier unfinished card attempt is abandoned, so a stale
            // checkout page cannot later settle an order paid by another means.
            $order->payments()
                ->where('method', PaymentMethod::Card)
                ->whereIn('status', [PaymentStatus::Pending, PaymentStatus::Processing])
                ->update(['status' => PaymentStatus::Cancelled]);

            return $order->payments()->create([
                'method' => PaymentMethod::Card,
                'gateway' => $gateway->identifier(),
                'amount_cents' => $order->amount_cents,
                'currency' => $order->currency,
                'status' => PaymentStatus::Pending,
            ]);
        });

        $session = $gateway->createCheckout($payment);

        $payment->update(['status' => PaymentStatus::Processing]);

        return [
            'payment_id' => $payment->id,
            'order' => $order->refresh(),
            'checkout' => $session,
            'redirect_url' => $this->checkoutRedirectUrl($payment, $session),
        ];
    }

    /**
     * The single URL a client opens to reach the gateway.
     *
     * A driver that needs a signed form POST (PayHere does; it is their published
     * scheme) cannot be reached by a link, and a mobile in-app browser can only
     * open a link. Those go through our own bridge page, which builds the POST
     * server-side so no client ever handles a payment hash. A driver whose
     * checkout is already a plain URL is handed over unchanged.
     *
     * Thirty minutes: comfortably longer than entering card details, short enough
     * that a URL captured from a device log is not a standing invitation.
     */
    private function checkoutRedirectUrl(Payment $payment, CheckoutSession $session): string
    {
        if ($session->fields === []) {
            return $session->checkoutUrl;
        }

        return URL::temporarySignedRoute(
            'payments.checkout.redirect',
            now()->addMinutes(30),
            ['payment' => $payment->id],
        );
    }

    /**
     * Records a bank transfer for manual verification (FR-MOB-033/034).
     *
     * The order moves to `awaiting_verification`, not `paid` — money is only
     * recognised once an admin confirms it arrived (root CLAUDE.md §7.10).
     */
    public function submitBankTransfer(Order $order, string $referenceNumber, UploadedFile $receipt): Payment
    {
        $this->guardPayable($order);

        if (! config('payments.bank_transfer.enabled')) {
            throw ValidationException::withMessages([
                'method' => 'Bank transfer is not available right now.',
            ]);
        }

        // One submission in the queue at a time, so an admin is never asked to
        // review two receipts for the same order.
        $pending = $order->payments()
            ->where('method', PaymentMethod::BankTransfer)
            ->where('status', PaymentStatus::Pending)
            ->exists();

        if ($pending) {
            throw ValidationException::withMessages([
                'reference_number' => 'Your previous bank transfer is still being checked.',
            ]);
        }

        return DB::transaction(function () use ($order, $referenceNumber, $receipt): Payment {
            $payment = $order->payments()->create([
                'method' => PaymentMethod::BankTransfer,
                'amount_cents' => $order->amount_cents,
                'currency' => $order->currency,
                'status' => PaymentStatus::Pending,
                'reference_number' => $referenceNumber,
            ]);

            $payment->addMedia($receipt->getRealPath())
                ->usingFileName($this->receiptFileName($payment, $receipt))
                ->toMediaCollection(Payment::RECEIPT_COLLECTION);

            $order->update(['status' => OrderStatus::AwaitingVerification]);

            return $payment->fresh(['media']);
        });
    }

    /** Admin approves a bank transfer: the money is real, so access is granted. */
    public function approveBankTransfer(Payment $payment, User $admin, ?string $remark = null): Payment
    {
        $this->guardReviewable($payment);

        DB::transaction(function () use ($payment, $admin, $remark): void {
            $payment->update([
                'status' => PaymentStatus::Succeeded,
                'reviewed_by' => $admin->id,
                'reviewed_at' => now(),
                'review_remark' => $remark,
                'paid_at' => now(),
            ]);

            $this->settleOrder($payment->order, $payment);
        });

        return $payment->fresh(['order', 'reviewer', 'media']);
    }

    /**
     * Admin rejects it. The order goes back to `pending` rather than being
     * cancelled, because FR-MOB-035 requires the student to be able to submit a
     * new receipt against the same order.
     */
    public function rejectBankTransfer(Payment $payment, User $admin, ?string $remark = null): Payment
    {
        $this->guardReviewable($payment);

        DB::transaction(function () use ($payment, $admin, $remark): void {
            $payment->update([
                'status' => PaymentStatus::Failed,
                'reviewed_by' => $admin->id,
                'reviewed_at' => now(),
                'review_remark' => $remark,
            ]);

            if (! $payment->order->isPaid()) {
                $payment->order->update(['status' => OrderStatus::Pending]);
            }
        });

        return $payment->fresh(['order', 'reviewer', 'media']);
    }

    /**
     * Handles a gateway callback.
     *
     * Recording the event first is what makes this safe to call repeatedly: the
     * unique (gateway, event_id) index turns a retry into a duplicate-key error,
     * which is caught and reported as "already handled" instead of settling twice.
     */
    public function handleWebhook(string $gatewayName, array $payload): string
    {
        $gateway = $this->gateways->driver($gatewayName);

        if (! $gateway->verifyWebhookSignature($payload)) {
            // Never log the payload itself: it is attacker-controlled and a
            // rejected callback is exactly what a probe looks like.
            Log::warning('Rejected payment webhook with an invalid signature.', ['gateway' => $gatewayName]);

            throw ValidationException::withMessages(['signature' => 'Invalid webhook signature.']);
        }

        $result = $gateway->parseWebhook($payload);

        try {
            $event = PaymentWebhookEvent::create([
                'gateway' => $gatewayName,
                'event_id' => $result->eventId,
                'payload' => $result->sanitizedPayload,
            ]);
        } catch (QueryException) {
            return 'duplicate';
        }

        $outcome = $this->applyWebhook($result);

        $event->update(['processed_at' => now(), 'outcome' => $outcome]);

        return $outcome;
    }

    private function applyWebhook(WebhookResult $result): string
    {
        $payment = Payment::with('order')->find($result->paymentId);

        if ($payment === null) {
            Log::warning('Payment webhook referenced an unknown payment.', ['payment_id' => $result->paymentId]);

            return 'unknown_payment';
        }

        /*
         * The gateway must confirm the amount we asked for. A mismatch means
         * either a tampered callback or a misconfigured merchant account, and
         * quietly enrolling the student would hide both.
         */
        if ($result->amountCents !== $payment->amount_cents || $result->currency !== $payment->currency) {
            Log::error('Payment webhook amount did not match the order.', [
                'payment_id' => $payment->id,
                'expected_cents' => $payment->amount_cents,
                'received_cents' => $result->amountCents,
            ]);

            $payment->update(['status' => PaymentStatus::Failed]);

            return 'amount_mismatch';
        }

        return DB::transaction(function () use ($payment, $result): string {
            $payment->update([
                'status' => $result->status,
                'gateway_reference' => $result->gatewayReference,
                'gateway_payload' => $result->sanitizedPayload,
                'paid_at' => $result->status === PaymentStatus::Succeeded ? now() : null,
            ]);

            if ($result->status !== PaymentStatus::Succeeded) {
                return $result->status->value;
            }

            $this->settleOrder($payment->order, $payment);

            return 'settled';
        });
    }

    /**
     * Marks the order paid and hands out whatever it bought.
     *
     * Locked and idempotent: a replayed callback, or an admin approving a
     * transfer for an order a card already settled, must not enrol twice.
     */
    private function settleOrder(Order $order, Payment $payment): void
    {
        $locked = Order::whereKey($order->id)->lockForUpdate()->first();

        if ($locked === null || $locked->isPaid()) {
            return;
        }

        $locked->update([
            'status' => OrderStatus::Paid,
            'paid_at' => $payment->paid_at ?? now(),
        ]);

        /*
         * `withTrashed()` matters: courses and services are both soft-deletable,
         * and an admin withdrawing one between checkout and callback would
         * otherwise resolve this to null — a student who paid, and a warning in
         * the log instead of the thing they bought.
         */
        $purchasable = $locked->purchasable()->withTrashed()->first();

        /*
         * One branch per product type, explicit rather than a silent no-op, so
         * an unhandled type is obvious in the log instead of being a student who
         * paid and got nothing.
         *
         * A course grants access, which simply exists. A service creates a job
         * somebody has to work through. Both are idempotent, because this runs
         * again on every replayed callback.
         */
        if ($purchasable instanceof CourseProgramme) {
            $this->enrolments->grant(
                $locked->student,
                $purchasable,
                EnrolmentSource::Purchase,
                $locked,
            );

            return;
        }

        if ($purchasable instanceof Service) {
            $this->servicePurchases->fulfil($locked->student, $purchasable, $locked);

            return;
        }

        Log::warning('A paid order had no fulfilment handler for its product type.', [
            'order_id' => $locked->id,
            'purchasable_type' => $locked->purchasable_type,
        ]);
    }

    private function guardPayable(Order $order): void
    {
        if ($order->isPaid()) {
            throw ValidationException::withMessages(['order' => 'This order has already been paid.']);
        }

        if ($order->isSettled()) {
            throw ValidationException::withMessages(['order' => 'This order is closed.']);
        }
    }

    private function guardReviewable(Payment $payment): void
    {
        if (! $payment->isAwaitingReview()) {
            throw ValidationException::withMessages([
                'payment' => 'This bank transfer has already been reviewed.',
            ]);
        }
    }

    private function receiptFileName(Payment $payment, UploadedFile $receipt): string
    {
        $extension = strtolower($receipt->getClientOriginalExtension()) ?: 'jpg';

        return 'receipt-'.$payment->id.'.'.$extension;
    }
}
