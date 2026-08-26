# Plan B International — Project Instructions for Claude Code

> This file is read by Claude Code at the start of every session. Keep it up to date.

## 1. Project Context

**What we're building:** A web-based learning + career-services platform for Plan B International — a Sri Lankan company that prepares students for education and employment migration to the UAE.

**Client:** Plan B International (contact: Anuradha).

**Platform decision:** Two clients over one Laravel API.

- **`web/`** — React PWA. Ships the **admin panel** today; the student web area follows later, reusing the same student API.
- **`mobile/`** — React Native + Expo. The **student** app, one codebase for Android and iOS. This is the primary student experience.

Students authenticate by **email OTP or Sign in with Google** — there is no SMS and no phone verification. Admins authenticate by email + password on web only.

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
├── backend/         Laravel 11 API          — see backend/CLAUDE.md
├── web/             React 18 + Vite PWA (admin panel; student web area later)
├── mobile/          React Native + Expo (student app) — see mobile/CLAUDE.md
├── shared/          Source-only TS shared by web/ and mobile/ (types, Zod schemas, tokens, i18n)
├── docs/            Specs, schema, deployment
└── CLAUDE.md        This file
```

Each app folder has its own `package.json` / `composer.json`. Do not create shared root-level dependencies.

**`shared/` is the one carve-out**, and it is deliberately not a dependency: it ships **TypeScript source only, with no dependencies of its own** (`zod`, `axios` etc. are `peerDependencies`). Both apps reach it through a `@shared/*` tsconfig path alias — Vite resolves it via an alias, Metro via `watchFolders`. There is nothing to install and nothing to hoist, so no root `package.json` and no workspace tooling exist. A published app bundle is fully standalone; `shared/` is compile-time only.

Anything describing the API contract — types mirroring an API Resource, a Zod schema, brand tokens, i18n strings — belongs in `shared/`, never copy-pasted into an app.

## 3. Tech Stack (Do Not Change Without Asking)

**Backend:** Laravel 11, PHP 8.2+, MySQL 8, Redis, Sanctum (cookie-based SPA auth), Horizon (queues), Spatie Permission, Spatie Media Library, Intervention Image (re-encodes every uploaded image before storage, per §7.4).

**Web (`web/`):** React 18, TypeScript, Vite, `vite-plugin-pwa` (PWA), shadcn/ui, Tailwind CSS, TanStack Query (server state), TanStack Table (data grids), React Hook Form + Zod (forms), Zustand (client state), React Router v6, Axios, Lucide React (icons), Recharts (charts), Sonner (toasts), Framer Motion (animations), react-i18next (Sinhala/English), TipTap (rich-text editing for admin-authored content — headless, so the toolbar is our own shadcn buttons).

**Mobile (`mobile/`):** React Native + Expo, TypeScript, `expo-router` (file-based routing), NativeWind (Tailwind for RN — the RN renderer for the framework already chosen, **not** a second design vocabulary), TanStack Query, Zustand, React Hook Form + Zod, Axios, `expo-secure-store` (auth tokens), `expo-video` (no-skip player), `expo-auth-session` (Google Sign-In), `lucide-react-native` + `react-native-svg` (same icon set as web), `sonner-native` (toasts), react-i18next + `expo-localization`, EAS Build (APK for internal testing, AAB for Google Play).

**Shared (`shared/`):** TypeScript source only — API types, Zod schemas, `serverErrors.ts`, brand tokens, i18n strings. No dependencies of its own.

**Video player:** `expo-video` on mobile; `video.js` or `plyr` on web. Both with custom no-skip logic (see Section 4), and the rule is enforced **server-side** in `CourseProgressService` regardless of client.

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
12. **Auth is Sanctum, in two modes, over two separate guards.** Admins (`User`) use SPA cookie sessions from `web/`; students (`Student`) use Bearer tokens from `mobile/`. No manual JWT handling. The two actor types must never authenticate on each other's routes — read `backend/CLAUDE.md` before touching `config/auth.php`, any guard, or any policy signature.

### Web (Single App, Multiple Roles)

1. **Feature-based organization** in `src/features/{role}/{feature}/`. Roles: `marketing`, `auth`, `student`, `admin`.
2. **Three layout components** — `PublicLayout`, `StudentLayout`, `AdminLayout`. Route guards wrap each area.
3. **Shared UI in `src/components/ui/`** (shadcn/ui primitives — never edit directly unless customizing globally) **and `src/components/shared/`** (custom composites built on top: `DataTable`, `FilterCard`, `ConfirmDialog`, `EmptyState`, `Pagination`, `StatusBadge`, `Breadcrumbs`, `FullScreenSpinner`, `PageLoader`, and the Sectioned Admin Forms building blocks `FormSection`, `FieldLabel`/`FieldError`, `SegmentedToggle`, `RichTextEditor`). A pattern used by more than one feature belongs in `shared/`, not copy-pasted per feature.
4. **Routes are code-split.** Every page component (and `AdminLayout` itself) is `React.lazy`-loaded in `src/routes/router.tsx`, each wrapped in its own `<Suspense>` (`PageLoader` inside the admin shell, `FullScreenSpinner` before it). Keeps the admin bundle from shipping student/marketing-area code and vice versa once those areas exist — cheap to keep up as new routes are added, expensive to retrofit later.
5. **Server state via TanStack Query.** No manual `useEffect + fetch`. Every API call goes through a typed function in `src/api/` called via `useQuery` or `useMutation`.
6. **Client state via Zustand** for anything that persists across pages. Prefer local component state otherwise.
7. **Forms use React Hook Form + Zod.** One schema, one form. Never uncontrolled inputs.
8. **Types match backend API Resources exactly.** When a Resource changes, update the corresponding TypeScript type in `src/types/`.
9. **Auth via httpOnly cookies (Sanctum).** No tokens in `localStorage`. React app calls `/sanctum/csrf-cookie` first, then cookies flow automatically.
10. **All API errors surface as toasts via Sonner.** Never leave a failed mutation silent.
11. **Loading states are explicit.** Every data-fetching component shows a skeleton or spinner.
12. **Route guards enforce role separation.** Student cannot access `/admin/*`; admin cannot access `/app/*` as a student (unless dual-role). Use a `RequireRole` component wrapper.

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
- **Shadows:** cards use border only, no shadow (`web/src/components/ui/card.tsx`) — a page with many stacked cards gets visually heavy fast otherwise. Dialogs/Sheets/AlertDialogs use `shadow-lg` (they float above the page, so a shadow reads correctly there). No shadow on other flat surfaces.
- **Colors:** one accent + `slate-*` grays. Never more than 3 semantic colors (success/warning/danger). use 'PBLogo.PNG' logo for color inspiration
- **Optimized Screen** Always try to set all component scalable withing the screen, Then user reduce to scroll
- **Read and follow UI_UX_GUIDELINES.md file for UI UX instructions**

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

### Compact Admin Data Tables (standard pattern — use for every new list page)

Established on the Students list page; reuse this exact pattern for Courses, Orders, Payments, Checklists, Jobs, Accounts, Reports, etc. Don't reinvent it per page.

- **No summary/stat cards above a data table's header.** Stat cards belong on the Dashboard only. A list page header is just: title + one-line description on the left, primary actions (small buttons) on the right. Nothing else.
- **Filters live in a collapsible `FilterCard`** (`web/src/components/shared/FilterCard.tsx`), collapsed by default. The toggle is a slim bar: filter icon + "Filters" + an active-filter-count badge + a chevron that flips on open. Never show filter fields inline/always-visible on the page — they go inside the collapsible card.
- **Filters are staged, not live.** Editing a search box or dropdown inside the filter card does _not_ refetch immediately. Track `draft*` state (what's being edited) separately from `applied*` state (what the query actually uses); only sync them on **"Apply Filter"**. Show a **"Clear"** button (only when `activeCount > 0`) that resets both draft and applied state. Enter in the search field should also trigger Apply. This avoids refiring the query on every keystroke and matches the client's reference UI.
- **Small buttons everywhere in table-adjacent UI.** Use the Button `size="sm"` (or `size="xs"` for pagination/back-links, `size="icon-sm"` for row-action triggers) — never the `default` (h-10) size in list-page headers, filter bars, table row actions, or pagination. `default` size is reserved for standalone primary CTAs outside dense admin screens (e.g. the login submit button).
- **Compact table density.** The shared `Table`/`TableHead`/`TableCell` primitives (`web/src/components/ui/table.tsx`) are already tuned for this: `h-9` uppercase 11px headers, `px-3 py-2` cells. Don't override these to be taller/looser on a per-page basis.
- **Tight page rhythm.** Page-level wrapper uses `space-y-3`–`space-y-4`, not `space-y-6`+. Dialog/AlertDialog content padding is `p-5` with `gap-3` (already the shared default) — don't add extra padding per-dialog.
- **Row actions are individual icon buttons**, not a dropdown menu. Use the shared `RowActions` component (`web/src/components/shared/RowActions.tsx`) in every `*Columns.tsx` actions column — pass it an array of `{ label, icon, onClick, variant?, disabled?, hidden? }`. It renders one `icon-sm` ghost button per action (destructive ones tinted `text-destructive`), each labelled by a `Tooltip` and `aria-label` since the buttons are icon-only, and it stops click propagation so a row's own `onRowClick` doesn't fire. Icons are always visible, never hover-only — hover-reveal is invisible on touch. To keep the column width predictable as tables grow, anything past the first 3 actions collapses into a trailing `MoreHorizontal` overflow menu automatically (`maxInline` is configurable). Never hand-roll a dropdown or a bare row of `Button`s per page.
- **Sticky header + sticky action column** (UI_UX_GUIDELINES.md §3), built into the shared primitives so every list page gets it automatically: the `Table` container (`web/src/components/ui/table.tsx`) is `max-h-[65vh] overflow-auto` (not `overflow-x-auto` alone — that silently breaks `position: sticky`, see the code comment) so the `TableHeader` stays pinned on vertical scroll. Give a trailing row-actions column `meta: { sticky: 'right' }` in its `ColumnDef` (see any `*Columns.tsx`) and `DataTable` pins it during horizontal scroll — needed once a table has enough columns to scroll on tablet/laptop widths.

### Breadcrumbs & Desktop Width

- **Breadcrumbs on nested/drilled-into pages only** (UI_UX_GUIDELINES.md §1) — e.g. Student Detail shows `Students > [name]` via the shared `Breadcrumbs` component (`web/src/components/shared/Breadcrumbs.tsx`). Top-level sidebar pages (Dashboard, Students, Industries, Professions) skip it — the sidebar already shows where you are. Use it in place of a manual "Back to X" button, not alongside one.
- **Content width caps at `max-w-7xl`** on very wide monitors (UI_UX_GUIDELINES.md §3 "Desktop Maximization") — set once on `AdminLayout`'s `<main>`, not per-page. Standard 1366–1920px business monitors never hit the cap; it only stops content stretching edge-to-edge on ultra-wide displays.

### Sectioned Admin Forms (standard pattern — use for every new multi-field create/edit form)

Established on the Add/Edit Student dialog (`web/src/features/admin/students/components/StudentFormDialog.tsx`); reuse for future multi-section forms (Courses, Jobs, Orders, etc) via the shared building blocks in `web/src/components/shared/` — `FormSection.tsx`, `FormField.tsx` (`FieldLabel`/`FieldError`), `SegmentedToggle.tsx`. Import them, don't re-implement per form. Tiny 1–2 field dialogs (Industry, Profession) don't need this — it's for forms with several logical groups of fields.

- **Group fields into bordered card sections**, each with a small uppercase label row (icon + title) via `FormSection` — e.g. "Photo", "Basic information", "Contact details". Don't run every field together in one flat list.
- **Photo upload is a dropzone, not a tiny avatar-only control.** A dashed-border box (`UploadCloud` icon, "Click to upload or drag and drop", accepted types/size hint) that accepts both click and drag-and-drop. Once a photo exists it fills the box (`object-cover`) with small overlaid change/remove buttons — never a bare circular avatar off to the side as the only way to attach a photo.
- **Binary/small (2–3 option) choice fields are a segmented control, not a `Select` dropdown.** Use `SegmentedToggle` — a single `rounded-full bg-primary` track holding the options, where the selected one lifts out as a `bg-background text-primary` pill and unselected ones are `text-primary-foreground/70`. Reserve `Select` for fields with more options than comfortably fit in a track (e.g. Industry/Profession).
- **Required fields get a `FieldLabel` with a small leading icon and a red `*`.** Optional fields skip the asterisk. Every field shows inline `FieldError` text under it once touched. Validation runs on blur only (`mode: 'onBlur'`, `reValidateMode: 'onBlur'` on the RHF form) — never on keystroke, so an error never appears or updates while the admin is still typing a value.
- **Colors stay Plan B brand** — selected/active states use `--primary` (navy), never an arbitrary accent color pulled from a design reference image.

### Rich Text & Nested Repeaters (standard pattern — established on the Course form)

Established on the Add/Edit Course page (`web/src/features/admin/courses/pages/CourseFormPage.tsx`). Reuse for any future content that nests repeatable rows (Checklist items, Assessment question banks, Premium Service tiers).

- **Rich text goes through the shared `RichTextEditor`** (`web/src/components/shared/RichTextEditor.tsx`, TipTap). Never add a second editor library, and never expose a formatting control the backend sanitizer will strip — the toolbar and `App\Support\HtmlSanitizer`'s allowlist are kept in step deliberately.
- **Admin-authored HTML is sanitized server-side on write**, in the Service, before it reaches the database — not on render. Rendering saved HTML anywhere still needs `dangerouslySetInnerHTML` + DOMPurify (§7.6); admin list views show a plain-text excerpt instead so they need neither.
- **A form with several logical groups plus repeatable rows is a full page, not a dialog.** Dialogs are for short forms. Give the page `Breadcrumbs`, put its Save/Cancel in the page header, and keep the fixed detail fields in a `lg:sticky` side column so they stay visible while the admin works down a long list.
- **Repeatable rows are collapsible cards with explicit up/down reorder buttons** plus Expand all / Collapse all. Position in the submitted array is the `sort_order` the backend stores — don't send an explicit order field.
- **Give each repeatable row a `client_key`** (`newClientKey()`) in the form schema. `useFieldArray` reserves `id` for its own React key and will overwrite a server id, so the server id lives in `saved_id`, and anything held outside the form (staged files, upload progress) is keyed by `client_key` so it survives reordering.
- **Large file uploads never ride along with the form submit.** Save the record first, then upload each staged file against the returned row ids, **sequentially**, behind a progress dialog. Match staged file to saved row by array position — the backend returns rows in `sort_order`.
- **Nested 422s land on the exact input**: pass `{ nested: true }` to `applyServerValidationErrors` from a form that renders every level of the path. Flat forms keep the default root anchoring.

### Answer Keys & Student-Facing Payloads (non-negotiable)

Established on the Q&A paper (`course_question_options.is_correct`).

- **An API Resource that carries an answer key is admin-only.** `CourseQuestionOptionResource` includes `is_correct` because only admins read that endpoint. Any student-facing endpoint over the same data needs its **own** Resource that omits it — a frontend that simply doesn't render the field still ships the answers in the network tab.
- **Grading happens on the backend.** Never send the correct answers to a student client and compare there.
- **Rules the array syntax can't express go in a Form Request `after()` hook**, not the Service — e.g. "exactly one correct answer per question". Mirror them in the Zod schema too, so the admin sees the problem before saving, but the backend stays the enforcement point (§7.3).

### Video Handling (non-negotiable)

- **A video file URL is never returned by an API Resource.** Resources expose `has_file`, `file_name`, `file_size_bytes`, `duration_seconds`, `thumbnail_url` — nothing that locates the file.
- **Uploaded lesson files live on the private `course_videos` disk**, which has no `url` configured on purpose.
- **Playback always goes through the two-step signed flow**: an authenticated endpoint returns `{ url, expires_at }` (≤2h), and the URL points at a `signed`-middleware route outside the session guard — a `<video>` element sends no cookies, so the signature is the authorization.
- **The playback route must serve HTTP `Range` requests** (Laravel's `response()->file()` does), or the player downloads the whole lesson before it can start.
- **Durations are read in the browser** from the picked file before upload; never ask an admin to type one, and never probe a large file server-side.

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

### Mobile

```bash
npm install
npx expo start                       # Metro bundler; press a for Android, i for iOS
npx expo install <pkg>               # ALWAYS use this, not npm install — it pins the SDK-compatible version
npx expo install --fix               # Realign every package with the current SDK
npx tsc --noEmit                     # Type-check

eas build --profile preview    --platform android   # APK, internal testing / direct install
eas build --profile production --platform android   # AAB, required by Google Play
eas build --profile production --platform ios       # Builds on EAS macOS workers; no Mac needed
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
5. **Never introduce a new CSS framework** (Tailwind only — NativeWind on `mobile/` is Tailwind's React Native renderer, the same vocabulary, and is approved).
6. **Never introduce a new UI library.** Web: shadcn/ui only, custom components extend shadcn. Mobile: there is no shadcn for RN, so `mobile/src/components/ui/` is our own primitive set mirroring web's — extend it, never add an RN component kit.
7. **Never use `any` in TypeScript** without an explicit justifying comment.
8. **Never call third-party APIs from a controller** — always queue.
9. **Never store money as float.** Integer smallest units.
10. **Never store user PII in logs.**
11. **Never assume the client wants a feature not in the SRS.** Ask.
12. **Never store auth tokens in `localStorage`.** On web, httpOnly cookies only (via Sanctum). On mobile, Sanctum Bearer tokens live in **`expo-secure-store`** (iOS Keychain / Android Keystore) — never `AsyncStorage`, which is React Native's `localStorage`: unencrypted JSON on disk, readable on a rooted device. Never in Zustand `persist`, never in a module-level global.
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

## 16. One API, Two Clients

The API is UI-agnostic and serves `web/` and `mobile/` equally.

1. **API responses are JSON, never HTML fragments.** No Inertia.js. Pure API + separate clients.
2. **No client-specific logic in the API.** All UI concerns stay in the React / React Native app. If an endpoint needs to know which client called it, the design is wrong.
3. **Two actor types, two guards.** `/api/v1/admin/*` authenticates a `User` (SPA cookie session); `/api/v1/student/*` authenticates a `Student` (Bearer token, and later a student SPA session). Neither may authenticate on the other's routes — `backend/CLAUDE.md` explains the exact mechanism and why it is not automatic.
4. **The student API is written once and consumed twice.** The student web area, when it is built, adds no endpoints — it is UI only.
5. **A student-facing endpoint always gets its own API Resource**, never a reused admin one. See "Answer Keys & Student-Facing Payloads" in §8.

## 17. Deeply follow these for development

- set appropriate placeholders for each input fields.
- Always Properly read existing code before start development to avoid making an messy code
- Properly optimized Page Layout withing the screen to reduce scroll, That will user friendly.
- Working in `backend/`? Read `backend/CLAUDE.md` first — the guard split is not obvious and is easy to break.
- Working in `mobile/`? Read `mobile/CLAUDE.md` first.
- Read and Follow `C:\laragon\www\planb\.agents\skills\laravel-specialist\SKILL.md` file for backend Guidelines
- Read and Follow `C:\laragon\www\planb\.agents\skills\ui-ux-pro-max\SKILL.md` file for frontend development
- Always Follow last changed & existing UI and styles withing the whole app to keep the same UI consistency of Admin.
- Ask questions if need more clarification.

---

**Last updated:** 24 August 2026. **Update this file whenever conventions change.**
