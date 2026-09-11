<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | The pair
    |--------------------------------------------------------------------------
    |
    | Plan B prices everything in LKR (see config/payments.php), while every
    | number a student meets about the UAE - salary, visa fee, rent, deposit -
    | is quoted in AED. That one corridor is the whole feature, so the pair is
    | configuration rather than a currency picker.
    |
    | `base` is what one unit of is being priced: the rate answers
    | "1 AED = <rate> LKR".
    |
    */

    'base' => env('EXCHANGE_BASE', 'AED'),
    'quote' => env('EXCHANGE_QUOTE', 'LKR'),

    /*
    |--------------------------------------------------------------------------
    | Provider
    |--------------------------------------------------------------------------
    |
    | Defaults to open.er-api.com, which needs no account and no key and does
    | carry LKR - not a given. Several of the better-known free feeds are ECB
    | derived, and the ECB publishes around thirty currencies with LKR not
    | among them, so they cannot serve this pair at all.
    |
    | `{base}` is replaced with the base currency. A different provider is a
    | config change plus the response parsing in ExchangeRateService - keep the
    | two in step, and note the key must stay server-side either way: a key in
    | the mobile bundle is trivially extractable (mobile/CLAUDE.md §5).
    |
    */

    'url' => env('EXCHANGE_URL', 'https://open.er-api.com/v6/latest/{base}'),

    'timeout_seconds' => (int) env('EXCHANGE_TIMEOUT_SECONDS', 8),

    /*
    |--------------------------------------------------------------------------
    | Freshness
    |--------------------------------------------------------------------------
    |
    | The scheduled refresh runs well inside `stale_after_hours`; that window is
    | how long a rate may be served after its last successful fetch before the
    | API flags it stale and the app says so. A rate that is merely a day old is
    | still far more useful than none - the point is to caveat it, not hide it.
    |
    | The cached entry itself never expires. Serving yesterday's rate through a
    | provider outage is the entire reason for caching it, and an expiring entry
    | would leave us with nothing at exactly the wrong moment.
    |
    */

    'refresh_hours' => (int) env('EXCHANGE_REFRESH_HOURS', 6),

    'stale_after_hours' => (int) env('EXCHANGE_STALE_AFTER_HOURS', 48),

];
