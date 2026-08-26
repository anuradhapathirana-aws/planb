<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Sign-in codes
    |--------------------------------------------------------------------------
    |
    | Students sign in with a one-time code emailed to the address on their
    | record. There is no password and no SMS.
    |
    */

    'login_code' => [
        'length' => 6,

        // Long enough to switch apps, read the mail and come back; short enough
        // that a leaked code is worthless by the time anyone finds it.
        'ttl_minutes' => (int) env('STUDENT_LOGIN_CODE_TTL_MINUTES', 10),

        // Wrong guesses before the code is burned. The client is never told how
        // many remain — see backend/CLAUDE.md §4.
        'max_attempts' => 5,

        'resend_after_seconds' => 60,

        // Hard ceiling per student per day, on top of the rate limiters. Stops a
        // harvested address being used to run up a mail bill.
        'daily_cap' => (int) env('STUDENT_LOGIN_CODE_DAILY_CAP', 10),
    ],

    /*
    |--------------------------------------------------------------------------
    | Access tokens
    |--------------------------------------------------------------------------
    |
    | Sanctum's global `expiration` is left null so admin tokens are unaffected;
    | student tokens carry their own expiry instead, set at creation.
    |
    */

    'token' => [
        'ttl_days' => (int) env('STUDENT_TOKEN_TTL_DAYS', 30),

        // Abilities exist so a future scope (payments, say) can be added without
        // a v2. Everything in phase 1 needs only this one.
        'abilities' => ['student'],

        /*
         * A rotated token is expired rather than deleted, so requests already in
         * flight when the app refreshes don't 401 mid-rotation.
         */
        'rotation_grace_seconds' => 60,
    ],

    /*
    |--------------------------------------------------------------------------
    | Google Sign-In
    |--------------------------------------------------------------------------
    |
    | One OAuth client per platform, all issuing ID tokens for the same project.
    | Every configured client id is accepted as an audience.
    |
    */

    'google' => [
        'client_ids' => array_values(array_filter(array_map(
            'trim',
            explode(',', (string) env('GOOGLE_CLIENT_IDS', '')),
        ))),

        'issuers' => ['https://accounts.google.com', 'accounts.google.com'],

        'certs_url' => 'https://www.googleapis.com/oauth2/v3/certs',

        // Google rotates signing keys roughly daily; caching avoids a network
        // round trip on every sign-in without risking a stale key for long.
        'certs_cache_minutes' => 60,

        // Tolerance for clock skew between this server and Google, in seconds.
        'leeway_seconds' => 60,
    ],

];
