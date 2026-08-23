<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->string('student_id')->unique();
            $table->string('full_name')->nullable();
            $table->string('email')->nullable()->unique();
            $table->string('contact_number')->nullable();
            $table->string('address')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('highest_qualification')->nullable();
            $table->string('profession_category')->nullable();
            $table->string('visa_status')->nullable();
            $table->json('languages_spoken')->nullable();
            $table->boolean('is_blocked')->default(false);
            $table->timestamp('registered_at')->nullable();
            $table->foreignId('imported_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('is_blocked');
            $table->index('registered_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
