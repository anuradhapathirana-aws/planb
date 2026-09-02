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

**Student-facing note.** These endpoints are admin-only. The student's own view of the same checklists — with their ticks — is *Student Checklists* below, on its own resources.

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

### Course search (Home)

`GET /student/courses?search=` matches **the programme name OR any of its topic titles**. Topic titles are searched because that is where the words students actually type live — nobody searches "Course Module 3", they search "visa" or "medical".

- **The OR is wrapped in its own closure** so it cannot escape the `status = published` filter around it. A test asserts a draft course with a matching topic never appears.
- **`matched_topic`** comes back only when the course's own name did *not* match — it is the reason the row is in the results, so the UI can say "Topic: Visa renewal" instead of looking like it returned the wrong course. One extra query per page, not per row.
- **A course matching on both its name and several topics is returned once**, not once per hit.
- **`%` and `_` in the search term are escaped** (`addcslashes`). A student typing `100%` matches courses containing "100%", not every course in the catalogue.
- **`like %term%`, not a FULLTEXT index.** The catalogue is dozens of rows, and FULLTEXT would not match a partial word — "vis" finding "visa" is exactly what type-ahead needs.
- **`is_new`** is `published_at` within `CourseProgramme::NEW_FOR_DAYS` (30). A rolling window rather than a calendar month: on the 1st, a calendar month shows an empty tab even though something shipped yesterday.

The app's Home dropdown filters these results into three tabs client-side — **Available** (not enrolled, any age), **Enrolled**, **Unfinished** (enrolled, not completed). `unfinished` is a subset of `enrolled`, not a sibling; they are filters over one result set. Switching tabs never costs a round trip, and an empty search box reuses the `GET /student/courses` response Home has already fetched.

### Progress and the no-skip rule

Client-side clamping in the player is UX only. The server treats both numbers as *claims*:

- `max_position_seconds` is **monotonic** — rewinding never loses ground — and may advance by at most `elapsed_wall_clock × 2 + 5s`. A first flush with no prior `last_seen_at` is capped at the grace window, so claiming the end of the lesson immediately buys ~5 seconds, not the whole thing.
- "Watched" needs **two** gates: position ≥ 95% of duration **and** accumulated `watched_seconds` ≥ 90%. Position alone is beatable by a client that lies slowly; the second gate makes the lie cost as long as watching.
- The response is the server's numbers. **The player must re-seed its clamp from them** rather than from its own state, and must seed `maxReached` from `max_position_seconds` on load — never from 0, or a returning student is locked back to the start.
- A lesson with `duration_seconds = null` can never be completed, which is why `POST /admin/course-programmes/{programme}/publish` now **refuses to publish** a programme with no lessons, or any lesson missing a file or duration (422 on `status`). This is a behaviour change to a previously permissive endpoint.

Playback bytes are still served by the existing `GET /api/v1/course-videos/{video}/playback` (`signed` middleware only). A student link carries their id inside the signature, so the byte route re-checks the block flag at play time and a student blocked after their link was issued stops playing immediately. **Residual risk, stated plainly:** anyone holding that URL can play it for its 30-minute lifetime. That is inherent to handing a URL to a platform video player; the real fix is Bunny Stream token auth.

## Student Home

| Method | Path | Notes |
|---|---|---|
| GET | `/student/home-banner` | The banner, or **`{ "data": null }`** — a normal answer, not an error. |

- **`data` is null in three cases the app treats identically**: nothing set up, switched off, or active with no image. The app renders its own branded fallback hero for all three, so the top of Home is never an empty box.
- **The link arrives resolved.** `StudentHomeBannerResource` returns one `link` object — `{ type }`, `{ type: 'course', course_id }` or `{ type: 'url', url }` — rather than the three columns the admin resource exposes. The client switches on a discriminated union instead of re-implementing "which column applies".
- **A course link whose course has been deleted degrades to `{ type: 'none' }`** rather than sending the student to a 404.
- **There is no `/student/home` aggregate endpoint, deliberately.** Home's checklist and course progress tiles are computed from the *same* cached `GET /student/checklists` and `GET /student/courses` responses their tabs use, so opening Home warms both. A combined endpoint would be one round trip instead of three, and would buy a screen whose numbers could disagree with the screens they link to.

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

## Home Banner

The promo across the top of the student app's Home screen. A **singleton**, so there is no index and no id in any path — the same shape as the checklist phases, which are also edited as one document rather than browsed as a collection.

| Method | Path | Auth / role | Notes |
|---|---|---|---|
| GET | `/admin/home-banner` | any admin role | The row, **created empty on first read** so the form always has a shape to bind to. |
| PUT | `/admin/home-banner` | Super Admin, Content Manager | `{ title, subtitle, link_type, link_course_programme_id, link_url, is_active }`. |
| POST | `/admin/home-banner/image` | Super Admin, Content Manager | `multipart/form-data`, field `image`. JPG/PNG, re-encoded to 1200×600 JPEG. |
| DELETE | `/admin/home-banner/image` | Super Admin, Content Manager | Clears the image; wording and settings survive. |

- **The image is uploaded on its own request**, not with the wording — a multi-MB file riding along with every typo fix would make saving slow, and a failed upload would take the text with it.
- **A `course` link must name a published course.** A draft is a 422, because a student tapping through would land on a 404: the student route binds courses through a published-only scope.
- **A `url` link is validated `url:http,https`.** A `javascript:` or `intent:` address has no business in a promo banner.
- **Switching `link_type` clears the branch that no longer applies**, so a stale course id cannot come back to life the next time someone switches back.
- `is_live` on the response is `is_active && image_url !== null` — it is what lets the admin screen warn "switched on, but students see nothing".

Writes are gated by `HomeBannerPolicy::manage`, a class-level ability (there is no per-row anything on a singleton).

## Student Checklists (FR-MOB-030)

The student's side of the two arrival checklists. Its own resources, never the admin ones (root `CLAUDE.md` §16.5): `StudentChecklistItemResource` adds the student's own tick and drops the authoring timestamps.

**No entitlement check, deliberately.** The checklists are Plan B's migration guidance, not purchased content, so every signed-in student sees both phases. What *is* scoped per student is the ticks — every read and write goes through the authenticated `Student`, never an id from the request.

| Method | Path | Notes |
|---|---|---|
| GET | `/student/checklists` | **Both phases in one response**, in enum order, items already in `sort_order`. Each phase carries `progress: { completed, total, percent_complete }`. |
| PUT | `/student/checklist-items/{checklistItem}` | `{ is_completed: bool }` → `{ item, progress }`, where `progress` also carries `phase`. Throttled 120/min. |

- **Both phases come down together** because the app renders them as two tabs over a few dozen short rows. A request per tab would buy a spinner on every switch and save nothing on a connection where the round trip is the expensive part.
- **The tick sends the state the student wants, not "flip it".** A retry after a dropped response then lands on the same answer instead of undoing the tick. The service upserts, and the unique index turns a genuine double tap into a caught duplicate rather than two rows.
- **Progress is recomputed server-side on every write** and returned with the item. The app's ring re-seeds from it rather than adjusting a local counter — the same reasoning as the player's progress flush.
- **An empty phase is `percent_complete: 0`, never 100 and never a 404.** "Plan B hasn't published this list yet" is a real state.
- `description` is the admin's sanitized rich-text HTML — the steps for that item. The mobile app parses the sanitizer's allowlist into native views (`mobile/src/lib/parseHtml.ts`); any web client rendering it still needs DOMPurify (root `CLAUDE.md` §7.6).

## Premium Services

Paid one-off help a student buys on its own — CV writing, visa consultation. The second thing implementing `App\Contracts\Purchasable`, so it reuses the order, payment, webhook and receipt layer **unchanged**; only fulfilment is new. A course grants an `Enrolment` (access that simply exists); a service creates a `ServicePurchase` (a job somebody has to work through).

A service always costs money — `price_cents` must be **above zero**. There is no free branch and no admin grant.

### Admin

| Method | Path | Auth / role | Notes |
|---|---|---|---|
| GET | `/admin/services` | any admin role | Query: `search, status(draft\|published), sort(name\|sort_order\|price_cents\|created_at), direction, per_page, page`. Carries `purchases_count` and `open_purchases_count`. |
| POST | `/admin/services` | Super Admin, Content Manager | `{ name, summary?, description?, price_cents, currency?, delivery_time?, status? }`. `description` is rich-text HTML, sanitized server-side on write. Name must be unique among non-deleted services. |
| GET | `/admin/services/{service}` | any admin role | |
| PUT | `/admin/services/{service}` | Super Admin, Content Manager | |
| DELETE | `/admin/services/{service}` | **Super Admin** | Soft delete. Purchases already paid for stay in the queue and must still be delivered. |
| POST | `/admin/services/{service}/thumbnail` | Super Admin, Content Manager | Multipart `thumbnail` (jpeg/png, max 2MB). Re-encoded via Intervention Image (1280×720 cover crop) before storage, per CLAUDE.md §7.4. |
| DELETE | `/admin/services/{service}/thumbnail` | Super Admin, Content Manager | |
| POST | `/admin/services/{service}/publish` | Super Admin, Content Manager | Only a published service can be bought. |
| POST | `/admin/services/{service}/unpublish` | Super Admin, Content Manager | |

### Admin — the delivery queue

| Method | Path | Auth / role | Notes |
|---|---|---|---|
| GET | `/admin/service-purchases` | any admin role | Query: `search, status, service_id, student_id, sort(purchased_at\|created_at\|status), direction, per_page, page`. |
| GET | `/admin/service-purchases/stats` | any admin role | `{ pending, in_progress, completed }`. |
| GET | `/admin/service-purchases/{purchase}` | any admin role | Carries `admin_note` and `handled_by` — internal, and the reason the student side has its own Resource. |
| POST | `/admin/service-purchases/{purchase}/status` | **Super Admin, Support Agent** | `{ status, note? }`. Legal moves: `pending → in_progress\|completed\|cancelled`, `in_progress → completed\|cancelled`. `completed` and `cancelled` are terminal — a closed request cannot be reopened, so its timestamps stay a truthful history. An illegal move is a 422. Each response carries `allowed_transitions` so the UI never offers one. |

Support Agent, not Content Manager, works the queue: authoring a service is content work, delivering one is operations.

### Student

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/student/services` | student | Published services only. Query: `search, per_page` (max 50). Each row carries `has_open_purchase` / `open_purchase_status` — **presentation**, so the app can show "In progress" instead of a Buy button that would 422. |
| GET | `/student/services/{service}` | student | Adds the long `description` and `latest_purchase` — **this student's own** most recent purchase, or null, so the app's delivery tracker needs no second request. A draft or deleted service **404s**: the published scope is the authorization, not a UI filter. |
| POST | `/student/services/{service}/purchase` | student | Opens (or reuses) an order and returns `{ status: "payment_required", order }`. The order is then paid through the ordinary `/student/orders/{order}/card` or `/bank-transfer` endpoints. **Refused with 422 while an earlier purchase of the same service is still `pending` or `in_progress`** — a student may buy a service again, but only once the last one is finished. Rate-limited 20/min. |
| GET | `/student/service-purchases` | student | "My services". Scoped to the caller; never carries `admin_note` or `handled_by`. The service is loaded `withTrashed()` — one the admin has since withdrawn still appears, because it was paid for and the work is still owed — and `service.is_available` says whether the catalogue entry can still be opened, so a client never links into a 404. |

Paying settles through the same webhook as a course. `settleOrder` resolves the product `withTrashed()`, so a service withdrawn between checkout and callback is still fulfilled — the student paid for it.

`GET /student/orders/{order}` reports `item: { type: "service", id }` for a service order, alongside `"course"` for a course.

## Payments & enrolment (FR-MOB-031-037, FR-ADM-018-021)

**Two rules govern this whole area and neither may be relaxed:**

1. **The client never decides an order is paid.** A card order is settled only by a signature-verified server-to-server webhook. The browser redirect the student returns through is cosmetic — they can close it, lose signal, or forge it.
2. **The price is read from the product on the server**, never from the request body. A client-supplied amount is the oldest way to buy a course for one rupee.

Card details never reach this application: every gateway driver hands the student to the provider's own hosted checkout, which is what keeps the platform at PCI-DSS **SAQ-A** (FR-MOB-032). The mobile app opens that checkout in a Custom Tab / `SFSafariViewController`, never an in-app WebView — the card form must be the gateway's own page, on its own origin, with the address bar visible.

### Student

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/student/courses/{course}/enrol` | student | The single entry point. A **free** course (`price_cents = 0`) enrols immediately and returns `{ status: "enrolled", order: null }`. A **paid** one opens (or reuses) an order and returns `{ status: "payment_required", order }`. Already enrolled returns `status: "enrolled"` rather than charging again. Rate-limited 20/min. |
| GET | `/student/orders` | student | Transaction history (FR-MOB-036). Paginated, scoped to the caller. |
| GET | `/student/orders/{order}` | student | Another student's order 404s. Carries `item: { type, id }` — a public token for what was bought (`"course"` today), so the app can open it after payment without ever seeing the backing model's class name. |
| POST | `/student/orders/{order}/card` | student | Returns `{ payment_id, order, checkout: { gateway, checkout_url, fields, completed_immediately, redirect_url } }`. **`redirect_url` is the only field a client should act on** — always a plain URL to open, including for gateways whose real checkout is a signed form POST (those are bridged, below). `checkout_url` + `fields` remain for a web client that can post a form itself. **The order stays `pending`** — only the webhook settles it. Refused while a bank transfer for the same order is awaiting verification, so a student cannot pay twice. |
| POST | `/student/orders/{order}/bank-transfer` | student | Multipart `reference_number` + `receipt` (JPG/PNG/PDF, max 5MB). Moves the order to `awaiting_verification`, **not** `paid`. Only one submission may sit in the queue at a time. |
| GET | `/student/payment-methods/bank-transfer` | student | Account details to pay into, and the receipt size cap. Not secret. |

### Gateway callbacks

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/payments/webhook/{gateway}` | **signature only** | Unauthenticated by necessity — the caller is the gateway's server, holding no session or token. The signature inside the payload is the authentication (`PaymentGateway::verifyWebhookSignature`, CLAUDE.md §7.9). Always answers 200 once the signature checks out, **including for duplicates**: a non-2xx makes the gateway retry forever. Rate-limited 60/min. |
| GET | `/payments/checkout/{payment}` | **signed URL** | The bridge to a form-POST gateway. Returns an HTML page that submits the gateway's signed field set for the student. Unauthenticated by necessity — an in-app browser tab carries no bearer token, so the signature on the URL is the authorization, exactly as for video playback. It **writes nothing and cannot settle a payment**; a settled or non-card payment gets 410 / 404 rather than a fresh checkout. `noindex` + `no-referrer`, so the signed URL is never handed on to the gateway's logs. Valid 30 minutes, rate-limited 30/min. |
| GET | `/payments/sandbox/{payment}/confirm` | signed URL | Local stand-in for a hosted checkout page; 404s in production. Posts a success back through the very same webhook path, so idempotency and settlement are genuinely exercised in development. |

Outcomes reported by the webhook: `settled`, `duplicate`, `amount_mismatch`, `unknown_payment`, or the payment status for a non-success. An amount or currency that does not match the order is **refused and the payment failed** — that is either a tampered callback or a misconfigured merchant account, and silently enrolling the student would hide both.

### Admin

| Method | Path | Auth / role | Notes |
|---|---|---|---|
| GET | `/admin/orders` | Super Admin, Accountant, Support Agent | Query: `search, status, method, student_id, sort(created_at\|amount_cents\|order_number), direction, per_page, page`. |
| GET | `/admin/orders/stats` | as above | `{ pending_bank_transfers, paid_orders, revenue_cents_this_month, currency }` — drives the verification-queue badge (FR-ADM-025). |
| GET | `/admin/orders/{order}` | as above | Full order with every payment attempt and receipt URL. |
| POST | `/admin/payments/{payment}/approve` | **Super Admin, Accountant** | Optional `remark`. Marks the order paid and grants the enrolment. Idempotent against a card that already settled the same order. |
| POST | `/admin/payments/{payment}/reject` | **Super Admin, Accountant** | Optional `remark`, shown to the student. Returns the order to `pending` — *not* cancelled — so a new receipt can be submitted (FR-MOB-035). |

Support Agent can read the queue but not decide on it: approving releases access and books revenue, so it is held to the two roles accountable for money (`OrderPolicy::review`).

### Course access

Adding a price changes what the existing student course endpoints do:

- `GET /student/courses` and `/student/courses/{course}` stay **browsable to everyone** — students cannot buy what they cannot see — and now carry `price_cents`, `currency`, `is_free` and `is_enrolled`.
- Every lesson reports `is_locked: true` for a course the student has not enrolled in, whatever their watch order.
- `GET /student/lessons/{lesson}/stream`, `POST /student/lessons/{lesson}/progress`, `GET /student/courses/{course}/paper` and `POST .../paper/attempts` return **403** without an enrolment. This is the actual paywall; the lock flags above are presentation.

## Conventions

- Every response wraps the payload in `{ data: ... }` (list endpoints add `{ data, meta }` with pagination info).
- Validation errors: HTTP 422, `{ message, errors: { field: [messages] } }` (standard Laravel Form Request shape).
- Authorization failures: HTTP 403 (role doesn't permit the action) — checked via `App\Policies\StudentPolicy`.
- Unauthenticated: HTTP 401.

---

**Last updated:** 25 August 2026 — added the Student API (auth by emailed code or Google) and documented the two-actor / two-guard split.
