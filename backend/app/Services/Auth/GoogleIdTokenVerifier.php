<?php

declare(strict_types=1);

namespace App\Services\Auth;

use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Verifies a Google ID token locally.
 *
 * Google's own tokeninfo endpoint would be simpler, but it puts a network call
 * from Google's servers on the critical path of every sign-in — if it is slow
 * or down, nobody can log in. Verifying the JWT against Google's published
 * signing keys (cached for an hour) is the same guarantee without the coupling.
 */
class GoogleIdTokenVerifier
{
    private const CACHE_KEY = 'google:oauth2:certs';

    /**
     * @return array{sub: string, email: string, email_verified: bool, name: ?string}
     *
     * @throws ValidationException when the token is missing, malformed, expired,
     *                             signed by the wrong key, or issued to another app.
     */
    public function verify(string $idToken): array
    {
        $clientIds = config('students.google.client_ids');

        if ($clientIds === []) {
            // A misconfigured server must not silently accept tokens.
            throw ValidationException::withMessages([
                'id_token' => 'Google sign-in is not available right now.',
            ]);
        }

        try {
            JWT::$leeway = (int) config('students.google.leeway_seconds');

            $payload = (array) JWT::decode($idToken, JWK::parseKeySet($this->certs()));
        } catch (Throwable) {
            // Never surface the library's reason — it distinguishes "expired"
            // from "bad signature", which is more than a caller needs to know.
            throw $this->rejected();
        }

        $audience = $payload['aud'] ?? null;
        $issuer = $payload['iss'] ?? null;
        $subject = $payload['sub'] ?? null;
        $email = $payload['email'] ?? null;

        // JWT::decode verifies signature and expiry; audience and issuer are ours to check.
        if (! is_string($audience) || ! in_array($audience, $clientIds, true)) {
            throw $this->rejected();
        }

        if (! is_string($issuer) || ! in_array($issuer, config('students.google.issuers'), true)) {
            throw $this->rejected();
        }

        if (! is_string($subject) || $subject === '' || ! is_string($email) || $email === '') {
            throw $this->rejected();
        }

        /*
         * An unverified address proves nothing — anyone can put someone else's
         * email on a Google account. Matching a student record on it would hand
         * over the account.
         */
        if (($payload['email_verified'] ?? false) !== true) {
            throw ValidationException::withMessages([
                'id_token' => 'Your Google account email is not verified.',
            ]);
        }

        return [
            'sub' => $subject,
            'email' => mb_strtolower($email),
            'email_verified' => true,
            'name' => is_string($payload['name'] ?? null) ? $payload['name'] : null,
        ];
    }

    /**
     * Google's current public signing keys (JWKS).
     *
     * @return array<string, mixed>
     */
    private function certs(): array
    {
        $minutes = (int) config('students.google.certs_cache_minutes');

        return Cache::remember(self::CACHE_KEY, now()->addMinutes($minutes), function (): array {
            $response = Http::timeout(5)
                ->retry(2, 200)
                ->get(config('students.google.certs_url'));

            $response->throw();

            return $response->json();
        });
    }

    private function rejected(): ValidationException
    {
        return ValidationException::withMessages([
            'id_token' => 'We could not verify that Google sign-in. Please try again.',
        ]);
    }
}
