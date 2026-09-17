<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\RoleName;
use App\Models\User;
use Database\Seeders\Concerns\LocalOnly;
use Illuminate\Database\Seeder;

class AdminUserSeeder extends Seeder
{
    use LocalOnly;

    /**
     * Local/dev-only seed accounts, one per role, for exercising the admin panel.
     * Refuses to run on a server — create real admins there with `php artisan admin:create`.
     */
    public function run(): void
    {
        $this->ensureLocalEnvironment();

        $accounts = [
            ['name' => 'Anuradha (Super Admin)', 'email' => 'admin@planbinternational.test', 'role' => RoleName::SuperAdmin],
            ['name' => 'Content Manager', 'email' => 'content@planbinternational.test', 'role' => RoleName::ContentManager],
            ['name' => 'Support Agent', 'email' => 'support@planbinternational.test', 'role' => RoleName::SupportAgent],
            ['name' => 'Accountant', 'email' => 'accounts@planbinternational.test', 'role' => RoleName::Accountant],
        ];

        foreach ($accounts as $account) {
            $user = User::firstOrCreate(
                ['email' => $account['email']],
                ['name' => $account['name'], 'password' => 'Password123!'],
            );

            $user->syncRoles([$account['role']->value]);
        }
    }
}
