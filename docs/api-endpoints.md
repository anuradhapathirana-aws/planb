# API Reference — Plan B International

All endpoints are versioned under `/api/v1/`. Base URL in local dev: `http://localhost:8001/api/v1`.

## Two areas, two actor types, two auth modes

| Prefix | Actor | Guard | Credential | Controllers | Routes |
|---|---|---|---|---|---|
| `/api/v1/admin/*` | `App\Models\User` (staff) | `sanctum` (provider `users`) | SPA cookie session from `web/` | `App\Http\Controllers\Admin\*` | `routes/api.php` |
| `/api/v1/student/*` | `App\Models\Student` | `student` (provider `students`) | `Authorization: Bearer <token>` from `mobile/` | `App\Http\Controllers\Student\*` | `routes/api_student.php` |

The two are kept strictly apart. Sanctum does **not** do this on its own — see `backend/CLAUDE.md` §1 for the mechanism and `tests/Feature/GuardIsolationTest.php` for the proof. A student's token gets 401 on every admin endpoint and vice versa.

**Admin auth (cookie).** Call `GET {APP_URL}/sanctum/csrf-cookie` once before the first mutating request (sets the `XSRF-TOKEN` cookie; send its value back as the `X-XSRF-TOKEN` header — axios does this automatically with `withXSRFToken: true`).

**Student auth (bearer).** No CSRF cookie, no session. Sign in, store the returned token securely (`expo-secure-store` on mobile — never `AsyncStorage`), and send it as `Authorization: Bearer <token>` on every request. Tokens expire after `STUDENT_TOKEN_TTL_DAYS` (default 30) and are rotated via `POST /student/auth/refresh`.

## Admin Auth

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/admin/login` | guest | `{ email, password }` → `{ data: AdminUser }`. Rate-limited 6/min. Locks account after 5 failed attempts (NFR-008). |
| POST | `/admin/logout` | session | |
| GET | `/admin/me` | session | Current admin user + roles. |
| GET | `/admin/unlock/{user}` | signed URL | From the account-locked email; clears the lock. |

## Student Management

| Method | Path | Auth / role | Notes |
|---|---|---|---|
| GET | `/admin/students` | any admin role | Query: `search, status(all\|active\|blocked\|registered\|pending), visa_status, sort(student_id\|full_name\|created_at\|registered_at), direction(asc\|desc), per_page, page`. Paginated. |
| GET | `/admin/students/stats` | any admin role | `{ total, registered, pending_registration, blocked, new_this_month }`. |
| GET | `/admin/students/next-id` | Super Admin | `{ student_id }` — preview of the ID the next create would get. Not reserved: a concurrent create or CSV import can still take it first. |
| POST | `/admin/students` | Super Admin | Create — all fields optional; `student_id` is generated server-side (`PB-#####`, sequential) and any client-supplied `student_id` is ignored. |
| GET | `/admin/students/{student}` | any admin role | |
| PUT | `/admin/students/{student}` | Super Admin, Support Agent | |
| DELETE | `/admin/students/{student}` | Super Admin | Soft delete. |
| POST | `/admin/students/{student}/block` | Super Admin, Support Agent | |
| POST | `/admin/students/{student}/unblock` | Super Admin, Support Agent | |
| POST | `/admin/students/{student}/photo` | Super Admin, Support Agent | Multipart `photo` (jpeg/png, max 2MB). Re-encoded via Intervention Image (600×600 cover crop) before storage; replaces any existing photo (single-file Media Library collection). |
| DELETE | `/admin/students/{student}/photo` | Super Admin, Support Agent | Removes the profile photo. |
| POST | `/admin/students/import` | Super Admin | Multipart `file` (CSV, max 2MB). Header row: `student_id` (required), `full_name`, `email`, `contact_number` (optional). Returns `{ imported, skipped, failed, errors: [{row, student_id, message}] }`. Existing `student_id`s are skipped, not errored. |

## Industries & Professions (FR-ADM-012)

Master data for the Student form's Industry → Profession cascading select. No hard delete — `activate`/`deactivate` toggle `is_active` instead (inactive entries drop out of the Student form but stay valid for students who already reference them).

| Method | Path | Auth / role | Notes |
|---|---|---|---|
| GET | `/admin/industries` | any admin role | Query: `search, is_active(1\|0), sort(name\|created_at), direction, per_page, page`. Paginated. |
| POST | `/admin/industries` | Super Admin, Content Manager | `{ name }`. |
| GET | `/admin/industries/{industry}` | any admin role | |
| PUT | `/admin/industries/{industry}` | Super Admin, Content Manager | `{ name }`. |
| POST | `/admin/industries/{industry}/activate` | Super Admin, Content Manager | |
| POST | `/admin/industries/{industry}/deactivate` | Super Admin, Content Manager | |
| GET | `/admin/professions` | any admin role | Query: `search, industry_id, is_active(1\|0), sort(name\|created_at), direction, per_page, page`. Paginated. `industry_id` powers the Student form's cascading select (called with `is_active=1&per_page=100`, no pagination UI). |
| POST | `/admin/professions` | Super Admin, Content Manager | `{ industry_id, name }`. `name` unique per industry, not globally. |
| GET | `/admin/professions/{profession}` | any admin role | |
| PUT | `/admin/professions/{profession}` | Super Admin, Content Manager | `{ industry_id, name }`. |
| POST | `/admin/professions/{profession}/activate` | Super Admin, Content Manager | |
| POST | `/admin/professions/{profession}/deactivate` | Super Admin, Content Manager | |

Student Management's `industry_id`/`profession_id` fields (replacing the old free-text `profession_category`) are validated together: `profession_id` must belong to the given `industry_id` when both are present.

## Course Module (FR-ADM-008 / 008a / 008b)

Hierarchy: **Course Category → Course Programme → Topic → Video**. The SRS's 8 phases (Appendix A) are modelled as 8 programmes under one category.

Categories follow the same activate/deactivate-instead-of-delete pattern as industries. Programmes are soft-deleted.

| Method | Path | Auth / role | Notes |
|---|---|---|---|
| GET | `/admin/course-categories` | any admin role | Query: `search, is_active(1\|0), sort(name\|sort_order\|created_at), direction, per_page, page`. Paginated. Each row carries `programmes_count`. |
| POST | `/admin/course-categories` | Super Admin, Content Manager | `{ name, description? }`. `sort_order` is assigned server-side (appended last). |
| GET | `/admin/course-categories/{category}` | any admin role | |
| PUT | `/admin/course-categories/{category}` | Super Admin, Content Manager | `{ name, description? }`. |
| POST | `/admin/course-categories/{category}/activate` | Super Admin, Content Manager | |
| POST | `/admin/course-categories/{category}/deactivate` | Super Admin, Content Manager | No destroy route — a DELETE returns 405. |

### Course programmes

`store`/`update` take the **whole tree in one request** — programme, its topics and each topic's video *metadata*. Video files are not in this payload (see below). Topic and video position in the submitted arrays becomes their `sort_order`, and responses return them in that order, so array index identifies a row.

On `update`, a topic/video carrying an `id` is updated in place, one without an `id` is created, and anything missing from the payload is deleted (a deleted video's uploaded file goes with it). An `id` belonging to a different programme is rejected with a 422 rather than silently duplicated.

| Method | Path | Auth / role | Notes |
|---|---|---|---|
| GET | `/admin/course-programmes` | any admin role | Query: `search, course_category_id, status(draft\|published), sort(name\|sort_order\|created_at), direction, per_page, page`. Rows carry `topics_count` / `videos_count`. |
| POST | `/admin/course-programmes` | Super Admin, Content Manager | `{ course_category_id, name, description?, status?, topics: [{ title, description?, videos: [{ title, duration_seconds? }] }] }`. At least one topic is required (FR-MOB-017). Topic `description` is rich-text HTML, sanitized server-side against a tag/attribute allowlist before storage. |
| GET | `/admin/course-programmes/{programme}` | any admin role | Returns the full tree (`topics[].videos[]`). |
| PUT | `/admin/course-programmes/{programme}` | Super Admin, Content Manager | Same body, plus optional `topics[].id` / `topics[].videos[].id`. |
| DELETE | `/admin/course-programmes/{programme}` | Super Admin | Soft delete; topics, videos and uploaded files are kept. |
| POST | `/admin/course-programmes/{programme}/publish` | Super Admin, Content Manager | |
| POST | `/admin/course-programmes/{programme}/unpublish` | Super Admin, Content Manager | Back to `draft`. |

### Course thumbnail

Course art, uploaded against a saved programme rather than inside the course form's own submit (which stays JSON). Optional — a programme without one returns `thumbnail_url: null`.

| Method | Path | Auth / role | Notes |
|---|---|---|---|
| POST | `/admin/course-programmes/{programme}/thumbnail` | Super Admin, Content Manager | Multipart `thumbnail` (jpeg/png, max 2MB, validated by both `mimetypes` and extension). Re-encoded via Intervention Image (1280×720 cover crop) before storage; replaces any existing image (single-file collection). |
| DELETE | `/admin/course-programmes/{programme}/thumbnail` | Super Admin, Content Manager | Removes the image. |

`thumbnail_url` appears on `CourseProgrammeResource` (admin) and `StudentCourseSummaryResource` (student list + detail), so the mobile course cards can render it. Both list queries eager-load `media` to keep it one query rather than one per row.

### Lesson files

Uploaded one at a time against an already-saved video row — a course can hold hundreds of megabytes of video, which no single form post survives. The admin UI saves the course first, then uploads each staged file against the returned video ids.

Server cap: `config('courses.max_video_upload_mb')` (default 512, `COURSE_MAX_VIDEO_UPLOAD_MB`). **PHP's own `upload_max_filesize`, `post_max_size` and `max_execution_time` must be raised to match** — they reject the request before Laravel sees it.

| Method | Path | Auth / role | Notes |
|---|---|---|---|
| POST | `/admin/course-videos/{video}/file` | Super Admin, Content Manager | Multipart `file` (MP4/MOV, validated by both `mimetypes` and extension) + optional `duration_seconds` (read from the file in the browser). Replaces any existing file. |
| DELETE | `/admin/course-videos/{video}/file` | Super Admin, Content Manager | Removes the file; the video row stays so a replacement can be uploaded. |
| POST | `/admin/course-videos/{video}/thumbnail` | Super Admin, Content Manager | Multipart `thumbnail` (jpeg/png, max 2MB). Re-encoded via Intervention Image (1280×720 cover crop) before storage. |
| DELETE | `/admin/course-videos/{video}/thumbnail` | Super Admin, Content Manager | |
| GET | `/admin/course-videos/{video}/stream` | any admin role | `{ url, expires_at }` — a **signed, ~90-minute** playback link. 404 when the video has no file. Never returns a storage URL. |
| GET | `/course-videos/{video}/playback` | **signed URL only** | Serves the bytes. Outside `/admin` and outside the session guard on purpose: a `<video>` element fetches its source without cookies, so the signature is the authorization. Supports HTTP `Range`, so the player seeks and buffers instead of downloading the whole lesson first. |

`CourseVideoResource` never exposes a file URL — only `has_file`, `file_name`, `file_size_bytes`, `duration_seconds` and `thumbnail_url`.

**Video hosting.** Files live on the private `course_videos` disk (`storage/app/course-videos`) for now. `provider` (`upload` | `external`) and `external_url` already exist on the row, so moving to Bunny Stream later means pointing the stream endpoint at Bunny's token-signed URL — no schema change, and no change to how any player consumes it.

### Q&A paper (FR-ADM-008c)

The **question paper** is a singleton under its programme: at most one, and often none. `show` therefore answers `{ "data": null }` rather than a 404 — "this programme has no paper" is the normal starting state, not an error, and it is what tells the student app to show nothing after the videos.

`update` is an upsert that takes the whole paper in one request — settings, questions and each question's answers — inside a transaction. Questions/answers carrying an `id` are updated in place, ones without are created, and anything missing from the payload is deleted. A question `id` belonging to a different paper is a 422.

Two rules the array validation can't express are enforced in `SaveCoursePaperRequest::after()`: **every question must have exactly one correct answer**, and a `yes_no` question must have exactly two. Without them a paper could be saved that is impossible to score.

| Method | Path | Auth / role | Notes |
|---|---|---|---|
| GET | `/admin/course-programmes/{programme}/paper` | any admin role | Full paper with `questions[].options[]`, or `data: null`. |
| PUT | `/admin/course-programmes/{programme}/paper` | Super Admin, Content Manager | `{ title, instructions?, pass_mark?, max_attempts?, requires_all_videos_watched?, questions: [{ id?, text, type, options: [{ id?, text, is_correct }] }] }`. At least one question; 2–6 answers each. `type` is `yes_no` or `multiple_choice`. `instructions` is rich-text HTML, sanitized server-side. `pass_mark` defaults to 70, `max_attempts` null = unlimited retries. |
| DELETE | `/admin/course-programmes/{programme}/paper` | Super Admin, Content Manager | Removes the paper, its questions and answers. 404 when there is no paper. |

`CourseProgrammeResource` carries a `paper` summary (`title`, `pass_mark`, `questions_count`, no questions) on both the list and detail responses, so the Courses table and Course form can show "N questions" without a second request. It is `null` when the programme has no paper.

**`is_correct` is admin-only.** `CourseQuestionOptionResource` includes it because only admins read this endpoint. The student-facing paper endpoint (not built yet) must use its own resource that omits it.

## Arrival Checklists

Two fixed checklists — `before_arrival` and `after_arrival` (`App\Enums\ChecklistPhase`). `{phase}` resolves by **implicit enum binding**, so any other value is a 404 before the controller runs.

Each phase is **one document, not a paginated resource**: the admin edits the whole list in a tab, reorders it and saves once, so `update` replaces the phase entirely. Items carrying an `id` are updated in place, ones without are created, and anything missing from the payload is deleted — all in one transaction. Position in `items` becomes the stored `sort_order`; there is no order field to send.

**An empty `items` array is valid** and clears the phase — "nothing to do at this stage yet" is a real state, unlike a Q&A paper with no questions.

An item `id` belonging to the *other* phase is a **422**, not a silent move across tabs.

| Method | Path | Auth / role | Notes |
|---|---|---|---|
| GET | `/admin/checklists/{phase}` | any admin role | Full list for the phase, already in `sort_order`. `{ data: [...] }`, empty array when nothing is set up. |
| PUT | `/admin/checklists/{phase}` | Super Admin, Content Manager | `{ items: [{ id?, title, description }] }`. Max 200 items; `title` required, max 255; `description` is rich-text HTML (max 20 000 chars), sanitized server-side and stored as `null` when empty. Responds with the saved list, so the client can re-seed its form with the new ids. |

Writes are gated by `ChecklistItemPolicy::manage` — a class-level ability rather than per-row `create`/`update`/`delete`, since one request does all three.

**Student-facing note.** These endpoints are admin-only. The student app's checklist endpoints (read + tick off) are not built yet and will need their own resource and a progress table — see `docs/schema.md`.

---

# Student API

Everything under `/api/v1/student/`. Consumed by `mobile/` now, and by the web student area later without change.

## Student Auth

Students never register. An admin creates or CSV-imports the record first, and the student **claims** it by proving they control the email address on it. First successful sign-in sets `registered_at`.

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/student/auth/request-code` | guest, throttled | `{ email }` → **always** `200 { data: { expires_in_seconds, resend_after_seconds } }` |
| POST | `/student/auth/verify-code` | guest, throttled | `{ email, code, device_name? }` → `{ data: { token, expires_at, student } }` |
| POST | `/student/auth/google` | guest, throttled | `{ id_token, device_name? }` → same shape |
| POST | `/student/auth/refresh` | bearer | → `{ data: { token, expires_at } }` |
| POST | `/student/auth/logout` | bearer | Revokes the **current** token only; other devices stay signed in. |
| GET | `/student/me` | bearer | `{ data: StudentProfile }` |

**`request-code` returns an identical body in every case** — email sent, no such student, student blocked, student deleted. This is deliberate and must not be "improved": student IDs are sequential and a distinguishable response turns the endpoint into an account-enumeration oracle. The UI copy carries the explanation ("If that email matches our records, we've sent you a code"). Resending is the same endpoint again; there is no separate resend route.

Failure modes:

- **Wrong / expired / consumed / superseded code** → 422 `{ errors: { code: [...] } }`, all with the same message. The number of attempts remaining is never revealed. After 5 wrong guesses the code is burned and even the correct value stops working.
- **Blocked student** → 403 with a real message on `verify-code` / `google`. This is the one explained failure, and it is safe: the caller has already proved the account is theirs. It also covers a block landing between requesting a code and using it.
- **Google account not matching any student** → 422 naming the problem, for the same reason.
- **Google `email_verified: false`** → 422. An unverified address proves nothing.

Notes:

- Codes are 6 digits, valid 10 minutes, stored hashed, one live code per student.
- Google ID tokens are verified locally against Google's JWKS (cached 1h), so sign-in does not depend on a live call to Google. Configure `GOOGLE_CLIENT_IDS` (comma-separated, one OAuth client per platform). **Blank disables Google sign-in** — an empty list rejects every token rather than accepting any.
- Rate limits: `request-code` 3 per 10 min per email + 8/hour per IP; `verify-code` and `google` 6/min per email+IP; plus a hard daily cap per student (`STUDENT_LOGIN_CODE_DAILY_CAP`, default 10).
- **The sign-in email is queued.** If no `queue:work` is running, nobody can sign in and nothing errors — the job just sits in the `jobs` table.
- Blocking or deleting a student revokes all their tokens and voids any live code immediately.

`StudentProfile` is `App\Http\Resources\Student\StudentProfileResource` — deliberately *not* the admin `StudentResource`, which carries `is_blocked` and `imported_by`.

## Student Profile

| Method | Path | Notes |
|---|---|---|
| GET | `/student/profile` | Same payload as `/student/me`. |
| PUT | `/student/profile` | Editable: `contact_number`, `address`, `date_of_birth`, `highest_qualification`, `industry_id`, `profession_id`, `languages_spoken`. |
| POST | `/student/profile/photo` | Multipart `photo` (jpeg/png, ≤2MB). Re-encoded 600×600 before storage. |
| DELETE | `/student/profile/photo` | |

**Not editable, and silently ignored if sent:** `email` (it is the credential — changing it needs a verify-old-then-verify-new flow, so it goes through support for now), `student_id` and `full_name` (admin-owned identity), `visa_status` (admin-verified), `is_blocked`, `registered_at`. `profession_id` must belong to `industry_id`. Minimum age 18, matching the admin form.

## Student Courses

| Method | Path | Notes |
|---|---|---|
| GET | `/student/courses` | Published programmes only, with a progress summary. Query: `search`, `per_page` (max 50), `page`. Paginated. |
| GET | `/student/courses/{course}` | Full tree: `topics[].videos[]`, each with the student's own `progress` and `is_locked`, plus `paper` (or null). |
| GET | `/student/lessons/{lesson}/stream` | `{ url, expires_at, progress }` — a signed link valid 30 minutes. |
| POST | `/student/lessons/{lesson}/progress` | `{ position_seconds, watched_delta_seconds }` → the **server's** clamped view. Throttled 60/min. |

**Note the parameter names `{course}` and `{lesson}`, not `{programme}` and `{video}`.** `Route::bind()` registers a binder *globally* on the router, not per route file — reusing the admin names would apply this published-only filter to `/api/v1/admin/*` too and hide every draft course from the people writing them.

**Authorization is the route binding.** A draft or soft-deleted programme (and any lesson inside one) 404s before the controller runs. "Published" is not a per-student rule, so no policy is involved and the existing `User`-typed policies are untouched.

**`is_locked`** is true until the previous lesson in the programme is watched — ordering runs across topics, so finishing topic 1 opens topic 2's first lesson. The app greys the row out rather than hiding it.

### Progress and the no-skip rule

Client-side clamping in the player is UX only. The server treats both numbers as *claims*:

- `max_position_seconds` is **monotonic** — rewinding never loses ground — and may advance by at most `elapsed_wall_clock × 2 + 5s`. A first flush with no prior `last_seen_at` is capped at the grace window, so claiming the end of the lesson immediately buys ~5 seconds, not the whole thing.
- "Watched" needs **two** gates: position ≥ 95% of duration **and** accumulated `watched_seconds` ≥ 90%. Position alone is beatable by a client that lies slowly; the second gate makes the lie cost as long as watching.
- The response is the server's numbers. **The player must re-seed its clamp from them** rather than from its own state, and must seed `maxReached` from `max_position_seconds` on load — never from 0, or a returning student is locked back to the start.
- A lesson with `duration_seconds = null` can never be completed, which is why `POST /admin/course-programmes/{programme}/publish` now **refuses to publish** a programme with no lessons, or any lesson missing a file or duration (422 on `status`). This is a behaviour change to a previously permissive endpoint.

Playback bytes are still served by the existing `GET /api/v1/course-videos/{video}/playback` (`signed` middleware only). A student link carries their id inside the signature, so the byte route re-checks the block flag at play time and a student blocked after their link was issued stops playing immediately. **Residual risk, stated plainly:** anyone holding that URL can play it for its 30-minute lifetime. That is inherent to handing a URL to a platform video player; the real fix is Bunny Stream token auth.

## Student Assessments

| Method | Path | Notes |
|---|---|---|
| GET | `/student/courses/{course}/paper` | Paper + questions + options, plus attempt state. `{ data: null }` when the course has no paper. |
| POST | `/student/courses/{course}/paper/attempts` | Starts an attempt, or returns the one already in progress. |
| POST | `/student/paper-attempts/{attempt}/submit` | `{ answers: [{ question_id, option_id }] }` → the graded result. |
| GET | `/student/paper-attempts/{attempt}` | Result detail. |

**`is_correct` never appears in a student payload.** `StudentQuestionOptionResource` omits it, and a test asserts the string is absent from the response body entirely. A client that merely doesn't render the field still ships the answer key in the network tab.

**Grading is server-side.** `submit` checks that every question is answered and that each `option_id` belongs to its `question_id` *and* to this paper — that last check is the tamper guard, and it is why the Form Request has no `exists:` rule (which would accept any option id in the database).

Attempt state on the paper summary: `attempts_used`, `attempts_remaining` (null = unlimited), `has_passed`, `can_attempt`, `blocked_reason` — one of `videos_incomplete`, `attempts_exhausted`, `already_passed`, `no_questions`, so the app can explain a disabled button rather than just greying it out.

- `pass_mark_snapshot` and `total_questions` are frozen at attempt start; an admin raising the pass mark afterwards cannot retroactively fail a past cohort. Question and option text are snapshotted at submit, so a later paper edit cannot make an old attempt unreadable.
- Starting again while an attempt is in progress **resumes** it rather than burning a retry.
- Only submitted attempts count against `max_attempts`.
- **The correct answers are revealed only when they can no longer help** — the student passed, or has no attempts left. Revealing them after a failed attempt would make unlimited retries meaningless.

## Conventions

- Every response wraps the payload in `{ data: ... }` (list endpoints add `{ data, meta }` with pagination info).
- Validation errors: HTTP 422, `{ message, errors: { field: [messages] } }` (standard Laravel Form Request shape).
- Authorization failures: HTTP 403 (role doesn't permit the action) — checked via `App\Policies\StudentPolicy`.
- Unauthenticated: HTTP 401.

---

**Last updated:** 25 August 2026 — added the Student API (auth by emailed code or Google) and documented the two-actor / two-guard split.
