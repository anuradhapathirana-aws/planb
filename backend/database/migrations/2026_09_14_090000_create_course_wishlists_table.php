<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Courses a student has saved to their wishlist — the heart on a course tile.
 *
 * Unlike `student_checklist_items`, removing an entry DELETES the row rather
 * than nulling a timestamp: there is nothing worth keeping about a course a
 * student un-hearted, and "is it on the list" is then just "does the row exist".
 * Both writes are still idempotent — adding twice hits the unique index, removing
 * twice deletes nothing.
 *
 * A course that is later unpublished keeps its rows (the student's intent has
 * not changed, and it may come back); the student read paths filter by
 * published status, so it simply stops showing. A soft-deleted course keeps
 * them for the same reason. Only a hard delete of either side cascades.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_wishlists', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_programme_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            // One row per student per course, and the index every read uses:
            // "this student's saved courses".
            $table->unique(['student_id', 'course_programme_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_wishlists');
    }
};
