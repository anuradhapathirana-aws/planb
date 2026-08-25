<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_videos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_topic_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            // 'external' is unused today — it reserves the shape for Bunny Stream
            // so moving hosting off the app server needs no migration.
            $table->string('provider')->default('upload');
            $table->string('external_url')->nullable();
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['course_topic_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_videos');
    }
};
