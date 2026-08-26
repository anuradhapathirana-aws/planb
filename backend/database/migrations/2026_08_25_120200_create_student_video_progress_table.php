<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * How far a student has got through each lesson.
 *
 * This table is where the no-skip rule actually lives: `max_position_seconds` is
 * a monotonic high-water mark that the server refuses to advance faster than
 * wall-clock time allows. The player's forward-seek clamp is UX on top of it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_video_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_video_id')->constrained()->cascadeOnDelete();

            // Never decreases. Rewinding does not lose ground, skipping cannot gain it.
            $table->unsignedInteger('max_position_seconds')->default(0);

            // Accumulated plausible playback time — what makes faking progress cost
            // as long as actually watching. Position alone is beatable by a client
            // that lies slowly.
            $table->unsignedInteger('watched_seconds')->default(0);

            // Snapshot taken at completion, so replacing the lesson file later with
            // a longer one can't retroactively un-complete a student.
            $table->unsignedInteger('duration_seconds')->nullable();

            $table->boolean('is_watched')->default(false);
            $table->timestamp('watched_at')->nullable();

            // Feeds the rate-plausibility check on the next write.
            $table->timestamp('last_seen_at')->nullable();

            $table->timestamps();

            $table->unique(['student_id', 'course_video_id']);
            $table->index(['student_id', 'is_watched']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_video_progress');
    }
};
