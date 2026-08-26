<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One student's run at one Q&A paper (FR-MOB-024/025).
 *
 * Deliberately full of snapshots: an admin editing a paper afterwards must not
 * change a stored result or make a past attempt unreadable.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_paper_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_paper_id')->constrained()->cascadeOnDelete();

            // 1-based per (student, paper). How `max_attempts` is enforced.
            $table->unsignedSmallInteger('attempt_number');

            // string + PHP enum cast, matching the checklist_items.phase precedent
            // rather than a DB enum (which needs a migration to add a case).
            $table->string('status', 16);

            /*
             * The pass mark as it stood when this attempt started. An admin raising
             * a paper's pass_mark from 70 to 80 must not retroactively fail last
             * month's cohort.
             */
            $table->unsignedTinyInteger('pass_mark_snapshot');

            $table->unsignedSmallInteger('total_questions');
            $table->unsignedSmallInteger('correct_answers')->nullable();

            // Rounded for display; correct/total is kept so it stays recomputable.
            $table->unsignedTinyInteger('score_percent')->nullable();
            $table->boolean('is_passed')->nullable();

            $table->timestamp('started_at');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            // Names given explicitly: the auto-generated ones run past MySQL's
            // 64-character identifier limit.
            $table->unique(
                ['student_id', 'course_paper_id', 'attempt_number'],
                'paper_attempts_student_paper_number_unique',
            );
            $table->index(
                ['student_id', 'course_paper_id', 'status'],
                'paper_attempts_student_paper_status_index',
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_paper_attempts');
    }
};
