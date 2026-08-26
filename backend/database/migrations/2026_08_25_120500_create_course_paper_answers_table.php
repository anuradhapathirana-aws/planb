<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_paper_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_paper_attempt_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_question_id')->constrained()->cascadeOnDelete();

            $table->foreignId('course_question_option_id')
                ->nullable()
                ->constrained('course_question_options')
                ->nullOnDelete();

            /*
             * The admin paper `update` deletes any question missing from its
             * payload. Without these snapshots a past attempt becomes a list of
             * dangling ids that can no longer be shown to the student.
             */
            $table->text('question_text_snapshot');
            $table->string('option_text_snapshot')->nullable();

            // Graded server-side at submit — never sent by, or trusted from, the client.
            $table->boolean('is_correct');

            $table->timestamps();

            // Named explicitly — the auto-generated name runs past MySQL's
            // 64-character identifier limit.
            $table->unique(
                ['course_paper_attempt_id', 'course_question_id'],
                'paper_answers_attempt_question_unique',
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_paper_answers');
    }
};
