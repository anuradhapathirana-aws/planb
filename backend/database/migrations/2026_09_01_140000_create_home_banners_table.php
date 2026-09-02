<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The promo banner across the top of the student app's Home screen.
 *
 * **A singleton — exactly one row, managed by `HomeBannerService`.** A list
 * would mean a CRUD screen, an ordering UI and a "which one is live?" question,
 * to solve a problem the client does not have: there is one hero slot and one
 * message in it at a time. Turning this into a rotating set later is a
 * `sort_order` column and a list endpoint; guessing now is a second admin
 * screen nobody asked for.
 *
 * The image itself is a Media Library collection, not a column — same as course
 * thumbnails, and for the same reason: the file needs re-encoding, conversions
 * and a disk, none of which a `string` path gives us.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('home_banners', function (Blueprint $table): void {
            $table->id();

            // Both optional: an image alone is a perfectly good banner, and
            // overlaid text is the thing most likely to fight the artwork.
            $table->string('title', 120)->nullable();
            $table->string('subtitle', 200)->nullable();

            // App\Enums\HomeBannerLink — none | courses | checklists | course | url.
            $table->string('link_type', 32)->default('none');

            /*
             * Only one of these is ever set, decided by `link_type`. Separate
             * typed columns rather than one polymorphic "target" string so a
             * deleted course nulls itself out instead of leaving a dead id in
             * a text field that nothing validates.
             */
            $table->foreignId('link_course_programme_id')
                ->nullable()
                ->constrained('course_programmes')
                ->nullOnDelete();

            $table->string('link_url', 2048)->nullable();

            // The off switch. An inactive banner keeps its image and wording so
            // the admin can bring the same promo back without re-uploading.
            $table->boolean('is_active')->default(false);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('home_banners');
    }
};
