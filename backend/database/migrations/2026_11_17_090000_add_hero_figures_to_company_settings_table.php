<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The website hero's figures strip — Website Configuration > Hero Slider.
 *
 * The full-screen hero (2026-11) shows one strip of four figures under every
 * slide, so the figures belong to the hero as a whole, not to a slide. They go
 * on the `company_settings` singleton for the same reason the About band does:
 * there is exactly one of them.
 *
 * JSON rather than twelve columns: a fixed-length list of
 * `{value, label, label_si}` that is always read and written whole. Nothing
 * queries inside it. Null means "never saved", and the website keeps its own
 * built-in figures until an admin saves some.
 *
 * The per-slide `stat_*` columns on `site_hero_slides` stay, unused by the new
 * design, so this release drops no data an admin entered.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('company_settings', function (Blueprint $table): void {
            $table->json('hero_figures')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('company_settings', function (Blueprint $table): void {
            $table->dropColumn('hero_figures');
        });
    }
};
