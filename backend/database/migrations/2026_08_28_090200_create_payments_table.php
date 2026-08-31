<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();

            // One order can hold several attempts: a declined card retried, or a
            // rejected bank transfer resubmitted (FR-MOB-035).
            $table->string('method');
            $table->string('gateway')->nullable();
            $table->string('gateway_reference')->nullable();

            $table->unsignedBigInteger('amount_cents');
            $table->char('currency', 3);
            $table->string('status')->default('pending');

            // Student-entered bank reference (FR-MOB-033). Null for card payments.
            $table->string('reference_number')->nullable();

            // Gateway response, scrubbed of anything card-like before it is stored.
            $table->json('gateway_payload')->nullable();

            // Manual verification audit trail (FR-ADM-020, FR-ADM-017).
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->string('review_remark', 500)->nullable();

            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index(['order_id', 'status']);
            $table->index(['method', 'status']);
            $table->index(['gateway', 'gateway_reference']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
