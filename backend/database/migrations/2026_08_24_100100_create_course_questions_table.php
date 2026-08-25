<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_questions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_paper_id')->constrained()->cascadeOnDelete();
            $table->text('text');
            $table->string('type')->default('multiple_choice');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['course_paper_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_questions');
    }
};
