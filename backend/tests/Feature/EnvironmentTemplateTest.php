<?php

declare(strict_types=1);

namespace Tests\Feature;

use Dotenv\Dotenv;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

/**
 * `.env.production.example` is what a server's `.env` is copied from, so an
 * unsafe value in it becomes an unsafe server. These tests read the committed
 * files, not the running config.
 */
class EnvironmentTemplateTest extends TestCase
{
    private const PRODUCTION_TEMPLATE = '.env.production.example';

    private const LOCAL_TEMPLATE = '.env.example';

    public function test_production_template_ships_safe_values(): void
    {
        $env = $this->parse(self::PRODUCTION_TEMPLATE);

        $expected = [
            'APP_ENV' => 'production',
            'APP_DEBUG' => 'false',
            'LOG_STACK' => 'daily',
            'LOG_LEVEL' => 'warning',
            'SESSION_SECURE_COOKIE' => 'true',
            'SESSION_ENCRYPT' => 'true',
            'SESSION_LIFETIME' => '120',
            'SESSION_DOMAIN' => '.<domain>',
            'SANCTUM_STATEFUL_DOMAINS' => 'admin.<domain>',
            'FRONTEND_URL' => 'https://admin.<domain>',
            'TRUSTED_PROXIES' => 'cloudflare',
            'MAIL_MAILER' => 'smtp',
            'QUEUE_CONNECTION' => 'database',
            'PAYMENTS_ENABLED' => 'false',
            'PAYMENT_GATEWAY' => 'payhere',
            'PAYHERE_SANDBOX' => 'false',
            'PAYHERE_CHECKOUT_URL' => 'https://www.payhere.lk/pay/checkout',
        ];

        foreach ($expected as $key => $value) {
            $this->assertArrayHasKey($key, $env, "{$key} is missing from the production template.");
            $this->assertSame($value, $env[$key], "{$key} has an unsafe value in the production template.");
        }

        $this->assertStringStartsWith('https://', (string) $env['APP_URL']);
    }

    public function test_production_template_holds_no_secrets(): void
    {
        $env = $this->parse(self::PRODUCTION_TEMPLATE);
        $secrets = array_filter(
            $env,
            fn (string $key): bool => (bool) preg_match('/(PASSWORD|SECRET|_KEY|_CODE)$/', $key),
            ARRAY_FILTER_USE_KEY,
        );

        // Guards the pattern itself: if it stopped matching, the loop below would prove nothing.
        $this->assertArrayHasKey('PAYHERE_MERCHANT_SECRET', $secrets);
        $this->assertArrayHasKey('PLAY_REVIEW_CODE', $secrets);
        $this->assertArrayHasKey('APP_KEY', $secrets);
        $this->assertArrayHasKey('BUNNY_STREAM_TOKEN_KEY', $secrets);

        foreach ($secrets as $key => $value) {
            $this->assertSame('', (string) $value, "{$key} must be blank in a committed template.");
        }
    }

    public function test_every_production_setting_is_read_by_the_app(): void
    {
        $read = $this->keysReadByTheApp();

        foreach (array_keys($this->parse(self::PRODUCTION_TEMPLATE)) as $key) {
            // A misspelt key is silently ignored and the default applies instead.
            $this->assertContains($key, $read, "{$key} is in the production template but nothing reads it.");
        }
    }

    public function test_templates_do_not_repeat_a_key(): void
    {
        foreach ([self::LOCAL_TEMPLATE, self::PRODUCTION_TEMPLATE] as $file) {
            preg_match_all('/^([A-Z0-9_]+)=/m', File::get(base_path($file)), $matches);

            $repeated = array_keys(array_filter(array_count_values($matches[1]), fn (int $n): bool => $n > 1));

            // The later value silently wins, so the one a reader edits may not be the one used.
            $this->assertSame([], $repeated, "{$file} sets these keys more than once.");
        }
    }

    public function test_local_template_has_no_unused_payhere_secret(): void
    {
        // Only PAYHERE_MERCHANT_SECRET is read; a second name invites filling the wrong one.
        $this->assertArrayNotHasKey('PAYHERE_SECRET', $this->parse(self::LOCAL_TEMPLATE));
    }

    /** @return array<string, string|null> */
    private function parse(string $file): array
    {
        return Dotenv::parse(File::get(base_path($file)));
    }

    /** @return list<string> */
    private function keysReadByTheApp(): array
    {
        $keys = [];

        $directories = [
            base_path('app'),
            base_path('bootstrap'),
            base_path('config'),
            base_path('database'),
            base_path('routes'),
            // Laravel 11 reads config files the app has not published (e.g. hashing) from here.
            base_path('vendor/laravel/framework/config'),
        ];

        foreach ($directories as $directory) {
            foreach (File::allFiles($directory) as $file) {
                if ($file->getExtension() !== 'php') {
                    continue;
                }

                preg_match_all("/env\\(\\s*'([A-Z0-9_]+)'/", $file->getContents(), $matches);
                array_push($keys, ...$matches[1]);
            }
        }

        return array_values(array_unique($keys));
    }
}
