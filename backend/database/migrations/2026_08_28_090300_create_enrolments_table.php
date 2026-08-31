<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('enrolments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_programme_id')->constrained()->cascadeOnDelete();

            // Null for a free course or an admin grant - there was no purchase.
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->string('source')->default('purchase');

            // Who granted it, when it was granted. Access does not expire.
            $table->foreignId('granted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('enrolled_at');
            $table->timestamps();

            // One enrolment per student per course - paying twice cannot happen.
            $table->unique(['student_id', 'course_programme_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enrolments');
    }
};
