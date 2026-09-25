<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The website's "Community & trust" band — Website Configuration > About Video.
 *
 * **Extends the existing singleton rather than adding a second settings table.**
 * This is about-the-company copy and there is exactly one of it; a
 * `site_settings` table alongside `company_settings` would be two rows to keep
 * in step with no rule for which owns what.
 *
 * The video is a **link**, not an upload (client decision, 2026-09-25). Plan B's
 * marketing home page is the most-visited URL we have, and serving the file
 * ourselves would put every play on the Contabo VPS's bandwidth. The stored
 * string is whatever the admin pasted; it is validated against a host allowlist
 * on write and parsed again by `site/src/lib/youtube.ts` before it reaches an
 * iframe. Neither check trusts the other.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('company_settings', function (Blueprint $table): void {
            // The chip above the heading — "Community & trust".
            $table->string('community_eyebrow', 60)->nullable();
            $table->string('community_eyebrow_si', 60)->nullable();

            // `**double asterisks**` mark the gold segment, as on hero slides.
            $table->string('community_heading', 160)->nullable();
            $table->string('community_heading_si', 160)->nullable();

            $table->text('community_body')->nullable();
            $table->text('community_body_si')->nullable();

            // Stored exactly as pasted. Host-allowlisted on write; never
            // interpolated into markup — the client re-parses it first.
            $table->string('community_video_url', 2048)->nullable();

            /*
             * Shown on the play button before the video loads. Typed by the
             * admin rather than read from YouTube: reading it would mean
             * calling YouTube's API from a controller, which §13.8 forbids, for
             * a decorative label.
             */
            $table->string('community_video_duration_label', 12)->nullable();

            // The pill that overhangs the video — "Enrolment open now".
            $table->string('community_floating_label', 60)->nullable();
            $table->string('community_floating_label_si', 60)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('company_settings', function (Blueprint $table): void {
            $table->dropColumn([
                'community_eyebrow',
                'community_eyebrow_si',
                'community_heading',
                'community_heading_si',
                'community_body',
                'community_body_si',
                'community_video_url',
                'community_video_duration_label',
                'community_floating_label',
                'community_floating_label_si',
            ]);
        });
    }
};
