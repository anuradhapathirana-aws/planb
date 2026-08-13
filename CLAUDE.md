# Plan B International — Project Instructions for Claude Code

> This file is read by Claude Code at the start of every session. Keep it up to date.

## 1. Project Context

**What we're building:** A web-based learning + career-services platform for Plan B International — a Sri Lankan company that prepares students for education and employment migration to the UAE.

**Client:** Plan B International (contact: Anuradha).

**Platform decision:** Web app only (PWA — Progressive Web App). No native mobile app in Phase 1. A native mobile app may follow in Phase 2 once the web platform proves out.

**Reference documents (in `docs/`):**

- `SRS_PlanB_International_v1.2.docx` — full functional spec (web-adapted); always defer to this
- `Budget_Proposal_PlanB_v1.1.docx` — scope, timeline, cost
- `schema.md` — database schema
- `api-endpoints.md` — API reference
- `deployment.md` — server setup

**When in doubt about what to build, check the SRS. Never invent scope.**

## 2. Repository Layout

```
planb/
├── backend/         Laravel 11 API
├── web/             React 18 + TypeScript + Vite (all UIs: student + admin + marketing)
├── docs/            Specs, schema, deployment
└── CLAUDE.md        This file
```

Each folder has its own `package.json` / `composer.json`. Do not create shared root-level dependencies.

## 3. Tech Stack (Do Not Change Without Asking)

**Backend:** Laravel 11, PHP 8.2+, MySQL 8, Redis, Sanctum (cookie-based SPA auth), Horizon (queues), Spatie Permission, Spatie Media Library.

**Web (`web/`):** React 18, TypeScript, Vite, `vite-plugin-pwa` (PWA), shadcn/ui, Tailwind CSS, TanStack Query (server state), TanStack Table (data grids), React Hook Form + Zod (forms), Zustand (client state), React Router v6, Axios, Lucide React (icons), Recharts (charts), Sonner (toasts), Framer Motion (animations), react-i18next (Sinhala/English).

**Video player:** `video.js` or `plyr` with custom no-skip logic (see Section 4).

**Infrastructure:** Contabo Cloud VPS 20 (Mumbai), Bunny Stream (video hosting with signed URLs), Firebase Cloud Messaging (Web Push, where supported), SendGrid (email), PayHere (payment gateway), Backblaze B2 (backups).

## 4. Architecture Rules

### Backend

1. **Controllers are thin.** They validate input (via Form Requests), call one Service or Action, return an API Resource. No business logic in controllers.
2. **All business logic lives in `app/Services/{Domain}/`** organized by domain. Example: `app/Services/Course/CourseProgressService.php`.
3. **API is versioned.** All endpoints under `/api/v1/`. Never break v1; add v2 for breaking changes.
4. **Every API response goes through an API Resource** (`app/Http/Resources/`). Never return raw Eloquent models.
5. **Validation is via Form Requests** in `app/Http/Requests/{Domain}/`. Controllers never call `$request->validate()` inline.
6. **Enums instead of magic strings.** All statuses, roles, methods — PHP 8.2 enums in `app/Enums/`.
7. **Long-running or external calls are queued jobs.** Never send email, push, or third-party API calls synchronously.
8. **Migrations are immutable in production.** Never edit an already-run migration — write a new one.
9. **All queries scoped by authenticated user where relevant.** Use Policies + `authorize()` in every non-public endpoint.
10. **Files uploaded by users go through Spatie Media Library**, stored on Bunny Storage (production) or local disk (dev).
11. **Money is stored in the smallest unit (cents/paisa) as an integer.** Never float for currency.
12. **Auth is cookie-based via Sanctum SPA authentication.** No manual JWT handling.

### Web (Single App, Multiple Roles)

1. **Feature-based organization** in `src/features/{role}/{feature}/`. Roles: `marketing`, `auth`, `student`, `admin`.
2. **Three layout components** — `PublicLayout`, `StudentLayout`, `AdminLayout`. Route guards wrap each area.
3. **Shared UI in `src/components/ui/`** — shadcn/ui primitives. Never edit shadcn components directly unless customizing globally.
4. **Server state via TanStack Query.** No manual `useEffect + fetch`. Every API call goes through a typed function in `src/api/` called via `useQuery` or `useMutation`.
5. **Client state via Zustand** for anything that persists across pages. Prefer local component state otherwise.
6. **Forms use React Hook Form + Zod.** One schema, one form. Never uncontrolled inputs.
7. **Types match backend API Resources exactly.** When a Resource changes, update the corresponding TypeScript type in `src/types/`.
8. **Auth via httpOnly cookies (Sanctum).** No tokens in `localStorage`. React app calls `/sanctum/csrf-cookie` first, then cookies flow automatically.
9. **All API errors surface as toasts via Sonner.** Never leave a failed mutation silent.
10. **Loading states are explicit.** Every data-fetching component shows a skeleton or spinner.
11. **Route guards enforce role separation.** Student cannot access `/admin/*`; admin cannot access `/app/*` as a student (unless dual-role). Use a `RequireRole` component wrapper.

### PWA Requirements

1. **Configured via `vite-plugin-pwa`** with a Workbox service worker.
2. **Installable** — proper `manifest.json` with icons (192, 512, maskable), theme color, background color, standalone display mode.
3. **Offline-first for read paths** — course content, checklist items, profile cached with `NetworkFirst`. Writes require online.
4. **Push notifications via Firebase Cloud Messaging Web SDK.** Request permission on first meaningful interaction, never on page load.
5. **Install prompt** — show a subtle "Install app to home screen" banner after onboarding completes, not on first visit.

### Mobile-First Responsive Design

Students will access primarily from phones. **Design mobile-first, enhance for desktop.**

1. **Breakpoints:** Tailwind defaults — `sm: 640`, `md: 768`, `lg: 1024`, `xl: 1280`.
2. **Student layout:**
   - Mobile: bottom tab bar (5 tabs max)
   - Tablet/desktop: top navigation with the same tabs
3. **Admin layout:**
   - Mobile: collapsed sidebar as drawer (hamburger menu)
   - Desktop: expanded sidebar
4. **Tap targets ≥ 44×44 px** on mobile.
5. **Video player** goes fullscreen on mobile.
6. **Modals become bottom sheets on mobile**, centered dialogs on desktop.

### No-Skip Video Player

1. **Player:** `video.js` with custom controls, or `plyr` (simpler).
2. **Disable seek bar seeking forward.** Only allow rewind. Hide fast-forward button.
3. **Track `currentTime` on `timeupdate`.** Store max reached position; clamp forward seeks back.
4. **Mark video "Watched" when `currentTime >= duration * 0.95`.**
5. **Video URLs are signed URLs from Bunny Stream** — never expose raw URLs. Fetch fresh from `/api/v1/videos/{id}/stream` returning a short-lived signed URL.
6. **Assessment button disabled** until all videos in the topic are Watched.

## 5. Coding Style

### PHP (backend)

- Follow **PSR-12**.
- Type-hint everything (parameters, return types, properties).
- Use **strict comparisons** (`===`, `!==`).
- Prefer **readonly properties** and constructor property promotion.
- Method names: `camelCase`. Class names: `PascalCase`.
- One class per file.

### TypeScript (web)

- **Strict mode always on** (`"strict": true`).
- **No `any`** unless annotated with `// eslint-disable-next-line` and a comment explaining why.
- Component names: `PascalCase`. Files: `PascalCase.tsx` components, `camelCase.ts` utilities.
- Prefer **named exports** except for route/page components.
- Import order: external → internal aliases (`@/`) → relative → styles.

### General

- **Line length: 100 chars soft, 120 hard.**
- Comments explain **why**, not **what**.
- Delete dead code immediately. No commented-out code in commits.

## 6. Naming Conventions

### Database

- Tables: `snake_case`, plural (`students`, `checklist_items`).
- Primary keys: `id` (bigIncrements).
- Foreign keys: `{singular_table}_id`.
- Timestamps: `created_at`, `updated_at`, `deleted_at`.
- Boolean columns: `is_*` or `has_*`.
- Money columns: `*_cents` (integer).

### API Routes

- RESTful: `GET /api/v1/students`, `POST /api/v1/students`, `PUT /api/v1/students/{id}`.
- Nested resources max 2 levels: `/api/v1/phases/{phase}/topics`.
- Actions on resources: `POST /api/v1/orders/{order}/mark-delivered`.

### Frontend

- Pages: `StudentsListPage.tsx`, `CourseDetailPage.tsx`.
- Components: `StudentCard.tsx`, `PaymentStatusBadge.tsx`.
- Hooks: `useStudents.ts`, `useCourseProgress.ts`.
- API modules: `students.api.ts`.

## 7. Security Rules (Non-Negotiable)

1. **Never commit secrets.** `.env` in `.gitignore`. Use `.env.example` with placeholders.
2. **Never log passwords, tokens, or payment details.** Sanitize logs.
3. **Always validate and authorize on the backend.** Frontend validation is UX only.
4. **File uploads:** validate MIME + extension + size on backend. Re-encode images with Intervention Image.
5. **SQL injection:** always Eloquent or parameterized queries. Never concatenate SQL.
6. **XSS:** React escapes by default. Never `dangerouslySetInnerHTML` unless sanitized with DOMPurify.
7. **CSRF:** Sanctum handles this. Do not disable.
8. **Rate limit sensitive endpoints:** OTP, login, password reset. Use Laravel `throttle` middleware.
9. **Payment webhook signatures verified.** Never trust incoming webhook body without signature verification.
10. **Bank transfer receipts require admin approval before order status changes.** No auto-approval.
11. **Video URLs are signed and short-lived** (max 2 hours). Prevents sharing/downloading.
12. **Route guards on the frontend do NOT replace backend authorization.** Backend enforces; frontend just hides UI.

## 8. UI/UX Standards

### Design System

- **Primary color:** Plan B brand (TBD — placeholder `#1F4E79` deep blue).
- **Font:** Inter (English UI) + Noto Sans Sinhala (Sinhala UI).
- **Spacing:** Tailwind default (4px base).
- **Border radius:** `rounded-lg` (8px) cards, `rounded-md` (6px) buttons, `rounded-2xl` (16px) modals.
- **Shadows:** subtle only. `shadow-sm` cards, `shadow-md` modals, no shadow on flat surfaces.
- **Colors:** one accent + `slate-*` grays. Never more than 3 semantic colors (success/warning/danger).
- **Optimized Screen** Always try to set all component scalable withing the screen, Then user reduce to scroll

### Student UX (Mobile-First)

- **Bottom tab bar** on mobile with 5 tabs max: Home / Courses / Checklists / Jobs / Profile.
- **Top nav** on desktop with same 5 items.
- **Course viewer** is the hero — big video player, clear progress, prominent assessment CTA.
- **Empty states** everywhere data can be empty (icon + message + CTA).
- **Skeleton loaders**, not spinners, for lists.
- **Optimistic UI** for checklist ticks and quiz answers — feels instant.
- **Fullscreen video** on tap; native controls hidden, custom controls only.

### Admin UX (Desktop-First)

- **Sidebar layout** with grouped nav (Students, Content, Orders, Payments, Accounts, Reports, Settings).
- **Data tables** with search, filter, sort, pagination. Sticky header. Row actions in dropdown menu.
- **Detail panels slide from right** rather than full-page navigation for quick edits.
- **Bulk actions** where relevant (bulk approve bank transfers, bulk send notifications).
- **Confirm dialogs** on destructive actions.
- **Toasts** on every mutation.

### Interaction

- Every button click gives feedback within 100ms.
- Every form submission shows success/error toast.
- Every long action shows progress.
- Never block UI on a network call — optimistic updates where safe.

### Accessibility

- All interactive elements keyboard-accessible.
- Color contrast WCAG AA (4.5:1 for text).
- All images have alt text.
- All form inputs have labels.
- Screen reader tested for critical flows.

### Internationalization

- All user-facing text through `t('key')` (react-i18next).
- Two locales: English (default) + Sinhala.
- Sinhala translations supplied by client.
- Numbers and dates formatted per locale.

## 9. Testing Expectations

- **Backend:** Feature tests for every API endpoint (happy path + one error). Unit tests for Services with complex logic (quiz grading, progress calculation).
- **Frontend:** Component tests for shared UI. E2E for critical flows (login, purchase, take quiz) — can defer to beta.
- **Run tests before every commit.**

## 10. Git Conventions

- Branch names: `feature/short-description`, `fix/short-description`, `chore/description`.
- Commit messages: **Conventional Commits** — `feat(course): add quiz retry logic`, `fix(payment): handle rejected bank transfer`.
- Never commit directly to `main`. Always PR.
- PRs need a description explaining what and why, plus screenshots for UI changes.

## 11. Common Commands

### Backend

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed

php artisan serve                    # API on :8000
php artisan horizon                  # Queue workers
php artisan tinker

php artisan test
./vendor/bin/pint                    # Format
./vendor/bin/phpstan analyse
```

### Web

```bash
npm install
npm run dev                          # Vite dev on :5173
npm run build
npm run preview                      # Preview production build
npm run lint
npm run type-check
npx shadcn-ui@latest add button      # Add a shadcn component
```

## 12. Things Claude Code Must ALWAYS Do

1. **Read the relevant SRS section before writing code for a new feature.**
2. **Check `schema.md` before touching database models or migrations.**
3. **Ask before installing a new npm/composer package** not in the tech stack list. Explain why current stack doesn't cover the need.
4. **Ask before creating a new database table.** Show proposed schema first.
5. **Update `docs/CHANGELOG.md` when adding a feature or breaking change.**
6. **Run tests after significant changes.**
7. **Format code with Pint (PHP) or Prettier (TS) before finishing.**
8. **Explain trade-offs when multiple approaches are valid**, then recommend one.
9. **When in doubt about student vs admin routing, ask.**
10. **Design mobile-first.** If you built a desktop-only view for the student area, redo it.

## 13. Things Claude Code Must NEVER Do

1. **Never edit an already-run migration.** Write a new one.
2. **Never commit secrets, API keys, or `.env` files.**
3. **Never bypass validation or authorization "temporarily."** Use test fixtures.
4. **Never introduce a new state management library** (Zustand only).
5. **Never introduce a new CSS framework** (Tailwind only).
6. **Never introduce a new UI library** (shadcn/ui only). Custom components extend shadcn.
7. **Never use `any` in TypeScript** without an explicit justifying comment.
8. **Never call third-party APIs from a controller** — always queue.
9. **Never store money as float.** Integer smallest units.
10. **Never store user PII in logs.**
11. **Never assume the client wants a feature not in the SRS.** Ask.
12. **Never store auth tokens in `localStorage`.** Cookies only (via Sanctum).
13. **Never expose raw video URLs.** Always through signed-URL endpoint.
14. **Never build a desktop-only layout for the student area.** Mobile-first, always.

## 14. Environment-Specific Notes

- **Development:** Local MySQL, Mailhog for emails, local disk for files, PayHere sandbox.
- **Staging:** Separate Contabo VPS, real payment gateway sandbox, real email service.
- **Production:** Contabo Cloud VPS 20 Mumbai, real payment gateway, Bunny Stream, Backblaze backups.

## 15. Client-Facing Language

- Plain English, ~grade 8 reading level.
- Active voice ("Save changes" not "Changes to be saved").
- Never expose technical errors ("Something went wrong. Please try again." not "500 Internal Server Error").
- Every user-facing string wrapped in `t('key')` for Sinhala translation.

## 16. Future-Proofing Notes

Even though this is web-only for Phase 1:

1. **The Laravel API must be built as a clean REST API** — a future React Native mobile app will consume the same endpoints without changes.
2. **API responses are JSON, never HTML fragments.** No Inertia.js. Pure API + separate React SPA.
3. **Auth uses Sanctum SPA cookies for web now**, but the same Sanctum can issue API tokens for a mobile app later without backend changes.
4. **No web-specific logic in the API.** All UI concerns stay in the React app.

---

**Last updated:** 13 August 2026. **Update this file whenever conventions change.**
