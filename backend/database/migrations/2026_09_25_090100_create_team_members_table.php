<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The people on the public website's "The Team" carousel.
 *
 * A name, a job title and a photograph — exactly what the card renders, and
 * nothing more. Storing a bio or a social link that no surface displays would
 * be collecting personal data with no purpose for it.
 *
 * **There is no `name_si`.** A person's name is not translated; their job title
 * is, so `role` gets the sibling column and `name` does not.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('team_members', function (Blueprint $table): void {
            $table->id();

            $table->string('name', 120);
            $table->string('role', 120)->nullable();
            $table->string('role_si', 120)->nullable();

            $table->unsignedInteger('sort_order')->default(0);

            // Off by default, same as a hero slide: an admin adds the person,
            // uploads the photograph, then puts them on the website.
            $table->boolean('is_visible')->default(false);

            $table->timestamps();

            $table->index(['is_visible', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('team_members');
    }
};
