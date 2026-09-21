<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A second, Sinhala title for the three things a student reads their way through
 * a course by: the programme, its topics, and its lessons.
 *
 * Nullable, and it stays nullable. The English column remains the record — it is
 * what the admin panel lists and searches, what `purchasableTitle()` snapshots
 * onto an order, and what a Sinhala student falls back to when nobody has
 * translated a row yet. That mirrors how `si.json` already falls back key by key
 * (root CLAUDE.md §8), so the whole catalogue did not have to be translated
 * before any of it could be.
 *
 * A separate column rather than a `course_translations` table: there are exactly
 * two locales and they were chosen by the client, not discovered at runtime, so
 * a join per topic per lesson would buy flexibility nothing is asking for.
 *
 * **Every step is guarded by `hasColumn`**, which is not the usual style here.
 * The development database already had all three columns, added by hand rather
 * than by a migration, so an unguarded `up()` dies on "duplicate column" there
 * while a fresh staging or production database still needs them created. The
 * guard is what lets one migration be correct in both places. It has no cost
 * after this runs once.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('course_programmes', 'name_si')) {
            Schema::table('course_programmes', function (Blueprint $table): void {
                $table->string('name_si')->nullable()->after('name');
            });
        }

        if (! Schema::hasColumn('course_topics', 'title_si')) {
            Schema::table('course_topics', function (Blueprint $table): void {
                $table->string('title_si')->nullable()->after('title');
            });
        }

        if (! Schema::hasColumn('course_videos', 'title_si')) {
            Schema::table('course_videos', function (Blueprint $table): void {
                $table->string('title_si')->nullable()->after('title');
            });
        }
    }

    public function down(): void
    {
        foreach (['course_programmes' => 'name_si', 'course_topics' => 'title_si', 'course_videos' => 'title_si'] as $table => $column) {
            if (Schema::hasColumn($table, $column)) {
                Schema::table($table, fn (Blueprint $blueprint) => $blueprint->dropColumn($column));
            }
        }
    }
};
