<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Active gateway
    |--------------------------------------------------------------------------
    |
    | Which driver handles card payments. `sandbox` completes payments locally
    | without contacting anyone, so the whole order -> payment -> enrolment path
    | is testable before merchant credentials exist. Switch to `payhere` by
    | setting PAYMENT_GATEWAY and the PayHere credentials below.
    |
    */

    'gateway' => env('PAYMENT_GATEWAY', 'sandbox'),

    /*
    |--------------------------------------------------------------------------
    | Currency
    |--------------------------------------------------------------------------
    |
    | ISO-4217 code every price and order is denominated in. Money is stored in
    | the smallest unit as an integer (root CLAUDE.md §4.11) - for LKR that is
    | cents, so 5000.00 LKR is 500000.
    |
    */

    'currency' => env('PAYMENT_CURRENCY', 'LKR'),

    /*
    |--------------------------------------------------------------------------
    | Bank transfer
    |--------------------------------------------------------------------------
    |
    | Manual verification (FR-MOB-033/034, FR-ADM-018-021). The account details
    | are shown to the student so they know where to send the money; they are not
    | secret. Receipt size is capped per FR-MOB-033.
    |
    */

    'bank_transfer' => [
        'enabled' => (bool) env('BANK_TRANSFER_ENABLED', true),
        'max_receipt_mb' => (int) env('BANK_TRANSFER_MAX_RECEIPT_MB', 5),
        'account' => [
            'bank_name' => env('BANK_TRANSFER_BANK_NAME'),
            'account_name' => env('BANK_TRANSFER_ACCOUNT_NAME'),
            'account_number' => env('BANK_TRANSFER_ACCOUNT_NUMBER'),
            'branch' => env('BANK_TRANSFER_BRANCH'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | PayHere
    |--------------------------------------------------------------------------
    |
    | The merchant secret signs and verifies every amount, so a tampered callback
    | is rejected (root CLAUDE.md §7.9). It is a credential: it belongs in .env
    | and must never be logged or sent to a client.
    |
    */

    'payhere' => [
        'merchant_id' => env('PAYHERE_MERCHANT_ID'),
        'merchant_secret' => env('PAYHERE_MERCHANT_SECRET'),
        'sandbox' => (bool) env('PAYHERE_SANDBOX', true),
        'checkout_url' => env('PAYHERE_CHECKOUT_URL', 'https://sandbox.payhere.lk/pay/checkout'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Where the gateway sends the student back to
    |--------------------------------------------------------------------------
    |
    | Deep links into the mobile app. The *authoritative* result never comes from
    | these - a student can close the browser before being redirected - it comes
    | from the server-to-server webhook.
    |
    */

    'return_url' => env('PAYMENT_RETURN_URL', 'planb://payment/complete'),
    'cancel_url' => env('PAYMENT_CANCEL_URL', 'planb://payment/cancelled'),

];
