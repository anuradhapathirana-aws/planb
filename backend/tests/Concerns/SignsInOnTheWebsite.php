<?php

declare(strict_types=1);

namespace Tests\Concerns;

use App\Models\Student;
use App\Models\StudentLoginCode;
use Database\Factories\StudentLoginCodeFactory;
use Illuminate\Testing\TestResponse;

/**
 * Drives the student web session the way a browser does: a request carrying
 * the website's Origin (so Sanctum treats it as stateful and starts a session),
 * then the session cookie sent back on later requests.
 *
 * Deliberately NOT `actingAs()`. That sets a user on a guard directly, which is
 * exactly the step whose failure these tests exist to catch — a leak between
 * guards lives in how a request is resolved, not in who a guard already holds.
 */
trait SignsInOnTheWebsite
{
    protected string $siteOrigin = 'http://localhost:5184';

    protected function useWebsiteOrigin(): void
    {
        config(['sanctum.stateful' => ['localhost:5184']]);
    }

    /** Signs in through the real endpoint and returns the session cookie's value. */
    protected function signInOnTheWebsite(Student $student): string
    {
        // The factory may leave `email` null; an emailed code needs an address.
        if ($student->email === null) {
            $student->forceFill(['email' => "student{$student->id}@example.com"])->save();
        }

        StudentLoginCode::factory()->for($student)->create(['email' => $student->email]);

        $response = $this->fromWebsite()
            ->postJson('/api/v1/student/auth/session/verify-code', [
                'email' => $student->email,
                'code' => StudentLoginCodeFactory::PLAIN_CODE,
            ])
            ->assertOk();

        return $this->sessionCookieFrom($response);
    }

    protected function sessionCookieFrom(TestResponse $response): string
    {
        $cookie = $response->getCookie(config('session.cookie'));

        $this->assertNotNull($cookie, 'A website sign-in must set the session cookie.');

        return $cookie->getValue();
    }

    /**
     * The next request, as the website with this session cookie.
     *
     * `forgetGuards()` is load-bearing: the test application lives for the whole
     * method and a guard keeps the user it resolved, so without it a second
     * request would reuse the first one's identity instead of re-reading the
     * cookie. In production every request gets a fresh container.
     */
    protected function fromWebsite(?string $sessionCookie = null): static
    {
        $this->freshRequest();

        // Cookies set with `withCookie` persist across requests in a test; a
        // request made without one must really carry none.
        $this->defaultCookies = [];

        // Like the browser's `withCredentials`: without it the test client
        // drops cookies from a JSON request entirely.
        $this->withCredentials();
        $this->withHeader('Origin', $this->siteOrigin);

        if ($sessionCookie !== null) {
            $this->withCookie(config('session.cookie'), $sessionCookie);
        }

        return $this;
    }

    /**
     * Reset what a new PHP process would start without.
     *
     * The session `Store` is one object for the whole test method, and it keeps
     * the previous request's attributes in memory after saving them. Left alone,
     * a request would stay "signed in" without sending any cookie — which made
     * a replayed-cookie test pass for the wrong reason and could hide a real
     * leak. Flushing the in-memory copy leaves the saved session in the handler,
     * so it now loads only when a request actually carries its cookie.
     */
    protected function freshRequest(): void
    {
        $this->app['auth']->forgetGuards();
        $this->app['session']->driver()->flush();
    }
}
