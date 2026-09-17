<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\RoleName;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use Spatie\Permission\Models\Role;

use function Laravel\Prompts\password;
use function Laravel\Prompts\select;
use function Laravel\Prompts\text;

/**
 * Creates a real admin account on a live server.
 *
 * `AdminUserSeeder` exists for local work only — it writes four accounts with a
 * published password and must never touch production. Without this command the
 * first deploy ends at a login screen with no account to log in with.
 *
 * The password is always typed at the prompt, never passed as an option: a
 * command line ends up in shell history and in the process list, where every
 * other user on the box can read it.
 */
class CreateAdminUser extends Command
{
    protected $signature = 'admin:create
        {--name= : Full name}
        {--email= : Sign-in email}
        {--role= : One of the admin roles (default: super_admin)}';

    protected $description = 'Create an admin account for the web panel';

    public function handle(): int
    {
        $name = $this->option('name') ?: text(
            label: 'Full name',
            placeholder: 'Anuradha Pathirana',
            required: true,
        );

        $email = strtolower(trim((string) ($this->option('email') ?: text(
            label: 'Sign-in email',
            placeholder: 'anuradha@planbinternational.lk',
            required: true,
        ))));

        $role = $this->option('role') ?: select(
            label: 'Role',
            options: RoleName::values(),
            default: RoleName::SuperAdmin->value,
        );

        $plainPassword = password(
            label: 'Password',
            hint: 'At least 12 characters, and not one that has leaked online. It is not shown as you type.',
            required: true,
        );

        $confirmation = password(label: 'Type the password again', required: true);

        $validator = Validator::make(
            ['name' => $name, 'email' => $email, 'role' => $role, 'password' => $plainPassword],
            [
                'name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'email', 'max:255', 'unique:users,email'],
                'role' => ['required', 'string', 'in:'.implode(',', RoleName::values())],
                /*
                 * Long and never leaked, rather than cryptic: an admin password
                 * guards every student record, and forced upper/lower/digit
                 * mixes just produce "Password123!" (NIST SP 800-63B).
                 *
                 * `uncompromised()` checks Have I Been Pwned by k-anonymity —
                 * only the first 5 characters of the SHA-1 leave the server. If
                 * the service can't be reached it lets the password through
                 * rather than blocking the first admin on a firewalled box.
                 */
                'password' => ['required', 'string', Password::min(12)->uncompromised()],
            ],
            ['email.unique' => 'An account with that email already exists.'],
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $this->error($message);
            }

            return self::FAILURE;
        }

        if ($plainPassword !== $confirmation) {
            $this->error('The two passwords do not match.');

            return self::FAILURE;
        }

        // Roles are reference data, normally seeded by RoleSeeder. Creating the
        // missing one here means a fresh server cannot end up with an admin who
        // has no role and therefore no access.
        Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);

        $user = User::create([
            'name' => $name,
            'email' => $email,
            // The model casts this to a hash; the plain value is never stored.
            'password' => $plainPassword,
        ]);

        $user->syncRoles([$role]);

        $this->newLine();
        $this->info("Created {$role} account for {$email}.");
        $this->line('Sign in at the admin panel and change nothing else — the password is not recoverable from here.');

        return self::SUCCESS;
    }
}
