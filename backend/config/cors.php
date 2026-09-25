<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    /*
     * Every browser origin allowed to call this API, comma-separated in
     * `FRONTEND_URLS`.
     *
     * **TWO browser apps reach this API, not one.** `web/` (the admin panel) is
     * on its own subdomain and `site/` (the public website and student portal)
     * is on the public domain, so both origins must be listed. `mobile/` is not
     * a browser and sends no `Origin`, so CORS never applies to it.
     *
     * **This list and `SANCTUM_STATEFUL_DOMAINS` do different jobs and both are
     * required.** CORS decides whether the browser hands the response body to
     * JavaScript; Sanctum decides whether the request gets a session cookie. An
     * origin in one but not the other fails *silently* — the request reaches
     * Laravel, is answered 200, and the browser throws the body away. That is
     * exactly how `site/` spent its first days unable to read a single endpoint
     * while the API looked perfectly healthy in the logs. Add a new origin to
     * both lists or to neither.
     *
     * Kept as an explicit list rather than a pattern: `supports_credentials` is
     * true below, and with credentials the spec forbids `*` outright — browsers
     * reject the combination. An exact list is the only thing that works here,
     * which is a useful accident.
     */
    'allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('FRONTEND_URLS', env('FRONTEND_URL', 'http://localhost:5173'))),
    ), fn (string $origin) => $origin !== '')),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
