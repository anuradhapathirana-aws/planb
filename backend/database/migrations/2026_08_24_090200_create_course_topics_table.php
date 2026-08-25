<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_topics', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_programme_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            // Sanitized HTML from the admin's rich-text editor (hyperlinks allowed).
            $table->text('description')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['course_programme_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_topics');
    }
};
