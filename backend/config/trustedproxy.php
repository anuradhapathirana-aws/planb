<?php

declare(strict_types=1);

use App\Support\TrustedProxies;

return [

    /*
    |--------------------------------------------------------------------------
    | Trusted proxies
    |--------------------------------------------------------------------------
    |
    | Laravel's TrustProxies middleware reads this on every request. Set
    | TRUSTED_PROXIES=cloudflare when the site sits behind Cloudflare's proxy;
    | leave it blank for Nginx talking to PHP directly. Which forwarded headers
    | are believed is fixed in bootstrap/app.php. See App\Support\TrustedProxies.
    |
    */

    'proxies' => TrustedProxies::resolve(env('TRUSTED_PROXIES')),

];
