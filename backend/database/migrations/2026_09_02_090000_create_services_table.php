<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('services', function (Blueprint $table): void {
            $table->id();
            $table->string('name');

            // One line for a catalogue card. `description` is the long,
            // rich-text version shown on the detail screen.
            $table->string('summary', 300)->nullable();
            $table->text('description')->nullable();

            /*
             * Smallest currency unit as an integer, never a float (CLAUDE.md
             * §4.11). Unlike a course this may not be zero: a service exists to
             * be paid for, and a free one would open an order the payment layer
             * rejects. Enforced in the Form Request, where the admin sees it.
             */
            $table->unsignedBigInteger('price_cents')->default(0);
            $table->char('currency', 3)->default('LKR');

            /*
             * Roughly how long delivery takes, shown to the student before they
             * pay so "nothing has happened yet" is an expectation rather than a
             * support ticket. Free text: "3-5 working days" is more honest than
             * a number we would have to defend.
             */
            $table->string('delivery_time', 120)->nullable();

            $table->string('status')->default('draft');
            $table->unsignedInteger('sort_order')->default(0);
            $table->softDeletes();
            $table->timestamps();

            /*
             * Indexed, NOT unique. Uniqueness is enforced in the Form Request
             * against non-deleted rows only; a database unique index would turn
             * "delete a service, later create one with the same name again"
             * into a 500 instead of a form error, because MySQL cannot express
             * a partial index over `deleted_at IS NULL`.
             */
            $table->index('name');
            $table->index(['status', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('services');
    }
};
