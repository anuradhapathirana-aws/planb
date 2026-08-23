<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Industry;
use App\Models\Profession;
use Illuminate\Database\Seeder;

/**
 * Illustrative starter data for FR-ADM-012 (admin-managed industry/profession
 * lists). The client manages the real list going forward via the Industries
 * and Professions admin pages — this just seeds local/dev environments with
 * something non-empty to work with.
 */
class IndustrySeeder extends Seeder
{
    private const CATALOG = [
        'Hospitality' => ['Chef', 'Waiter / Waitress', 'Housekeeping Attendant', 'Barista', 'Hotel Receptionist'],
        'Construction' => ['Mason', 'Electrician', 'Plumber', 'Site Supervisor', 'Carpenter'],
        'Healthcare Support' => ['Nursing Assistant', 'Caregiver', 'Pharmacy Assistant', 'Medical Receptionist'],
        'Retail & Sales' => ['Sales Associate', 'Cashier', 'Store Supervisor', 'Merchandiser'],
        'Logistics & Driving' => ['Delivery Driver', 'Warehouse Assistant', 'Forklift Operator', 'Heavy Vehicle Driver'],
        'Beauty & Wellness' => ['Hairdresser', 'Beautician', 'Spa Therapist', 'Nail Technician'],
        'Office Administration' => ['Receptionist', 'Data Entry Clerk', 'Office Assistant', 'Administrative Coordinator'],
    ];

    public function run(): void
    {
        foreach (self::CATALOG as $industryName => $professions) {
            $industry = Industry::firstOrCreate(['name' => $industryName]);

            foreach ($professions as $professionName) {
                Profession::firstOrCreate(['industry_id' => $industry->id, 'name' => $professionName]);
            }
        }
    }
}
