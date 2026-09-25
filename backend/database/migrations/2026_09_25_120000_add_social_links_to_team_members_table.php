<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Facebook and LinkedIn links on a team card (client request, 2026-09-25).
 *
 * A new migration rather than an edit to `create_team_members_table`, per root
 * CLAUDE.md §13.1 — that one has already run on this machine and on Anuradha's.
 *
 * Two named columns, not a generic `links` JSON blob: the card draws exactly
 * these two icons, and a free-form blob would put the choice of network — and
 * therefore the choice of icon — in the hands of whatever an admin typed. A
 * third network is another column and another line in the resource.
 *
 * `2048` matches the hero slide's CTA url column, which is the other place an
 * admin pastes a web address.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('team_members', function (Blueprint $table): void {
            $table->string('facebook_url', 2048)->nullable()->after('role_si');
            $table->string('linkedin_url', 2048)->nullable()->after('facebook_url');
        });
    }

    public function down(): void
    {
        Schema::table('team_members', function (Blueprint $table): void {
            $table->dropColumn(['facebook_url', 'linkedin_url']);
        });
    }
};
