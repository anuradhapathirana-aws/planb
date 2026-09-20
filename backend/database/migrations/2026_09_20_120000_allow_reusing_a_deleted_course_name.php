<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Deleting a course kept its name reserved forever.
 *
 * `course_programmes` is soft-deleted, but its unique index counted deleted rows
 * while the Form Request's check ignored them. So recreating a course with the
 * name of a deleted one passed validation and then hit a duplicate-key error —
 * the admin saw "Could not save the course." with nothing to act on.
 *
 * Adding `deleted_at` to the index fixes the mismatch: in both MySQL and SQLite
 * a NULL makes a row distinct for uniqueness, so there can still be only one
 * LIVE course of a given name per category, while any number of deleted ones may
 * share it.
 */
return new class extends Migration
{
    public function up(): void
    {
        /*
         * Order matters on MySQL: `course_category_id`'s foreign key leans on
         * the old index, and dropping it first fails with "needed in a foreign
         * key constraint". The new index starts with the same column, so once it
         * exists the constraint has something else to lean on.
         */
        Schema::table('course_programmes', function (Blueprint $table): void {
            $table->unique(['course_category_id', 'name', 'deleted_at']);
        });

        Schema::table('course_programmes', function (Blueprint $table): void {
            $table->dropUnique(['course_category_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::table('course_programmes', function (Blueprint $table): void {
            $table->unique(['course_category_id', 'name']);
        });

        Schema::table('course_programmes', function (Blueprint $table): void {
            $table->dropUnique(['course_category_id', 'name', 'deleted_at']);
        });
    }
};
