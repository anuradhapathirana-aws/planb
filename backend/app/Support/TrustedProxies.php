<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Which proxies may tell Laravel the real client IP and scheme.
 *
 * Read from `TRUSTED_PROXIES` by `config/trustedproxy.php`, which Laravel's own
 * TrustProxies middleware consults on every request.
 *
 * Getting this wrong in either direction hurts:
 * - **Trusting too little** behind Cloudflare makes every request look like it
 *   comes from a Cloudflare address, so the per-IP sign-in code limit (8 an hour)
 *   is shared by every student at once, and HTTPS is misdetected.
 * - **Trusting too much** lets anyone who reaches the server directly send
 *   `X-Forwarded-For: <any IP>` and step around every per-IP limit.
 *
 * So there is no wildcard here. `cloudflare` expands to Cloudflare's published
 * ranges; anything else must be an explicit IP or CIDR. A request from outside
 * the list keeps its own address, whatever headers it carries.
 */
final class TrustedProxies
{
    /**
     * Cloudflare's published edge ranges, https://www.cloudflare.com/ips/ —
     * checked 2026-09-17. `php artisan proxies:check-cloudflare` compares this
     * list with the live one.
     */
    public const CLOUDFLARE = [
        '173.245.48.0/20',
        '103.21.244.0/22',
        '103.22.200.0/22',
        '103.31.4.0/22',
        '141.101.64.0/18',
        '108.162.192.0/18',
        '190.93.240.0/20',
        '188.114.96.0/20',
        '197.234.240.0/22',
        '198.41.128.0/17',
        '162.158.0.0/15',
        '104.16.0.0/13',
        '104.24.0.0/14',
        '172.64.0.0/13',
        '131.0.72.0/22',
        '2400:cb00::/32',
        '2606:4700::/32',
        '2803:f800::/32',
        '2405:b500::/32',
        '2405:8100::/32',
        '2a06:98c0::/29',
        '2c0f:f248::/32',
    ];

    /**
     * `"cloudflare, 10.0.0.5"` → Cloudflare's ranges plus that address.
     * Blank → null, which trusts nobody: right for Nginx talking to PHP directly.
     *
     * `*` is refused rather than passed through. It trusts whoever connects,
     * which is only safe if the firewall already guarantees the caller is the
     * proxy — a guarantee that silently disappears the day a firewall rule is
     * loosened.
     *
     * @return list<string>|null
     */
    public static function resolve(?string $value): ?array
    {
        $entries = array_values(array_filter(
            array_map('trim', explode(',', (string) $value)),
            fn (string $entry): bool => $entry !== '' && $entry !== '*' && $entry !== '**',
        ));

        if ($entries === []) {
            return null;
        }

        $proxies = [];

        foreach ($entries as $entry) {
            array_push($proxies, ...(strtolower($entry) === 'cloudflare' ? self::CLOUDFLARE : [$entry]));
        }

        return array_values(array_unique($proxies));
    }
}
