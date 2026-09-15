<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Plan B's own company configuration, edited under Settings in the admin panel.
 *
 * **A singleton — exactly one row, managed by `CompanySettingsService`.** Typed
 * columns rather than a key-value table: every value here has a known shape
 * and a validation rule, and the student app reads them as one typed payload.
 *
 * The logo is a Media Library collection, not a column, for the same reason as
 * home banners: the file needs re-encoding and a disk.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('company_settings', function (Blueprint $table): void {
            $table->id();

            // Where students send a bank transfer. Shown to them, not secret.
            $table->boolean('bank_transfer_enabled')->default(true);
            $table->string('bank_name', 120)->nullable();
            $table->string('bank_account_name', 120)->nullable();
            $table->string('bank_account_number', 50)->nullable();
            $table->string('bank_branch', 120)->nullable();
            $table->string('bank_notes', 500)->nullable();

            // The intro the student app plays before Home / Sign in.
            $table->boolean('intro_is_enabled')->default(true);
            $table->string('intro_greeting_en', 160)->nullable();
            $table->string('intro_greeting_si', 160)->nullable();
            // App\Enums\IntroAnimation — fade | zoom | slide_up | pulse.
            $table->string('intro_animation', 32)->default('fade');

            $table->timestamps();
        });

        /*
         * The bank details used to live in .env. Carry them over once so an
         * environment that already had them configured keeps showing students
         * the same account; from here on the admin panel owns them.
         *
         * `env()` rather than `config()` because the config keys are removed in
         * the same change. Under a cached config `env()` reads null, which only
         * means the admin fills the account in — never a wrong one.
         */
        DB::table('company_settings')->insert([
            'bank_transfer_enabled' => filter_var(env('BANK_TRANSFER_ENABLED', true), FILTER_VALIDATE_BOOL),
            'bank_name' => env('BANK_TRANSFER_BANK_NAME') ?: null,
            'bank_account_name' => env('BANK_TRANSFER_ACCOUNT_NAME') ?: null,
            'bank_account_number' => env('BANK_TRANSFER_ACCOUNT_NUMBER') ?: null,
            'bank_branch' => env('BANK_TRANSFER_BRANCH') ?: null,
            'intro_is_enabled' => true,
            'intro_greeting_en' => 'Welcome to Plan B International',
            'intro_greeting_si' => null,
            'intro_animation' => 'fade',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('company_settings');
    }
};
