<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Google Play reviewer sign-in
    |--------------------------------------------------------------------------
    |
    | Play's reviewers must be able to sign in, and they cannot read a code we
    | email. This gives one fixed address a fixed code instead. It is OFF unless
    | both values are set, and the code must be exactly the sign-in code length
    | in digits (the app's code box accepts nothing else) — anything else keeps
    | it off rather than half-working.
    |
    | Give the code to Google only, in Play Console → App content → App access.
    | Change it if it is ever shared anywhere else; clearing either value turns
    | the whole feature off at once. See PlayReviewAccess.
    |
    */

    'email' => mb_strtolower(trim((string) env('PLAY_REVIEW_EMAIL', ''))),

    'code' => trim((string) env('PLAY_REVIEW_CODE', '')),

    /*
     * The code is fixed, so unlike an emailed code it cannot be burned after a
     * few wrong guesses. Instead, this many wrong codes in an hour — from any
     * IP — shuts reviewer sign-in for the rest of that hour. At 10 an hour a
     * six-digit code outlasts any guessing campaign; the worst an attacker can
     * do is keep the reviewer locked out, which is a nuisance, not a breach.
     */
    'max_failures_per_hour' => 10,

    // Name given to the reviewer account when it is created automatically.
    'full_name' => 'Google Play Reviewer',

];
