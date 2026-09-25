# Plan B International — Setup & Quickstart

Web-based learning + career-services platform for Plan B International. See `CLAUDE.md` for full conventions and `PROJECT_STRUCTURE.md` for the folder layout.

## Prerequisites

- PHP 8.2+, Composer
- Node 20+, npm
- MySQL 8

## Backend (`backend/`)

```bash
cd backend
composer install
cp .env.example .env        # then set DB_* to your local MySQL
php artisan key:generate
php artisan migrate --seed  # seeds roles + one dev admin per role + demo students (local only)
php artisan serve --port=8001
```

> Port 8001 is used locally instead of 8000 to avoid clashing with other local projects — adjust `APP_URL` in `.env` and the frontend's `VITE_API_BASE_URL` together if you change it.

**Local only** — seeded dev admin logins (password `Password123!` for all): `admin@planbinternational.test` (Super Admin), `content@planbinternational.test`, `support@planbinternational.test`, `accounts@planbinternational.test`. These exist only on a developer machine: the seeders refuse to run unless `APP_ENV` is `local` or `testing`.

**On a server** (staging, production) there are no seeded logins. Seed roles, then create each real admin — the password is typed at the prompt (12+ characters, not found in a known data breach):

```bash
php artisan db:seed --class=RoleSeeder --force
php artisan admin:create
```

See `docs/deployment.md` for the full server setup.

Run tests: `php artisan test`

## Web — admin panel (`web/`)

```bash
cd web
npm install
cp .env.example .env        # points at http://localhost:8001 by default
npm run dev                 # http://localhost:5183
```

Type-check: `npx tsc -b` · Build: `npm run build` · Lint: `npm run lint`

## Site — public website + student portal (`site/`)

```bash
cd site
npm install
cp .env.example .env        # points at http://localhost:8001 by default
npm run dev                 # http://localhost:5184
```

Type-check: `npx tsc -b` · Build: `npm run build` · Lint: `npm run lint`

Read `site/CLAUDE.md` and `docs/WEBSITE_AND_PORTAL_GUIDE.md` before working in here.

## Mobile — student app (`mobile/`)

```bash
cd mobile
npm install
npx expo start              # press a for Android, i for iOS
```

Use `npx expo install <pkg>`, never `npm install` — it pins the SDK-compatible version. See `mobile/CLAUDE.md`.

## Running the whole stack

Three terminals. The API must be first; the two web apps are independent of each other.

| # | Folder | Command | URL |
|---|---|---|---|
| 1 | `backend/` | `php artisan serve --port=8001` | http://localhost:8001 |
| 2 | `site/` | `npm run dev` | http://localhost:5184 |
| 3 | `web/` | `npm run dev` | http://localhost:5183 |

Both ports are `strictPort` — if one is taken the dev server fails rather than silently moving, because
`SANCTUM_STATEFUL_DOMAINS` in `backend/.env` lists these exact hosts and auth breaks on any other port.

### Two local gotchas that look like bugs

- **Sign-in emails are not sent.** `MAIL_MAILER=log` locally, so a student's sign-in code is written to
  `backend/storage/logs/laravel.log` instead. Tail that file and read the code from it.
- **If `QUEUE_CONNECTION` is `database`, nothing sends until a worker runs.** The sign-in code is a
  queued notification, so with no `php artisan queue:work` running the job just sits in the `jobs`
  table and nobody can log in — with no error anywhere. Local `.env` currently uses `sync`, which
  sends inline and needs no worker. See `backend/CLAUDE.md` §6.

## What's built so far

The admin panel, the student mobile app and the API behind both are substantially built — students,
courses and bundles, video lessons, assessments, checklists, premium services, orders and payments,
Sinhala translation. **`docs/CHANGELOG.md` is the accurate record**; this list used to drift, so it no
longer tries to duplicate it.

In progress: `site/` — the public website and the browser student portal. See
`docs/WEBSITE_AND_PORTAL_GUIDE.md`.
