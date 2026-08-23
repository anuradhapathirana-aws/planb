<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\RoleName;
use App\Models\User;
use Illuminate\Database\Seeder;

class AdminUserSeeder extends Seeder
{
    /**
     * Local/dev-only seed accounts, one per role, for exercising the admin panel.
     * Never run against production — create real Super Admin accounts manually there.
     */
    public function run(): void
    {
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
