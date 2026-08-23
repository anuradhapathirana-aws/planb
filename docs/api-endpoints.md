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

## Conventions

- Every response wraps the payload in `{ data: ... }` (list endpoints add `{ data, meta }` with pagination info).
- Validation errors: HTTP 422, `{ message, errors: { field: [messages] } }` (standard Laravel Form Request shape).
- Authorization failures: HTTP 403 (role doesn't permit the action) — checked via `App\Policies\StudentPolicy`.
- Unauthenticated: HTTP 401.

---

**Last updated:** 14 August 2026 — added Industries & Professions master data endpoints (FR-ADM-012); Student Management's `profession_category` replaced by `industry_id`/`profession_id`.
