<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sub-categories: "Migration" → "UAE", "AUS", "CHINA".
 *
 * A self-referencing `parent_id` rather than a second table, so a course keeps
 * pointing at exactly one category through the column it already has — orders,
 * enrolments and progress never learn the tree exists. Two levels only; that is
 * enforced in the Form Requests, not here.
 *
 * No data moves. Every existing category becomes a parent with no children, and a
 * course may sit directly on a parent, so every existing course stays valid.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('course_categories', function (Blueprint $table): void {
            // Restrict, not cascade: a delete goes through CourseCategoryService,
            // which soft-deletes the children itself.
            $table->foreignId('parent_id')
                ->nullable()
                ->after('id')
                ->constrained('course_categories')
                ->restrictOnDelete();

            $table->softDeletes();
        });

        /*
         * Sinhala, optional and not unique — the same rules as course names.
         * Guarded because the development database already has this column,
         * added by hand with no migration (see the note in docs/schema.md).
         */
        if (! Schema::hasColumn('course_categories', 'name_si')) {
            Schema::table('course_categories', function (Blueprint $table): void {
                $table->string('name_si')->nullable()->after('name');
            });
        }

        /*
         * Unique per parent now, so "UAE" can sit under both Migration and Jobs.
         * Enforced in the Form Requests only: a unique index over a nullable
         * `parent_id` would not stop two top-level duplicates anyway, because
         * MySQL treats every NULL as distinct.
         */
        Schema::table('course_categories', function (Blueprint $table): void {
            $table->dropUnique(['name']);
            $table->index(['parent_id', 'sort_order']);
        });

        /*
         * Hard-deleting a category used to hard-delete its courses, and through
         * them every enrolment, progress row and lesson — a student's paid access
         * gone with no undo. Categories are soft-deleted now, and the database
         * refuses the hard path outright.
         */
        Schema::table('course_programmes', function (Blueprint $table): void {
            $table->dropForeign(['course_category_id']);
            $table->foreign('course_category_id')
                ->references('id')
                ->on('course_categories')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('course_programmes', function (Blueprint $table): void {
            $table->dropForeign(['course_category_id']);
            $table->foreign('course_category_id')
                ->references('id')
                ->on('course_categories')
                ->cascadeOnDelete();
        });

        Schema::table('course_categories', function (Blueprint $table): void {
            $table->dropIndex(['parent_id', 'sort_order']);
            $table->unique('name');
        });

        Schema::table('course_categories', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('parent_id');
            $table->dropColumn('name_si');
            $table->dropSoftDeletes();
        });
    }
};
