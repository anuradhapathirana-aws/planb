<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * In-app account deletion (Google Play's account-deletion policy).
 *
 * A student who deletes their account is anonymised, not hard-deleted: their
 * orders, payments and enrolments cascade from `students`, and those are
 * finance records Plan B must keep. `anonymised_at` is what tells that row
 * apart from one an admin soft-deleted, which is recoverable in principle.
 *
 * `purpose` separates a deletion code from a sign-in code. Without it the two
 * share one "live code" slot, so a code emailed to confirm a deletion would
 * also sign someone in, and requesting a sign-in code would silently void a
 * pending deletion.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table): void {
            $table->timestamp('anonymised_at')->nullable()->after('deleted_at');
        });

        Schema::table('student_login_codes', function (Blueprint $table): void {
            // String + PHP enum `App\Enums\LoginCodePurpose`, not a DB enum
            // (backend/CLAUDE.md §7). Existing rows are all sign-in codes.
            $table->string('purpose', 32)->default('sign_in')->after('student_id');

            // Finding the one live code for a student, now per purpose. Named
            // explicitly: the generated name passes MySQL's 64-character limit.
            $table->index(
                ['student_id', 'purpose', 'consumed_at', 'voided_at'],
                'login_codes_student_purpose_live_index',
            );
        });
    }

    public function down(): void
    {
        Schema::table('student_login_codes', function (Blueprint $table): void {
            $table->dropIndex('login_codes_student_purpose_live_index');
            $table->dropColumn('purpose');
        });

        Schema::table('students', function (Blueprint $table): void {
            $table->dropColumn('anonymised_at');
        });
    }
};
