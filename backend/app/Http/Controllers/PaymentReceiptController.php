<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Services\Payment\PaymentReceiptService;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Serves a bank-transfer slip. Outside both auth groups on purpose: a browser tab
 * or `<img>` sends no bearer token, so the link's own signature is the
 * authorization (`signed` middleware), exactly as for student documents. Links
 * are minted only for the owning student (their order endpoints) or for an admin
 * who passes `OrderPolicy::view`.
 */
class PaymentReceiptController extends Controller
{
    public function __construct(private readonly PaymentReceiptService $receipts) {}

    public function __invoke(Payment $payment): BinaryFileResponse
    {
        return $this->receipts->fileResponse($payment);
    }
}
