<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_webhook_events', function (Blueprint $table): void {
            $table->id();
            $table->string('gateway');

            /*
             * Idempotency key. Gateways retry until they get a 200, so the same
             * event WILL arrive more than once; the unique index is what stops a
             * replay enrolling a student twice or double-counting revenue.
             */
            $table->string('event_id');

            $table->json('payload');
            $table->timestamp('processed_at')->nullable();
            $table->string('outcome')->nullable();
            $table->timestamps();

            $table->unique(['gateway', 'event_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_webhook_events');
    }
};
