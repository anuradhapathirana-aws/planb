<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ServicePurchaseStatus;
use App\Models\Order;
use App\Models\Service;
use App\Models\ServicePurchase;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ServicePurchase>
 */
class ServicePurchaseFactory extends Factory
{
    protected $model = ServicePurchase::class;

    /**
     * `status` is absent on purpose: it is not fillable — only
     * `ServicePurchaseService::advance()` writes it — so a factory attribute
     * would be silently discarded. The model's own default makes a new row
     * pending, and {@see self::status()} forces anything else.
     */
    public function definition(): array
    {
        return [
            'student_id' => Student::factory(),
            'service_id' => Service::factory(),
            'order_id' => Order::factory(),
            'title_snapshot' => 'CV Writing',
            'purchased_at' => now(),
        ];
    }

    public function status(ServicePurchaseStatus $status): static
    {
        return $this->afterMaking(
            fn (ServicePurchase $purchase) => $purchase->forceFill(['status' => $status]),
        );
    }
}
