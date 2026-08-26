<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Students become authenticatable for the mobile app. They sign in with an
 * emailed code or with Google — never a password, which is why no password
 * column is added here.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->timestamp('email_verified_at')->nullable()->after('email');

            /*
             * Google's stable subject id. Recorded on the first Google sign-in and
             * preferred for matching afterwards, so a student who later changes the
             * address on their Google account doesn't lose access to their record.
             */
            $table->string('google_sub')->nullable()->unique()->after('email_verified_at');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropUnique(['google_sub']);
            $table->dropColumn(['email_verified_at', 'google_sub']);
        });
    }
};
