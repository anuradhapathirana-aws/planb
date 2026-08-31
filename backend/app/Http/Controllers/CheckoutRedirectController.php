<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Services\Payment\PaymentGatewayManager;
use Illuminate\Contracts\View\View;

/**
 * Hands a student from the app to the gateway's own hosted checkout.
 *
 * Why this exists: PayHere (and most Sri Lankan gateways) expect a signed form
 * POST, not a link. A mobile in-app browser can only *open a URL*, so something
 * has to turn the signed field set into a POST. It is done here rather than in
 * the app on purpose — the hash is derived from the merchant secret, and a
 * client that assembled the form would need field-level trust it should not
 * have. The app opens one URL and never sees a gateway field.
 *
 * Unauthenticated by necessity: an in-app browser tab carries no bearer token,
 * exactly like the video playback route. The **signature on the URL is the
 * authorization**, and it is short-lived. Nothing here writes anything, and the
 * page cannot make a payment succeed — only the signed webhook does that.
 */
class CheckoutRedirectController extends Controller
{
    public function __construct(private readonly PaymentGatewayManager $gateways) {}

    public function __invoke(Payment $payment): View
    {
        /*
         * A signed URL stays valid for its whole window even after the payment
         * moves on, so state is re-checked here: a card attempt that has already
         * settled, failed or been superseded must not re-open a checkout page.
         */
        abort_unless($payment->method === PaymentMethod::Card, 404);
        abort_unless(
            in_array($payment->status, [PaymentStatus::Pending, PaymentStatus::Processing], true),
            410,
            'This payment link has already been used.',
        );

        $session = $this->gateways->driver($payment->gateway)->createCheckout($payment);

        return view('payments.checkout-redirect', [
            'checkoutUrl' => $session->checkoutUrl,
            'fields' => $session->fields,
        ]);
    }
}
