<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_question_options', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_question_id')->constrained()->cascadeOnDelete();
            $table->string('text');
            // Exactly one true per question, enforced in CoursePaperRequest.
            $table->boolean('is_correct')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['course_question_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_question_options');
    }
};
