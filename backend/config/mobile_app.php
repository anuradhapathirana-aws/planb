<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Student app versions
    |--------------------------------------------------------------------------
    |
    | Installed apps do not update themselves on any schedule we control, so the
    | server tells each one where it stands. Sent on /student/app-config, which
    | the app reads on every cold start.
    |
    | - An app OLDER than `min_version` shows a full-screen "Update required"
    |   page with only a store button. Raise this only when an old app would
    |   actually break against the API, e.g. a removed or renamed field.
    | - An app older than `latest_version` (but not below the minimum) shows a
    |   dismissible "Update available" banner on Home. Raise this after every
    |   Play release so students hear about it.
    |
    | Versions are the `version` in mobile/app.config.ts (e.g. 1.2.0), which is
    | what students see on the store listing. That field must be bumped for
    | every store build, or a new build reports the old number.
    |
    | Only apps that already contain the check can obey it: builds before this
    | was added ignore these values entirely.
    |
    */

    'android' => [
        'min_version' => env('MOBILE_ANDROID_MIN_VERSION', '1.0.0'),
        'latest_version' => env('MOBILE_ANDROID_LATEST_VERSION', '1.0.0'),
        'store_url' => env(
            'MOBILE_ANDROID_STORE_URL',
            'https://play.google.com/store/apps/details?id=lk.planbinternational.academy',
        ),
    ],

    // No App Store listing yet. With no store URL the app shows no prompt at all.
    'ios' => [
        'min_version' => env('MOBILE_IOS_MIN_VERSION', '1.0.0'),
        'latest_version' => env('MOBILE_IOS_LATEST_VERSION', '1.0.0'),
        'store_url' => env('MOBILE_IOS_STORE_URL'),
    ],

];
