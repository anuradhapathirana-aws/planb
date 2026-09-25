<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The public website's hero slider — Website Configuration > Hero Slider.
 *
 * **Not `home_banners`, deliberately.** That table is the *mobile app's*
 * carousel: one headline, one subtitle, 64:27 artwork and a tap target. The
 * website hero is a different shape of thing — an eyebrow chip, a headline with
 * one highlighted word, a paragraph, two buttons, two floating figures and 4:3
 * artwork. Sharing one table would leave half the columns permanently null for
 * whichever client was not being edited, and a change made for the app would
 * silently reshape the website.
 *
 * Artwork is a Media Library collection rather than a column, same as home
 * banners: the file is re-encoded and needs a disk, which a `string` path does
 * not give us.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_hero_slides', function (Blueprint $table): void {
            $table->id();

            /*
             * Every text column has a `_si` sibling. English is the record; a
             * blank Sinhala column means "not translated yet" and falls back
             * (root CLAUDE.md §8 "Internationalization").
             */
            $table->string('eyebrow', 60)->nullable();
            $table->string('eyebrow_si', 60)->nullable();

            /*
             * `**double asterisks**` mark the word drawn in gold. The marker
             * travels inside the string rather than in a second column so the
             * admin can move the emphasis without the two disagreeing. It is
             * NOT Markdown and is never rendered as HTML — `Highlight.tsx`
             * splits the string and styles the segment.
             */
            $table->string('heading', 120)->nullable();
            $table->string('heading_si', 120)->nullable();

            $table->string('body', 300)->nullable();
            $table->string('body_si', 300)->nullable();

            /*
             * Two buttons, each label plus a destination. The destination is a
             * fixed enum (App\Enums\SiteLinkTarget), never a path typed by an
             * admin: a free-text link field on the front page's primary button
             * is how a `javascript:` or an off-site redirect gets in.
             *
             * `*_course_programme_id` and `*_url` are the two targets that need
             * a value. Separate typed columns, like home banners, so a deleted
             * course nulls itself out rather than leaving a dead id behind.
             */
            $table->string('primary_cta_label', 40)->nullable();
            $table->string('primary_cta_label_si', 40)->nullable();
            $table->string('primary_cta_target', 32)->default('none');
            $table->foreignId('primary_cta_course_programme_id')
                ->nullable()
                ->constrained('course_programmes')
                ->nullOnDelete();
            $table->string('primary_cta_url', 2048)->nullable();

            $table->string('secondary_cta_label', 40)->nullable();
            $table->string('secondary_cta_label_si', 40)->nullable();
            $table->string('secondary_cta_target', 32)->default('none');
            $table->foreignId('secondary_cta_course_programme_id')
                ->nullable()
                ->constrained('course_programmes')
                ->nullOnDelete();
            $table->string('secondary_cta_url', 2048)->nullable();

            /*
             * The two small figures that float over the artwork. Exactly two by
             * design, so two pairs of columns rather than a json array — there
             * is nothing to iterate, and typed columns get real validation
             * rules instead of a shape check.
             *
             * The value ("500+", "1:1") is not translated: it is digits and
             * punctuation in both languages, like money (root CLAUDE.md §8).
             */
            $table->string('stat_one_value', 12)->nullable();
            $table->string('stat_one_label', 24)->nullable();
            $table->string('stat_one_label_si', 24)->nullable();
            $table->string('stat_two_value', 12)->nullable();
            $table->string('stat_two_label', 24)->nullable();
            $table->string('stat_two_label_si', 24)->nullable();

            // App\Enums\SiteHeroIcon. Drawn in the designed fallback panel when
            // a slide has no artwork yet, so copy can go live before the photo.
            $table->string('icon', 32)->default('education');

            $table->unsignedInteger('sort_order')->default(0);

            // Off by default: a new slide is finished in the form, then shown.
            $table->boolean('is_visible')->default(false);

            $table->timestamps();

            // The public endpoint's only query: visible slides in admin order.
            $table->index(['is_visible', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_hero_slides');
    }
};
