<?php

namespace Database\Seeders;

use Database\Seeders\Concerns\LocalOnly;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use LocalOnly;

    /**
     * Seed the application's database — locally only.
     *
     * Checked up front rather than left to `AdminUserSeeder`, so a mistaken
     * `db:seed` on a server stops before writing anything instead of leaving
     * roles and industries behind and failing halfway.
     */
    public function run(): void
    {
        $this->ensureLocalEnvironment();

        $this->call([
            RoleSeeder::class,
            AdminUserSeeder::class,
            IndustrySeeder::class,
            StudentSeeder::class,
            HomeCarouselSeeder::class,
            WebsiteContentSeeder::class,
        ]);
    }
}
