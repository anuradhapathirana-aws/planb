<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\RoleName;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\Concerns\SignsInOnTheWebsite;
use Tests\TestCase;

/**
 * The admin panel and the student app share one Sanctum installation, and
 * Sanctum does NOT keep their actors apart on its own:
 *
 *  - `SanctumServiceProvider::register()` defines `auth.guards.sanctum` with a
 *    null provider, and `Guard::hasValidProvider()` returns true for ANY
 *    tokenable model when the provider is null.
 *  - `Guard::__invoke()` loops over one GLOBAL `sanctum.guard` key, so the
 *    stateful branch cannot be scoped per guard.
 *
 * Two things close those holes: a real `provider` on each Sanctum guard in
 * config/auth.php, and the `admin.actor` / `student.actor` middleware. This test
 * is the proof. **If it fails, fix the code — never the test.**
 *
 * @see backend/CLAUDE.md §1
 */
class GuardIsolationTest extends TestCase
{
    use RefreshDatabase;
    use SignsInOnTheWebsite;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (RoleName::values() as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }
    }

    public function test_student_token_cannot_reach_an_admin_endpoint(): void
    {
        $student = Student::factory()->create(['is_blocked' => false]);

        Sanctum::actingAs($student, ['student'], 'student');

        $this->getJson('/api/v1/admin/students')->assertUnauthorized();
        $this->getJson('/api/v1/admin/me')->assertUnauthorized();
        $this->getJson('/api/v1/admin/course-programmes')->assertUnauthorized();
    }

    /**
     * The one that matters most. `Sanctum::actingAs` fakes guard resolution and
     * never touches `hasValidProvider()`, so this sends a REAL bearer token over
     * the wire — the exact request a tampered mobile client would make.
     *
     * With `auth.guards.sanctum.provider` unset (Sanctum's own default of null),
     * this returns 200 and hands a student the whole admin API.
     */
    public function test_a_real_student_bearer_token_is_rejected_by_the_admin_api(): void
    {
        $student = Student::factory()->create(['is_blocked' => false]);
        $token = $student->createToken('mobile', ['student'])->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/admin/students')
            ->assertUnauthorized();

        // ...and the same token still works where it belongs.
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/student/me')
            ->assertOk();
    }

    /** The mirror: an admin's token must not reach the student API. */
    public function test_a_real_admin_bearer_token_is_rejected_by_the_student_api(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole(RoleName::SuperAdmin->value);
        $token = $admin->createToken('cli', ['*'])->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/student/me')
            ->assertUnauthorized();

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/admin/me')
            ->assertOk();
    }

    public function test_admin_cannot_reach_a_student_endpoint(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole(RoleName::SuperAdmin->value);

        Sanctum::actingAs($admin, ['*'], 'sanctum');

        $this->getJson('/api/v1/student/me')->assertUnauthorized();
    }

    /**
     * Regression guard for the config/auth.php change: giving the `sanctum` guard
     * a real provider is a hardening, and it must not have cost admins their access.
     */
    public function test_admin_still_reaches_admin_endpoints(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole(RoleName::SuperAdmin->value);

        Sanctum::actingAs($admin, ['*'], 'sanctum');

        $this->getJson('/api/v1/admin/me')->assertOk();
        $this->getJson('/api/v1/admin/students')->assertOk();
    }

    public function test_student_reaches_student_endpoints(): void
    {
        $student = Student::factory()->create(['is_blocked' => false]);

        Sanctum::actingAs($student, ['student'], 'student');

        $this->getJson('/api/v1/student/me')
            ->assertOk()
            ->assertJsonPath('data.student_id', $student->student_id);
    }

    public function test_unauthenticated_requests_are_rejected_on_both_areas(): void
    {
        $this->getJson('/api/v1/admin/me')->assertUnauthorized();
        $this->getJson('/api/v1/student/me')->assertUnauthorized();
    }

    /**
     * A token issued before an admin blocked the student must stop working
     * immediately, not at its 30-day expiry.
     */
    public function test_blocked_student_is_rejected_even_with_a_valid_token(): void
    {
        $student = Student::factory()->create(['is_blocked' => true]);

        Sanctum::actingAs($student, ['student'], 'student');

        $this->getJson('/api/v1/student/me')->assertForbidden();
    }

    public function test_soft_deleted_student_is_rejected(): void
    {
        $student = Student::factory()->create(['is_blocked' => false]);
        $student->delete();

        Sanctum::actingAs($student, ['student'], 'student');

        $this->getJson('/api/v1/student/me')->assertForbidden();
    }

    /*
    |--------------------------------------------------------------------------
    | The student web session (SEC-1)
    |--------------------------------------------------------------------------
    |
    | site/ adds a third credential: a `student-web` cookie session. Every test
    | below uses a REAL session — signed in through the endpoint, cookie sent
    | back — because `actingAs()` would skip the guard resolution these exist
    | to prove. See docs/WEBSITE_AND_PORTAL_GUIDE.md §2.3.
    */

    public function test_a_student_web_session_cannot_reach_the_admin_api(): void
    {
        $this->useWebsiteOrigin();
        $cookie = $this->signInOnTheWebsite(Student::factory()->create(['is_blocked' => false]));

        // The session is real: it works where it belongs...
        $this->fromWebsite($cookie)->getJson('/api/v1/student/me')->assertOk();

        // ...and nowhere else.
        $this->fromWebsite($cookie)->getJson('/api/v1/admin/me')->assertUnauthorized();
        $this->fromWebsite($cookie)->getJson('/api/v1/admin/students')->assertUnauthorized();
        $this->fromWebsite($cookie)->getJson('/api/v1/admin/course-programmes')->assertUnauthorized();
    }

    /** An admin's browser session on the student API, over the stateful path. */
    public function test_an_admin_web_session_cannot_reach_the_student_api(): void
    {
        $this->useWebsiteOrigin();
        $admin = User::factory()->create();
        $admin->assignRole(RoleName::SuperAdmin->value);

        $this->actingAs($admin, 'web');

        $this->withHeader('Origin', $this->siteOrigin)
            ->getJson('/api/v1/student/me')
            ->assertUnauthorized();
    }

    /**
     * The API has one host, so one browser holds one session cookie for it —
     * an admin signed in to the portal too has BOTH logins in one session.
     * Each area must still resolve its own actor, never the other.
     */
    public function test_one_browser_signed_in_as_both_resolves_each_area_to_its_own_actor(): void
    {
        $this->useWebsiteOrigin();
        $student = Student::factory()->create(['is_blocked' => false]);
        $cookie = $this->signInOnTheWebsite($student);

        $admin = User::factory()->create();
        $admin->assignRole(RoleName::SuperAdmin->value);

        $this->fromWebsite($cookie);
        $this->actingAs($admin, 'web');

        $this->getJson('/api/v1/student/me')
            ->assertOk()
            ->assertJsonPath('data.student_id', $student->student_id);

        $this->fromWebsite($cookie);
        $this->actingAs($admin, 'web');

        $this->getJson('/api/v1/admin/me')
            ->assertOk()
            ->assertJsonPath('data.email', $admin->email);
    }

    /**
     * `auth/refresh` MINTS a bearer token. From a cookie session it would turn
     * an httpOnly credential into a 30-day one JavaScript can read, which
     * survives signing out. It is token-only.
     */
    public function test_a_student_web_session_cannot_mint_a_bearer_token(): void
    {
        $this->useWebsiteOrigin();
        $student = Student::factory()->create(['is_blocked' => false]);
        $cookie = $this->signInOnTheWebsite($student);

        $this->fromWebsite($cookie)->postJson('/api/v1/student/auth/refresh')->assertUnauthorized();

        $this->assertSame(0, $student->tokens()->count());
    }

    /** Mobile is unaffected by the new guard sitting in front of it. */
    public function test_a_bearer_token_still_works_beside_the_web_guard(): void
    {
        $student = Student::factory()->create(['is_blocked' => false]);
        $token = $student->createToken('mobile', ['student'])->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/student/me')
            ->assertOk()
            ->assertJsonPath('data.student_id', $student->student_id);

        $this->app['auth']->forgetGuards();

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/student/auth/refresh')
            ->assertOk();
    }

    public function test_a_web_session_dies_when_the_student_is_blocked(): void
    {
        $this->useWebsiteOrigin();
        $student = Student::factory()->create(['is_blocked' => false]);
        $cookie = $this->signInOnTheWebsite($student);

        $student->forceFill(['is_blocked' => true])->save();

        $this->fromWebsite($cookie)->getJson('/api/v1/student/me')->assertForbidden();
    }

    /**
     * 401, not the 403 a bearer token gets: the `students` provider excludes
     * soft-deleted rows, so the session cannot even resolve the student — it
     * dies one step before `EnsureStudentActive` would have stopped it.
     */
    public function test_a_web_session_dies_when_the_student_is_deleted(): void
    {
        $this->useWebsiteOrigin();
        $student = Student::factory()->create(['is_blocked' => false]);
        $cookie = $this->signInOnTheWebsite($student);

        $student->delete();

        $this->fromWebsite($cookie)->getJson('/api/v1/student/me')->assertUnauthorized();
    }

    /**
     * A session cookie is only honoured on a request Sanctum treats as stateful
     * — i.e. from a listed website origin. Replayed from anywhere else (a
     * script, an unlisted site), it authenticates nobody.
     */
    public function test_a_web_session_cookie_is_ignored_from_an_unlisted_origin(): void
    {
        $this->useWebsiteOrigin();
        $cookie = $this->signInOnTheWebsite(Student::factory()->create(['is_blocked' => false]));

        // The cookie is live — proven from the real origin first...
        $this->fromWebsite($cookie)->getJson('/api/v1/student/me')->assertOk();

        // ...and worthless from anywhere else.
        $this->freshRequest();

        $this->withCredentials()
            ->withHeader('Origin', 'https://attacker.example')
            ->withCookie(config('session.cookie'), $cookie)
            ->getJson('/api/v1/student/me')
            ->assertUnauthorized();
    }
}
