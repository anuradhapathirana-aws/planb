<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One-time codes emailed to a student to sign in.
 *
 * A row is only ever created for a real, eligible student — a request for an
 * unknown address writes nothing, so this table can't be used to work out which
 * addresses exist.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_login_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();

            // Snapshot of where it was actually sent, in case the record changes after.
            $table->string('email');

            // Hashed, never plaintext: a database dump must not hand over live codes.
            $table->string('code_hash');

            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('consumed_at')->nullable();

            // Set when superseded by a resend, or burned by too many wrong guesses.
            $table->timestamp('voided_at')->nullable();

            // Abuse forensics only. Never written to logs (CLAUDE.md §13.10).
            $table->string('request_ip', 45)->nullable();

            $table->timestamps();

            // Finding the one live code for a student.
            $table->index(['student_id', 'consumed_at', 'voided_at']);
            // Pruning.
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_login_codes');
    }
};
