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
php artisan migrate --seed  # seeds roles + one dev admin per role + demo students
php artisan serve --port=8001
```

> Port 8001 is used locally instead of 8000 to avoid clashing with other local projects — adjust `APP_URL` in `.env` and the frontend's `VITE_API_BASE_URL` together if you change it.

Seeded dev admin logins (password `Password123!` for all): `admin@planbinternational.test` (Super Admin), `content@planbinternational.test`, `support@planbinternational.test`, `accounts@planbinternational.test`.

Run tests: `php artisan test`

## Web (`web/`)

```bash
cd web
npm install
cp .env.example .env        # points at http://localhost:8001 by default
npm run dev                 # http://localhost:5173
```

Type-check: `npx tsc -b --noEmit` · Build: `npm run build`

## What's built so far

- Admin authentication (Sanctum SPA cookie sessions, roles, lockout).
- Student Management: list/search/filter, create/edit, block/unblock, soft delete, bulk CSV Student-ID import, detail page.
- Admin panel shell (sidebar, mobile drawer, dashboard) showing the full intended navigation, with unbuilt sections marked "Soon".

Everything else in `CLAUDE.md`'s tech stack (courses, payments, checklists, jobs, the mobile-web student area, PWA install flow, i18n) is scaffolded for but not yet implemented — see `docs/CHANGELOG.md`.
