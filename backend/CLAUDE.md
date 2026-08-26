# Backend — Plan B International API

Read this before touching auth, guards, policies, or any student-facing endpoint.
The root `CLAUDE.md` still applies in full; this file covers what is specific to `backend/`.

## 1. Two actor types, and why keeping them apart is not automatic

There are two kinds of authenticated actor and they share nothing:

| Actor | Model | Routes | Credential |
|---|---|---|---|
| Admin / staff | `App\Models\User` | `/api/v1/admin/*` | Sanctum SPA cookie session, from `web/` |
| Student | `App\Models\Student` | `/api/v1/student/*` | Sanctum Bearer token, from `mobile/` |

Both models use `HasApiTokens`. **Sanctum does not separate them for you.** Two facts in vendor code:

- `vendor/laravel/sanctum/src/Guard.php` — `__invoke()` loops over
  `config('sanctum.guard')`, a **single global key**. Every Sanctum-driven guard reads the same list,
  so a session that satisfies one can satisfy another.
- `vendor/laravel/sanctum/src/SanctumServiceProvider.php` — `register()` force-defines
  `auth.guards.sanctum` with `'provider' => null`, and `Guard::hasValidProvider()` returns `true`
  unconditionally when the provider is null. With a null provider, a token from **any** tokenable
  model authenticates.

Two things hold the line, and both must stay:

**1. Every Sanctum guard names a real provider** in `config/auth.php`, which is what makes
`hasValidProvider()` do an actual `instanceof` check:

```php
'sanctum' => ['driver' => 'sanctum', 'provider' => 'users'],     // admin tokens/session
'student' => ['driver' => 'sanctum', 'provider' => 'students'],  // student tokens
```

Never set either back to a null provider. `config/sanctum.php` is left stock on purpose — do not add
guards to its `'guard'` array to "fix" a student session; that global list is exactly the leak.

**2. Actor middleware on every route group.** `EnsureAdminActor` (401 unless
`$request->user() instanceof User`) and `EnsureStudentActor` (401 unless `instanceof Student`) close
the session-side path the global list still allows. `EnsureStudentActive` (403 on blocked or
soft-deleted) rides with the student group so a token issued before a block dies immediately.

`tests/Feature/GuardIsolationTest.php` proves all four directions. **If it fails, stop** — do not
adjust the test.

## 2. Policies

**Never widen an existing policy's signature to accept a `Student`.** The six policies in
`app/Policies/` type-hint `User` and must keep doing so — a union type turns a guard leak from a 401
into a silent authorization bypass.

Student authorization works differently:

- **Read paths are gated by query scope, not by actor.** "Published" is not a per-student rule, so
  student course routes bind their models through a published scope:
  `Route::bind('programme', fn ($v) => CourseProgramme::published()->findOrFail($v))`.
  An unpublished or soft-deleted record 404s before any controller runs. That binding *is* the
  authorization; no policy is involved.
- **Per-row ownership gets a new policy on a new model** — e.g.
  `CoursePaperAttemptPolicy::view(Student $student, CoursePaperAttempt $attempt)`. No collision with
  the `User`-typed ones, and Laravel 11 auto-discovers it.

## 3. Student-facing responses

- **A student-facing endpoint always gets its own API Resource**, in `app/Http/Resources/Student/`.
  Never reuse an admin Resource for a student route.
- **`is_correct` never leaves the server on a student route.** `CourseQuestionOptionResource` carries
  it because only admins read that endpoint. `StudentCourseQuestionOptionResource` omits it, and a
  test asserts the key is absent from the payload. A client that merely doesn't *render* a field
  still ships it in the network tab.
- **Grading happens here, never on the client.** Compare answers server-side, in
  `CoursePaperAttemptService`.
- Attempts snapshot `pass_mark_snapshot`, `total_questions`, and the question/option text at submit
  time. An admin editing a paper afterwards must not change a stored result or make a past attempt
  unreadable.

## 4. The sign-in endpoints return the same thing on every failure

`POST /api/v1/student/auth/request-code` returns a **byte-identical 200** whether the email belongs to
no student, a blocked student, or a soft-deleted one — and sends nothing in those cases. Student IDs
are sequential and guessable; a distinguishable response makes this an account-enumeration oracle.

**Do not "improve" these error messages.** If a failure needs explaining, the fix is UI copy on the
client, not a more specific API response. The same applies to wrong-code attempts: never reveal how
many remain.

`verify-code` may return 403 for a blocked student even with a valid code — that covers a block
landing between request and verify, and is deliberate.

## 5. The no-skip rule lives here

`app/Services/Course/CourseProgressService.php` is the enforcement point. Client-side clamping in the
player is UX only (root §7.3, §7.12) and is assumed hostile.

- `max_position_seconds` is **monotonic** and may only advance by `elapsed_wall_clock × 2.0 + 5s`.
  You cannot be at 5:00 of a lesson sixty seconds after last being seen at 0:30.
- "Watched" needs **two** gates: position ≥ 95% of duration **and** accumulated `watched_seconds` ≥ 90%.
  Position alone is beatable by a client that lies slowly.
- The endpoint returns the **server's** numbers and the client re-seeds from them.
- A video with `duration_seconds = null` cannot be gated, which is why `CourseProgrammeService::publish()`
  refuses to publish a programme whose videos lack a file or a duration.

## 6. Queues are a hard dependency of login

`QUEUE_CONNECTION=database`. The student sign-in code is sent by a queued notification, so **if
`php artisan queue:work` is not running, nobody can log in** — and nothing errors: the job just sits
in the `jobs` table. In any environment that serves real traffic this needs a supervised worker and a
monitoring alert, not a line in a README.

Root §3 names Horizon; it is not installed and needs Redis. Until it is, the database driver plus a
supervised `queue:work` is the arrangement.

Never log a sign-in code, a token, or a student's email (root §13.10). `LogSmsGateway`-style debug
output is local/testing only.

## 7. Conventions unchanged from root

Thin controllers → Form Request → one Service → API Resource. Services in `app/Services/{Domain}/`,
requests in `app/Http/Requests/{Domain}/`, enums in `app/Enums/` (string-backed + a PHP enum cast, per
the `checklist_items.phase` precedent — not a DB `enum` column). Migrations are immutable once run.
`./vendor/bin/pint` before finishing. A feature test per endpoint: happy path plus one error.
