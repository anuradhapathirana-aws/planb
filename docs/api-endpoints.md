# API Reference — Plan B International

All endpoints are versioned under `/api/v1/`. Admin panel endpoints are additionally prefixed `/admin/` and live in `App\Http\Controllers\Admin\*`. Base URL in local dev: `http://localhost:8001/api/v1`.

Auth: Sanctum SPA cookie session. Call `GET {APP_URL}/sanctum/csrf-cookie` once before the first mutating request (sets the `XSRF-TOKEN` cookie; send its value back as the `X-XSRF-TOKEN` header — axios does this automatically with `withXSRFToken: true`).

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

## Conventions

- Every response wraps the payload in `{ data: ... }` (list endpoints add `{ data, meta }` with pagination info).
- Validation errors: HTTP 422, `{ message, errors: { field: [messages] } }` (standard Laravel Form Request shape).
- Authorization failures: HTTP 403 (role doesn't permit the action) — checked via `App\Policies\StudentPolicy`.
- Unauthenticated: HTTP 401.

---

**Last updated:** 24 August 2026 — added the Course Module endpoints (FR-ADM-008/008a/008b/008c): course categories, course programmes (whole-tree save), lesson file uploads, signed video playback, and the per-programme Q&A paper.
