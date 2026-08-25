<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_papers', function (Blueprint $table): void {
            $table->id();
            // Unique: a programme has at most one paper, and none at all is normal.
            $table->foreignId('course_programme_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('instructions')->nullable();
            $table->unsignedTinyInteger('pass_mark')->default(70);
            // Null = unlimited retries (FR-MOB-024).
            $table->unsignedSmallInteger('max_attempts')->nullable();
            $table->boolean('requires_all_videos_watched')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_papers');
    }
};
