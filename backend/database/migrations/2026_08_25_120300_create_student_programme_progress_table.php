<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-student, per-programme bookkeeping.
 *
 * Note there is deliberately NO equivalent table for topics: topic completion is
 * `COUNT(watched) = COUNT(videos)`, one grouped query, and denormalising it
 * breaks the moment an admin adds a video to a topic students have already
 * finished. See docs/schema.md.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_programme_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_programme_id')->constrained()->cascadeOnDelete();

            $table->timestamp('started_at')->nullable();

            // Powers "Continue learning" on the app's home screen.
            $table->foreignId('last_course_video_id')
                ->nullable()
                ->constrained('course_videos')
                ->nullOnDelete();

            $table->timestamp('completed_at')->nullable();

            $table->timestamps();

            $table->unique(['student_id', 'course_programme_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_programme_progress');
    }
};
