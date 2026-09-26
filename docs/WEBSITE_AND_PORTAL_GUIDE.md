# Plan B International — Public Website & Student Web Portal

**The build guide for `site/`.** Read this top to bottom before writing code for the website or the
browser-based student portal. It is written so that a **new chat with no history can pick up the
work** — every decision already made is recorded here so nobody re-asks or re-litigates it.

- **Branch:** `feature/public-website-and-student-portal`
- **Started:** 24 September 2026
- **Root spec:** `SRS_PlanB_International_v1.2.docx` — when this guide and the SRS disagree, the SRS wins.
- **Sibling guides:** root `CLAUDE.md` · `backend/CLAUDE.md` · `mobile/CLAUDE.md` ·
  `UI_UX_GUIDELINES.md` · `SECURITY_AND_LAUNCH_GUIDE.md`

---

## 0. How to use this guide (read first, every session)

### Working rules for the agent

1. **Do one task per session.** Pick the first unchecked task in phase order. Phases are ordered by
   dependency — you cannot build the public pages before the public API exists.
2. **Before coding, read:** root `CLAUDE.md`, plus `backend/CLAUDE.md` for any backend task, plus the
   files the task names. Re-verify the problem/gap still exists — an earlier session may have closed it.
3. **Stop and ask the user before:**
   - creating a new table or column — show the proposed migration first (root `CLAUDE.md` §12.4),
   - installing any package not listed in §3 "Approved packages",
   - anything a task marks **ASK**.
4. **Never** edit an already-run migration, weaken a test to make it pass, add a guard to
   `config/sanctum.php`'s `guard` array, or bypass authorization "temporarily".
5. **Every task finishes with:**
   - feature/unit tests for the change (happy path + the failure being closed),
   - `php artisan test` + `./vendor/bin/pint` (backend) / `npx tsc --noEmit` + `npm run lint` (site, web),
   - the task's **Security gate** in §7 ticked, or explicitly marked N/A with a reason,
   - `docs/CHANGELOG.md` updated; `docs/api-endpoints.md` and `docs/schema.md` if touched,
   - **no git commit, branch or push by the agent.** Leave the work uncommitted, list the changed
     files, and suggest a Conventional Commit message. The user reviews and commits.
   - ticking the task's checkbox here, with the date and a one-line "Built:" note saying what
     actually landed (follow the style in `SECURITY_AND_LAUNCH_GUIDE.md`).
6. **No Prettier.** This repo has no Prettier config; running it rewrites files to a foreign style.
7. User-facing strings go through `t('key')` with EN + SI entries in `shared/src/i18n`.

### Task ID legend

| Prefix | Meaning |
|---|---|
| `FND-x` | Foundation — the `site/` app scaffold, design system, routing |
| `API-x` | Backend — public catalog API and the student web session |
| `CMS-x` | Backend + admin UI for website content (the homepage builder) |
| `PUB-x` | Public website pages |
| `POR-x` | Student web portal pages |
| `SEC-x` | Security tasks and gates — **these block release, see §7** |
| `DEP-x` | Deployment |

---

## 1. Decisions already made (do not re-ask)

Confirmed with the client (Anuradha) on 23–24 September 2026.

| Topic | Decision | Why |
|---|---|---|
| **Where the code lives** | A **new `site/` app** — `planb/site/`. Not a feature folder inside `web/`. | Different domain = different build artifact. Keeps admin code off the public host, keeps the marketing bundle out of the admin's dependency graph, and separates the two Sanctum sessions *by origin*. See §2. |
| **What `site/` contains** | The **public website and the student portal together**, one app, one domain, one student session. | Login lives in the website header; a student clicking "Sign in" must not jump domains. Cookies are per-origin. |
| **`web/`** | Stays **admin-only**, on its own admin subdomain. | Unchanged from today. |
| **Domains** | `planbinternational.lk` → `site/` · `admin.planbinternational.lk` → `web/` · `api.planbinternational.lk` → `backend/`. Exact names **ASK** at `DEP-1`. | |
| **SEO approach** | Client-rendered SPA **plus** build-time prerendering for the static pages, and dynamic `<meta>`/OpenGraph tags on course pages. **No Next.js.** | Keeps the approved stack. Revisit only if organic search becomes the main channel. |
| **Site map** | One **long scrolling home page** (header nav scrolls to sections) **plus three real routes**: `/courses`, `/courses/:slug`, `/checkout/:orderId`. | Course pages must be linkable for ads and WhatsApp shares. |
| **Homepage content** | **Admin-managed.** New tables + admin screens. | Anuradha edits copy, photos and featured courses herself, no redeploy. |
| **Homepage builder scope** | **Reorder + show/hide a fixed set of designed section types**, each with its own editable content. **Not** a free-form block builder. | Every arrangement still looks professional; the admin cannot break the design. A free-form builder is 3–4 weeks and needs live preview. |
| **What the site sells** | **Individual courses, category bundles, and premium services** — same as mobile, same order/payment layer, no backend change to it. | |
| **Checkout methods** | Card (PayHere hosted redirect) **and** bank transfer with receipt upload. Parity with mobile. | |
| **Student portal scope** | **Full parity with the mobile app**, including video lessons and assessments. | See §2.4 — the no-skip rule is already enforced server-side and is client-agnostic, and Bunny Stream removes the bandwidth objection. |
| **Auth on `site/`** | Student **Sanctum cookie session** (httpOnly), not a Bearer token. | Root `CLAUDE.md` §13.12 forbids tokens in `localStorage`; in-memory tokens log the student out on every page refresh. Mechanism and its danger: §2.3. |
| **Student sign-in methods** | Email OTP **and** Sign in with Google. No SMS, no passwords. | Matches mobile and the SRS. |
| **Where sign-in lands** | **The student portal (`/app`)** — confirmed by Anuradha 2026-09-26. The one exception: a visitor bounced from a deep link into `/app/*` returns to that page. | A student signing in on the website wants their learning, not the marketing page they happened to be on. §4's earlier "returns to the same scroll position" is superseded. |
| **Languages** | English + Sinhala from day one, via `shared/src/i18n`. Admin-authored content uses `*_si` sibling columns. | Root `CLAUDE.md` §8. |
| **Branding** | Plan B navy `#14224b` primary, gold `#c79a3a` accent. **Ignore the colours in the reference screenshots** — they are eLearning.lk's. | |

### Open items still to confirm

- **`DEP-1`** — the exact domain names.
- **`CMS-1`** — the proposed migrations must be shown to the user before they run (root `CLAUDE.md` §12.4).
- **`SEC-9`** — payments are currently **switched off server-side** (`PAYMENTS_ENABLED=false`). See §6.

---

## 2. Architecture

### 2.1 Repository layout after this work

```
planb/
├── backend/     Laravel 11 API                  — serves all three clients
├── web/         React + Vite — ADMIN ONLY       — admin.planbinternational.lk
├── site/        React + Vite — PUBLIC + PORTAL  — planbinternational.lk   ← NEW
├── mobile/      React Native + Expo — student app
├── shared/      TypeScript source only — types, Zod schemas, tokens, i18n
└── docs/
```

`site/` has its own `package.json`. There is still **no root `package.json` and no workspace
tooling** — root `CLAUDE.md` §2 explains why, and that stays true. `site/` reaches `shared/` the same
way `web/` does: a `@shared/*` tsconfig path alias plus a Vite alias. Nothing is installed, nothing
is hoisted.

> **Root `CLAUDE.md` §2 currently says the marketing and student areas live inside `web/`.**
> That is now out of date. Updating it is task `FND-6` and is not optional — a future session will
> read the stale line and build in the wrong place.

### 2.2 What goes where

| Concern | Lives in |
|---|---|
| API types mirroring a Resource, Zod schemas, brand tokens, i18n strings | `shared/` — **never** copy-pasted into an app |
| shadcn/ui primitives | Owned per-app. `site/` gets its own `src/components/ui/`. shadcn components are copy-in by design; do not try to share them from `web/`. |
| Marketing composites (Hero, SectionRenderer, CourseCard, TestimonialCard) | `site/src/components/` |
| Admin screens for website content | `web/src/features/admin/website/` — the admin panel is still the only place anything is authored |

### 2.3 Authentication — the delicate part

**Read `backend/CLAUDE.md` §1 in full before touching this.** It documents two facts in Sanctum's
vendor code that mean the two actor types are *not* separated for you.

Today:

| Actor | Model | Routes | Credential |
|---|---|---|---|
| Admin | `App\Models\User` | `/api/v1/admin/*` | Sanctum SPA cookie session, from `web/` |
| Student | `App\Models\Student` | `/api/v1/student/*` | Sanctum **Bearer token**, from `mobile/` |

`site/` adds a third credential: **a student cookie session**.

**The mechanism (task `API-5`):**

1. Add a session guard in `config/auth.php`:
   ```php
   'student-web' => ['driver' => 'session', 'provider' => 'students'],
   ```
   It is a **`session` driver, not `sanctum`**, and it names the `students` provider — so it can only
   ever resolve a `Student`.

2. **Do not add anything to `config/sanctum.php`'s `guard` array.** That array is global; every
   Sanctum-driven guard reads it. `backend/CLAUDE.md` calls it "exactly the leak". This is the single
   easiest way to break the whole guard separation, and it will look like it works.

3. Student routes accept either credential: `auth:student,student-web`. `EnsureStudentActor`
   (401 unless `instanceof Student`) and `EnsureStudentActive` stay on the group unchanged — they are
   what actually holds the line, and they keep holding it for the new guard for free.

4. Add new session endpoints alongside the token ones, **not replacing them** — mobile still needs
   tokens:
   - `POST /api/v1/student/auth/session/verify-code` — same OTP check, then `Auth::guard('student-web')->login($student, remember: true)` + session regenerate, returns the student, sets no token.
   - `POST /api/v1/student/auth/session/google` — same, for Google sign-in.
   - `POST /api/v1/student/auth/session/logout` — guard logout + session invalidate + token regenerate.
   - `auth/request-code` is unchanged and shared.

5. Add the site domain to `SANCTUM_STATEFUL_DOMAINS` so `statefulApi()` starts a session and enforces
   CSRF for requests from it. `site/` calls `/sanctum/csrf-cookie` before its first state-changing
   request, exactly as `web/src/api/client.ts` already does.

6. **And add it to `FRONTEND_URLS` (CORS) as well. These are two lists and both are required.**
   This was got wrong once and cost real time, so it is worth stating plainly: `site/` was added to
   `SANCTUM_STATEFUL_DOMAINS` but not to `config/cors.php`'s origin list, and **every API call from
   the website failed silently for days.** The failure gives you nothing to search for — the request
   reaches Laravel, is answered `200`, and appears healthy in the log; the *browser* discards the body
   because `Access-Control-Allow-Origin` names the admin panel instead. On the website that looked
   like "the CMS content is not showing", not like a network error.

   CORS decides whether the browser hands the response to JavaScript. Sanctum decides whether the
   request gets a session. An origin in one list but not the other is broken in a way no server-side
   test would have caught — which is why `tests/Feature/CorsTest.php` now asserts **the header value**,
   not merely its presence. Add an origin to both lists or to neither.

**Why this is safe:** `student-web` has the `students` provider (can never load a `User`),
`auth:sanctum` reads `sanctum.guard = ['web']` with the `users` provider (can never load a
`Student`), and the two actor middlewares 401 anything that slips through.

> **Correction (2026-09-26, at `API-5`).** This paragraph used to open with "different domains means
> the admin cookie and the student cookie never travel together". **That is not true, and nothing may
> rely on it.** The session cookie belongs to the **API's** host, not to the page that made the
> request — so `web/` and `site/` in one browser send the *same* API session cookie, and an admin who
> also signs in to the portal holds **both logins in one Laravel session**. Separate front-end domains
> separate the *pages*, not the API session.
>
> The isolation therefore rests entirely on the guards and actor middleware above, and
> `GuardIsolationTest` now proves it for that exact case
> (`test_one_browser_signed_in_as_both_resolves_each_area_to_its_own_actor`). Two consequences built in:
> - **Guard order is `auth:student-web,student`, never the reverse.** Tried second, the Sanctum
>   `student` guard's stateful branch finds the *admin* through the global `web` list first, and
>   `student.actor` then 401s the student. A mutation test confirmed the reversed order fails.
> - Signing out of either area invalidates the shared session, which signs that browser out of the
>   other area too. Accepted: it only affects staff who test the portal in their admin browser, and
>   failing closed is the right direction.
>
> **Also found at `API-5`: `auth/refresh` MINTS a bearer token**, so on the shared group it would have
> let a website session trade its httpOnly cookie for a 30-day token that JavaScript can read and that
> survives signing out. `refresh` and `logout` are now **token-only** (`auth:student`), and a test
> proves a website session gets 401 there.

**`tests/Feature/GuardIsolationTest.php` proves the existing four directions and must be extended to
prove the new ones** (task `SEC-1`). *If that test fails, stop — do not adjust the test.*

**Rejected alternative, for the record:** keep Bearer tokens on web and hold them in memory only
(Zustand, not persisted). Rejected because a full page reload drops the token and signs the student
out — unacceptable on a website where a refresh is normal. Storing the token in `localStorage`
instead is forbidden outright by root `CLAUDE.md` §13.12.

### 2.4 Video in the browser — why it was approved

The initial recommendation was to leave video on mobile only. That was **wrong**, and the reasoning
is recorded so it is not re-raised:

- **No-skip enforcement is already client-agnostic.** `app/Services/Course/CourseProgressService.php`
  enforces monotonic position, the `elapsed × 2.0 + 5s` advance cap, and the two-gate "watched" rule
  (position ≥ 95% **and** accumulated `watched_seconds` ≥ 90%) **on the server**. It already assumes a
  hostile client. A browser is just one more.
- **Bandwidth is solved.** `docs/bunny-stream-setup.md` records that serving video from the app server
  held one PHP worker per viewer and took the **whole API** down at ~30 concurrent viewers. The Bunny
  Stream integration that fixes it is **already written and merged**, off behind
  `BUNNY_STREAM_ENABLED=false`. Turning it on is task `DEP-4` and is a hard prerequisite for portal video.
- `video.js` is already a `web/` dependency and root `CLAUDE.md` §4 already specifies the web player's
  behaviour.

**The one accepted trade-off:** a browser makes ripping easier than an app — the signed URL sits in
the network tab for its life. Mitigations in `SEC-7`: short signed-URL lifetime, Bunny token
authentication, no `download` attribute, no right-click save. True DRM is a Bunny enterprise add-on
and is **out of scope**. This is the normal state of every online course business and is not a reason
to withhold video from paying students on a laptop.

### 2.5 The API contract

**No new student endpoints.** Root `CLAUDE.md` §16.4: "The student API is written once and consumed
twice. The student web area adds no endpoints — it is UI only." The portal consumes
`routes/api_student.php` exactly as mobile does.

The **public** website is different — it serves anonymous visitors, and every student route is behind
`auth:student`. That needs a new, separate public surface (`API-1`…`API-4`).

---

## 3. Stack for `site/`

Same approved stack as `web/`. **Nothing new without asking.**

React 18 · TypeScript (strict) · Vite · Tailwind CSS · shadcn/ui · TanStack Query · Zustand ·
React Hook Form + Zod · React Router v6 · Axios · Lucide React · Sonner · Framer Motion ·
react-i18next · `video.js` (portal player only, lazy-loaded).

**Approved new packages for this work:**

| Package | For | Notes |
|---|---|---|
| `vite-plugin-prerender` *(or `vite-prerender-plugin`)* | Static prerendering of public pages | `FND-5`. Pick one at that task and record which. |
| `dompurify` + `@types/dompurify` | Sanitising admin-authored HTML at render (root `CLAUDE.md` §7.6) | Required — do not render CMS HTML without it |
| `react-helmet-async` | Per-route `<title>` / OpenGraph tags | Needed for link previews |

Anything else: **ASK**.

**Not used on `site/`:** TanStack Table, TipTap, Recharts, `tus-js-client`. Those are admin tools and
must not enter this bundle.

---

## 4. Design direction

Follow `UI_UX_GUIDELINES.md` and root `CLAUDE.md` §8. The reference screenshots supplied by the
client (eLearning.lk) are a guide to **structure and density only** — their orange/purple palette,
their typography and their card treatment are theirs, not ours.

- **Palette:** navy `#14224b` primary, gold `#c79a3a` accent, `slate-*` greys. Never more than three
  semantic colours (success / warning / danger). Tokens come from `shared/src/theme/tokens.json`.
- **Type:** Inter for Latin, Noto Sans Sinhala for Sinhala — matching `web/`.
- **Radius:** `rounded-lg` cards, `rounded-md` buttons, `rounded-2xl` modals.
- **Shadows:** the admin rule ("cards use border only") is an *admin dense-table* rule. A marketing
  page may use soft elevation on hero and course cards — but stay restrained, and never on flat
  surfaces or inside the portal's list views.
- **Mobile-first, always.** Root `CLAUDE.md` §13.14. The portal in particular must work on a phone
  browser; a student who signed up on the app may open the portal on their phone.
- **Tap targets ≥ 44×44 px.** Modals become bottom sheets under `sm`.
- **The public site is not the admin panel.** Marketing pages get generous vertical rhythm and large
  type. Do **not** import the compact admin data-table conventions into the website. The portal sits
  in between — dense enough to be useful, roomy enough to read on a phone.
- **Every page needs its empty, loading and error state.** Skeletons for lists, never bare spinners.

### Site map

```
/                       Long scrolling home — sections rendered from the CMS, in admin order
/courses                Catalog: search, category/bundle filter, price filter, sort
/courses/:slug          Course detail — syllabus, what you get, price, Enrol / Buy bundle
/bundles/:slug          Category bundle detail
/services               Premium services (CV writing, visa consultation …)
/checkout/:orderId      Card or bank transfer
/payment/:status        Gateway return landing — reads nothing from the URL (see §5)
/privacy  /terms        Existing legal pages, linked in the footer

/app                    Portal home — continue learning, progress, announcements
/app/courses            My courses
/app/courses/:id        Course player shell — topics, lessons, progress
/app/lessons/:id        No-skip video player
/app/courses/:id/paper  Assessment
/app/services           My services + catalog
/app/checklist          Pre-departure / arrival checklists
/app/orders             Orders & payments
/app/profile            Profile, language, account deletion
```

Sign-in is a **dialog from the header**, not a page. On success it goes to the portal home (`/app`) —
see "Where sign-in lands" in §1. Deep-linking `/app/*` while signed out sends them to `/` with the
dialog open and the intended path remembered (in router state, never the URL), and sign-in returns
them there instead.

---

## 5. Rules carried over that this work must not break

These are already non-negotiable elsewhere in the repo and apply identically here.

- **The price comes from the product, on the server.** An amount in a request body is never trusted.
- **Only a signature-verified webhook may mark an order paid.** A browser redirect to
  `/payment/success` proves nothing — the student may have forged it. The landing route **reads
  nothing out of the URL**; it polls `GET /student/orders/{id}` and believes only that. Success,
  cancel and dismiss all take the same path. (This is the rule `mobile/CLAUDE.md` §6 already states.)
- **Never accept a card number.** The card form is always the gateway's own hosted page on its own
  origin. That is what keeps Plan B at PCI-DSS SAQ-A. A WebView or an embedded iframe form would undo it.
- **Bank transfers never auto-approve.** A rejection must leave the order payable so the student can resubmit.
- **Paywalls are enforced on the endpoint, not in the UI.** `is_enrolled` and `is_locked` are
  presentation. The stream, progress and paper endpoints 403 without an enrolment — that is the control.
- **An API Resource that carries an answer key is admin-only.** Grading happens on the backend.
  Before a student has passed or used every attempt, a result carries the score only.
- **A video file URL is never returned by a Resource.** Playback is always the two-step signed flow.
- **Money is integer smallest units** everywhere; it becomes decimal only in `formatMoney` at the edge.
- **English is the record**, Sinhala is the optional sibling column. The **server** picks the column
  from `Accept-Language`; the client never does. A student Resource sends **one** title. A client that
  switches language must refetch anything cached under the old header.

---

## 6. Known blockers

### Payments are switched off

`PAYMENTS_ENABLED` defaults to **false** (`SECURITY_AND_LAUNCH_GUIDE.md` P1-9). While it is false,
`OrderService::createFor`, `PaymentService::startCardPayment` and `submitBankTransfer` all return 403.

**The website's checkout cannot work until payments are switched on**, and switching them on is
gated by open security task **P3-10 "Payable order safety"** in `SECURITY_AND_LAUNCH_GUIDE.md`.

**How to proceed:** build the full checkout flow against `PAYMENTS_ENABLED=true` locally, and have the
public site read `payments_enabled` from `app-config` exactly as mobile does — showing "Coming soon ·
price" instead of a buy button while it is false. Prices stay visible (decision, 2026-09-17). The site
then needs no redeploy when payments go live. Do **not** ship a checkout that assumes payments are on.

### Open security tasks that this work makes more urgent

From `SECURITY_AND_LAUNCH_GUIDE.md`, still unchecked and now in scope because a public website widens
the attack surface:

- **P3-5** — admin login: lockout abuse, email enumeration, reusable GET unlock link.
- **P3-10** — payable order safety. **Hard dependency for checkout.**
- **P3-2 / P3-3** — lesson order and watch progress. Relevant again now that a browser is a client.
- **P3-9** — admin least-privilege for student PII.

Do not close them in this branch; note them and keep them visible.

---

## 7. Security — gates, not an afterthought

The client's instruction is explicit: **follow the security checks and fix every hole.** Root
`CLAUDE.md` §7 applies in full. What follows is what is *specific to a public website and a browser
portal*, over and above it.

### 7.1 The new attack surface

Everything before this branch was authenticated. A public website changes that: **anonymous traffic
now reaches the API.** Every `API-x` task must assume the caller is hostile, unthrottled and automated.

### 7.2 Security tasks

Each of these is a real task with its own tests. They are listed in the phases in §8 and must be
ticked there too.

- [x] **SEC-1 — Extend `GuardIsolationTest` for the student web session.** — done 2026-09-26.
  Prove all of: a `student-web` session cannot authenticate `/api/v1/admin/*`; an admin session cannot
  authenticate `/api/v1/student/*`; a student Bearer token still works; a `student-web` session is
  killed by `EnsureStudentActive` when the student is blocked or soft-deleted. **If it fails, stop.**
  **Built:** 8 new cases, all over a **real** session (signed in through the endpoint, cookie sent
  back) via `tests/Concerns/SignsInOnTheWebsite.php` — never `actingAs()`, which skips the guard
  resolution being tested. Beyond the four required: one browser holding **both** logins resolves
  each area to its own actor; a web session cannot mint a bearer token; a session cookie replayed
  from an unlisted origin authenticates nobody. A **soft-deleted** student's session gets 401, not
  403 — the `students` provider excludes trashed rows, so it dies a step *before* `EnsureStudentActive`.
  Two harness traps are documented in the trait and must not be "simplified" away: the test client
  drops cookies from JSON requests without `withCredentials()`, and the session `Store` keeps the last
  request's login in memory — without `freshRequest()` a request with **no** cookie still passed,
  which is exactly how a leak would hide. Mutation-checked: reversing the guard order fails the suite.

- [ ] **SEC-2 — Public endpoints are rate-limited by IP and return catalog fields only.**
  Named limiters in `AppServiceProvider` (start at `60,1`). Every public Resource lives in
  `app/Http/Resources/Public/` and is **its own class** — never a reused student or admin Resource.
  A test asserts the public course payload contains no `is_enrolled`, no progress, no `is_correct`,
  no paper, and nothing that locates a video file.

- [ ] **SEC-3 — Public catalog leaks no PII.** No student names, no photos, no counts that identify a
  person. "N learners" is a number, never a face or a name. Success stories and testimonials show only
  what an admin deliberately published.

- [ ] **SEC-4 — CMS content is sanitised server-side on write**, in the Service, before it reaches the
  database, using the existing `App\Support\HtmlSanitizer` allowlist — not on render. The admin
  editor's toolbar and that allowlist stay in step.

- [ ] **SEC-5 — The section renderer is a fixed registry, never dynamic dispatch.**
  A section's `type` indexes a hardcoded `Record<SectionType, Component>` map. An unknown type renders
  **nothing**. Never construct a component name, import path, class name or style from admin input.
  Section `settings` JSON is validated against a per-type Zod schema on write **and** on read.

- [ ] **SEC-6 — Every render of stored HTML goes through DOMPurify.** `dangerouslySetInnerHTML` is
  permitted only with a `DOMPurify.sanitize()` call on the same line (root `CLAUDE.md` §7.6). Add a
  lint rule or a code-review checklist item. Admin list views show a plain-text excerpt so they need neither.

- [ ] **SEC-7 — Video hardening for the browser.** Signed URL lifetime as short as playback allows
  (never more than 2h); Bunny token authentication on when Bunny is on; no `download` attribute;
  `controlsList="nodownload"`; context menu suppressed on the player. Document in the task that this
  raises the bar and does not make ripping impossible.
  **Player side done 2026-09-26 at `POR-4`** (see there). Still open: Bunny token authentication
  switched on in production (`DEP-4`).

- [ ] **SEC-8 — CSRF and session hardening for the new origin.**
  `SANCTUM_STATEFUL_DOMAINS` lists exact hosts, never a wildcard. `SESSION_SECURE_COOKIE=true`,
  `SESSION_SAME_SITE=lax`, `SESSION_DOMAIN` scoped so the admin and site cookies cannot mix.
  CORS `allowed_origins` is an explicit list — never `*` with credentials, which browsers reject anyway
  and which hides the real misconfiguration.

- [ ] **SEC-9 — Checkout is safe while payments are off and after they go on.** Confirm P3-10 is closed
  before enabling. Re-verify: amount/currency mismatch fails the payment; a replayed webhook is
  idempotent; a client redirect can never settle an order.

- [ ] **SEC-10 — Security headers cover the new origin.** `SecurityHeaders` middleware already exists
  (P3-8). Verify CSP does not break the site's fonts/images/video and is not loosened to `unsafe-inline`
  to make something work. Prerendered HTML must carry the same headers from Nginx.
  **Google sign-in (added at `PUB-7`) needs `script-src https://accounts.google.com` and
  `frame-src https://accounts.google.com`** — its button is Google's iframe. Missing either hides the
  Google button in production only (the dialog degrades to the emailed code, so it fails quietly).

- [ ] **SEC-11 — File uploads from the portal** (bank receipt, profile photo, CV) validate MIME +
  extension + size on the backend, store on a **private** disk with a non-guessable name, and re-encode
  images with Intervention. This is already done for mobile (P2-2, P2-3) — verify the web path hits the
  same code and add tests for it.
  **Bank receipts: done 2026-09-26** (`WebsiteBankTransferTest`, at `PUB-8`). Profile photo and CV
  still to verify when `POR-9` builds those uploads.

- [ ] **SEC-12 — Sign-in responses stay identical on every failure.** `backend/CLAUDE.md` §4: the OTP
  request endpoint returns a byte-identical 200 whether the email belongs to nobody, a blocked student
  or a deleted one. **Do not "improve" these messages for the website.** If a failure needs explaining,
  the fix is UI copy in `site/`, never a more specific API response. The same goes for wrong-code
  attempts — never reveal how many remain.

- [ ] **SEC-14 — Open redirect in the "return to" path after sign-in. ASK before upgrading.**
  Found during `FND-1` (24 Sep 2026) by `npm audit`. **`react-router` `>=6.0.0 <7.18.0` has a known
  open-redirect via a backslash in `<Link>` and `useNavigate`** — [GHSA-wrjc-x8rr-h8h6](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6),
  a bypass of CVE-2025-68470. **`web/` is on `^6.30.4` and is affected too.** The only upstream fix is
  `react-router-dom` 7.18.4, a **semver-major** upgrade across both apps — that is an **ASK**, not an
  agent decision.

  This is not theoretical here: `PUB-7` stores the path a visitor was on and navigates back to it
  after sign-in, which is exactly the sink. **Regardless of the upgrade decision, build the defence:**
  a single `safeReturnPath()` helper that accepts a stored path only if it starts with exactly one
  `/`, is not `//` or `/\`, and contains no scheme or authority — anything else falls back to `/`.
  Never pass an unvalidated `next`/`from` value to `navigate()`. The second advisory in the same audit
  (`deserializeErrors()` during SSR hydration) does **not** apply — this app does not server-render.

- [ ] **SEC-13 — Final review.** Run `/security-review` on the full branch diff. Triage every finding:
  fixed, or recorded here with a reason. Nothing is dismissed silently. Run `npm audit` in `site/`
  and record anything new.

### 7.3 Standing rules for every task in this branch

- Frontend validation is UX only. The backend is the enforcement point, every time.
- Route guards in `site/` hide UI. They are not authorization.
- Never log a sign-in code, a token, an email or any PII.
- No secrets in `site/`'s bundle. Anything in `import.meta.env.VITE_*` **is public** — treat it as
  printed on the homepage. API keys belong on the server.
- Check entitlement *before* any check that would leak whether content exists.

---

## 8. Phases

### PHASE FND — Foundation

- [x] **FND-1 — Scaffold `site/`** — done 2026-09-24.
  **Built:** `site/` with Vite 8 + React 18 + TS strict + Tailwind 4, aliases `@/` and `@shared/*`
  (plus `fs.allow` on the dev server, without which the `shared/` alias resolves but 403s), `oxlint`,
  `.env.example`, `.gitignore`, `index.html` with fallback OG/meta and the Inter + Noto Sans Sinhala
  font links. Port **5184** (web/ holds 5183) so both dev servers can run side by side. **No
  `vite-plugin-pwa`** — a service worker serving a stale page to a first-time visitor is the wrong
  trade for a site that must rank. `video.js` is split into its own `player` chunk so no marketing
  page carries it. Verified: `tsc -b` clean, `npm run build` clean (115 kB gzip entry), dev server
  serves the page and resolves `@shared/*` across the project root.
- [x] **FND-2 — Design system** — done 2026-09-24.
  **Built:** tokens in `site/src/index.css` (brand palette from `shared/src/theme/tokens.json`, plus
  `surface`/`primary-soft`/`accent-soft`, `.pb-rich-text` at reading size, `:target` scroll-margin for
  the one-page nav, `prefers-reduced-motion` honoured, Radix accordion keyframes which
  `tw-animate-css` does not ship). **Deliberately light-only, unlike `web/`** — the page is mostly
  admin-uploaded imagery shot for a light background, and flipping the surface under it is how a brand
  site ends up looking broken; the reason is recorded in the file.
  Primitives in `site/src/components/ui/`: `badge`, `card`, `skeleton`, `separator`, `label`, `avatar`,
  `dropdown-menu`, `sheet` copied verbatim from `web/`; `sonner` (light theme, not `system`);
  and four adapted, each with the reason in the file —
  - `button` — adds an `xl` size for hero CTAs and an `onSurface` variant that reads on the navy bands.
  - `input` — `h-10` not `h-8` (44px tap targets), and `text-base` under `sm` because **iOS Safari
    zooms the page when a focused input's font is under 16px**, which is what makes a mobile sign-in
    form feel broken.
  - `dialog` — **bottom sheet under `sm`, centred dialog above** (root CLAUDE.md §8). `web/` centres
    at every width because an admin is at a desk.
  - `accordion` — new; `web/` has no use for one. Carries the FAQ and the course syllabus.
  **Still to do when a page needs them:** `tabs`, `select`, `progress`. Do not copy the admin's
  dense-table primitives.
- [x] **FND-3 — App shell** — done 2026-09-24.
  **Built:** `RootLayout` (resolves the session once, above both shells, because the public header
  shows "My learning" to a signed-in student) → `PublicLayout` (sticky header, footer, and it **owns
  the sign-in dialog** because the header, a course page's Enrol button and the portal guard all open
  the same one) and `PortalLayout` (bottom tab bar under `md`, top nav above, same five destinations
  in the same order as the mobile app). Also `PublicHeader` (solid, not transparent-over-hero — the
  hero image is admin-uploaded, so nothing guarantees the logo has contrast), `PublicFooter`,
  `Logo` (bundled, not from `app-config`, so it never pops in late), `LanguageSwitcher`, `siteNav.ts`
  (nav config + the `sectionIds` the header anchors into), `Container`, `PageLoader`,
  `PlaceholderPage` (each names the task that replaces it), `ScrollManager` (hash scroll + scroll
  reset, and deliberately **not** on Back/Forward, where the browser has already restored position),
  `guards.tsx`, and the full route table with every public and portal path wired.
  Both shells and every page are `React.lazy` — see the bundle note under `FND-5`.
  **Strings:** a new `site` namespace in `shared/src/i18n/en.json` + `si.json` (26 keys, Sinhala
  drafted, appended to `docs/translations/si-review.csv` for the client). Portal tabs reuse the mobile
  app's existing keys rather than adding parallel ones.
- [ ] **FND-4 — API client + i18n + stores.** Mostly **done** in `FND-1` because the scaffold could
  not run without it:
  - `site/src/api/client.ts` — `withCredentials` + `withXSRFToken`, a de-duplicated
    `ensureCsrfCookie()`, per-request `Accept-Language`, and 401 / 419 / 429 / 5xx interceptors.
    **401 does not toast** — a signed-out visitor opening a course page 401s for entirely ordinary
    reasons.
  - `site/src/lib/i18n.ts` — EN + SI from `shared/src/i18n`, choice in `localStorage` (a UI language
    is not a credential; the §13.12 ban is about tokens), every access wrapped because
    `localStorage` throws outright with site data blocked. `languageChanged` invalidates the whole
    query cache, because titles were fetched under the old `Accept-Language`.
  - `site/src/stores/sessionStore.ts` — student record only, **no token, not persisted**.
  - `src/features/auth/hooks/useSession.ts` + `src/api/auth.api.ts` — resolves the cookie into a
    student via `GET /student/me`, once, at app start. **A 401 means "signed out", not an error**:
    it resolves the store to `null` and does not retry. This already works correctly today — with no
    session the portal guard bounces to the home page, which is the right behaviour — and needs no
    change when `API-5` lands.
  - `src/lib/safeReturnPath.ts` — **the `SEC-14` defence**, written early because the guard already
    stores an attempted path. Rejects `//host`, `/\host`, absolute URLs, control characters, and
    confirms the result against the URL parser rather than more regexes. Used by `RequireStudent`.
  **FND-4 is complete.** `PUB-7` adds the sign-in mutations on top.
- [ ] **FND-5 — Prerendering + meta tags.** Pick and wire the prerender plugin; `react-helmet-async`
  for per-route title/OG/Twitter tags. **Done when:** `curl` of the built `/` and `/courses` returns
  real HTML content.

  **Bundle budget, measured at `FND-3`:** entry **150 kB gzip** (was 188 kB before both shells were
  made lazy — they were being imported eagerly, which defeated the splitting). The remaining entry is
  react + router + query + axios + i18next + zustand + sonner, plus **both locale files: `en.json`
  26 kB and `si.json` 49 kB raw, ~18 kB gzip together.** Deferring `si.json` behind a dynamic import
  (load English eagerly, fetch Sinhala when chosen) saves roughly 12 kB gzip for the English-speaking
  majority. It was left out of `FND-3` on purpose — it makes i18n init async and risks a flash of
  English for a Sinhala visitor — but **do it as part of this task**, because it is far harder to
  retrofit once every module imports from `lib/i18n`.
- [x] **FND-6 — Docs corrected** — done 2026-09-24. Brought forward from its place in the phase
  because the stale lines were actively dangerous: a new chat reads root `CLAUDE.md` first and would
  have built the website inside `web/`.
  **Built:** root `CLAUDE.md` §1 (three clients, not two), §2 (layout + why `web/` and `site/` are
  separate), §4 "Web — the admin panel" (was "Single App, Multiple Roles"; the `marketing`/`student`
  roles are gone and the file now says explicitly not to add them back), §4.12 and §16 (three
  clients; the student portal adds no endpoints, but the anonymous catalogue needs its own under
  `/api/v1/public/*`), §17 pointer. New `site/CLAUDE.md`.

### PHASE API — Backend

- [ ] **API-1 — Public route file + resources.** `routes/api_public.php` under `/api/v1/public`, no
  auth, registered in `bootstrap/app.php` beside the student group. Own Resources in
  `app/Http/Resources/Public/`. Named IP rate limiters. Ties to **SEC-2**.
- [~] **API-2 — Public catalog endpoints.** Partly done.
  - [x] **`GET public/courses` — DONE 2026-09-25.** Paginated, with `search` (course name OR topic
    title, both scripts, LIKE wildcards escaped) and `category_id` (a parent means itself plus its
    sub-categories). `PublicCourseService` + `PublicCourseSummaryResource`. **Its own Service, not a
    nullable-`Student` branch in `StudentCourseService`** — that one joins enrolment, wishlist and
    progress onto every row, and making the student optional there is one forgotten null check away
    from handing a stranger another student's state. Visibility is stricter here too, deliberately: a
    student keeps a course whose category was switched off because they paid for it; a visitor has no
    such claim, so the category rule is absolute.
    - `per_page` is capped at `PublicCourseService::MAX_PER_PAGE` (48) in **both** the Form Request
      and the Service. An unbounded page on an open endpoint is a free way to make the server
      assemble the whole catalogue on demand.
    - `category_id` is **not** validated with `exists:` — a 422 would let a stranger enumerate which
      category ids exist. An unknown id matches nothing, which leaks nothing.
    - `excerpt` is **plain text**, flattened server-side by `PlainText::excerptFromHtml()`. The stored
      description is admin-authored HTML; sending the markup would force the public card to render it
      with DOMPurify to produce two clamped lines. Flattened text cannot be an injection surface at
      all. The full HTML belongs on the detail endpoint, where the sanitiser is worth it.
    - Ordering is `category → sort_order → id`, **not** `published_at desc`. Plan B's courses are a
      sequence ("Course 1, Course 2…") and newest-first would present step four before step one.
  - [x] **`GET public/course-categories` — DONE 2026-09-26** (with `PUB-3`). Only categories holding a
    visible course, with counts; see `PUB-3`.
  - [x] **`price` and `sort` on `GET public/courses` — DONE 2026-09-26** (with `PUB-3`).
  - [x] **`GET public/courses/{id}` — DONE 2026-09-26** (with `PUB-4`). Parameter is `{id}`, not
    `{course}` — see `PUB-4`.
  - [x] **`GET public/course-categories/{id}` — DONE 2026-09-26** (with `PUB-5`).
  - [ ] `GET public/services`,
    `GET public/services/{service}`. Published-only scoping in the query, per `backend/CLAUDE.md` §2.
    **Do not register a global `Route::bind` — it would filter the admin routes too.** That trap is
    documented at the top of `routes/api_student.php`; re-read it.
- [ ] **API-3 — Public site content endpoint.** `GET public/site-content` returns visible sections in
  admin order with their resolved content, plus vision/mission/about/contact. One request — the
  homepage must not make twelve.
- [ ] **API-4 — Slugs for course and category URLs.** `/courses/:slug` needs a stable unique slug
  column. **ASK** before the migration. Keep numeric-id URLs working as a redirect.
- [x] **API-5 — Student web session.** — done 2026-09-26. As specified in §2.3. Paired with **SEC-1**.
  **Built:** `student-web` session guard (`students` provider; **nothing** added to `sanctum.guard`);
  `WebSessionController` with `auth/session/verify-code`, `auth/session/google`, `auth/session/logout`;
  `StudentAuthService` split into `authenticateWithCode()` / `authenticateWithGoogle()` (verify, no
  credential) so the token and session paths share one set of checks — mobile's behaviour is
  unchanged. Student routes are `auth:student-web,student` (order matters — see the §2.3 correction);
  `refresh`/`logout` stay token-only. `remember: false` because `students` has no `remember_token`
  by design; the session lives `SESSION_LIFETIME` (480 min locally), sliding. Session sign-ins answer
  **400 before the code is checked** when the request is not stateful, so a script cannot burn a code.
  10 endpoint tests in `StudentWebSessionTest`. Verified live with curl against the local API: CSRF
  missing → 419, non-website → 400, session cookie `HttpOnly`, admin route 401, refresh 401, replay
  from another origin 401, logout → 401 after. Full suite 684 passing, Pint clean.

### PHASE CMS — Website content

- [x] **CMS-0 — Website Configuration (hero slider · About video · team). DONE 2026-09-25.**
  The client asked for these three first, so they shipped as their own slice ahead of the general
  section builder. Approved schema, migrated:
  - `site_hero_slides` — eyebrow/heading/body (+`_si`), two buttons (label +`_si`, target, course id,
    url), two stat pairs, `icon`, `sort_order`, `is_visible`; artwork via Media Library at
    **1200×900 (4:3)**. **Not `home_banners`** — that is the mobile app's 64:27 carousel with one
    headline and one tap target, and sharing a table would leave half the columns null for whichever
    client was not being edited. The rationale is in the migration's docblock.
  - `team_members` — `name`, `role`, `role_si`, `sort_order`, `is_visible`; photo via Media Library
    at **800×1000 (4:5), cropped from the top** so a head-and-shoulders photo keeps the head. No
    `name_si`: a person's name is not translated.
  - `company_settings` extended with ten `community_*` columns + a `community_poster` collection.
  - **Button destinations are `App\Enums\SiteLinkTarget`, a fixed nine-case list — never a typed
    path.** `site/src/features/marketing/siteLinks.ts` is the exhaustive `Record` that resolves them,
    and is the `SEC-5` / open-redirect boundary for links. `heroIcons.ts` is the same for icons.
  - **The About video is a YouTube link, not an upload** (client decision). Validated three times and
    each for a different reason: `App\Support\YouTube` on write protects the database,
    `@shared/lib/youtube` protects the visitor before an iframe exists, and the admin form uses the
    shared parser to warn before saving. `site/src/lib/youtube.ts` **moved to
    `shared/src/lib/youtube.ts`** so the admin panel and the website cannot drift.
  - `GET api/v1/public/site-content` serves all three, with `routes/api_public.php`, the
    `public-site` IP rate limiter and **its own Resources in `app/Http/Resources/Public/`** — that
    separation is load-bearing here, because `company_settings` also holds Plan B's bank account.
    A test asserts the account number never appears in the response.
  - The website **falls back to designed defaults** for the hero and About band when the admin has
    published nothing, and shows `TeamSection`'s own empty state for the team. `WebsiteContentSeeder`
    puts the same copy in the database locally, so the admin panel opens with something to edit.
- [ ] **CMS-1 — The remaining schema. ASK the user before migrating.** Proposed:
  - `site_sections` — `type` (string-backed PHP enum), `sort_order`, `is_visible`, `heading`,
    `heading_si`, `body`, `body_si`, `settings` (json), timestamps.
  - `success_stories` — `student_name`, `role`, `role_si`, `year`, `quote`, `quote_si`, `body`,
    `body_si`, `results` (json — 2–3 short outcome strings), `video_url`, `video_duration_label`,
    `sort_order`, `is_visible`; student photo **and** video poster via Media Library.
    **`video_url` is stored as the admin pasted it and is parsed and validated on the client by
    `lib/youtube.ts` before it reaches an iframe.** Validate it server-side too, in the Form Request,
    against the same host allowlist — the client check protects the visitor, not the database.
  - `testimonials` — `author_name`, `author_role`, `quote`, `quote_si`, `rating`, `sort_order`,
    `is_visible`, photo via Media Library.
  - `faqs` — `question`, `question_si`, `answer`, `answer_si`, `sort_order`, `is_visible`.
  - **Extend the existing `company_settings` singleton** for vision, mission, about, contact details
    and social links — rather than adding a second settings table. `CMS-0` already did this for the
    About band; follow the same `community_*` naming and add the new fields to
    `UpdateWebsiteContentRequest` and `PublicCommunityResource` (never to the admin Resource alone —
    the public one names what it sends on purpose).
- [ ] **CMS-2 — Section types + per-type Zod/Form Request schemas.** Hero · Stats · Course Categories ·
  Featured Courses · Why Plan B · Vision & Mission · Success Stories · Testimonials · Premium Services ·
  CTA Banner · FAQ · Contact. Ties to **SEC-5**.
- [ ] **CMS-3 — Admin UI: homepage builder.** The **Website Configuration** sidebar group already
  exists (`CMS-0`) with Hero Slider, About Video and The Team — add the section builder to it rather
  than creating a second group. Drag-to-reorder list of
  sections with show/hide, and an edit panel per section. Follow the Sectioned Admin Forms pattern and
  the repeatable-row conventions in root `CLAUDE.md` §8 — collapsible cards, explicit up/down buttons,
  `client_key` per row, position in the array *is* `sort_order`.
- [ ] **CMS-4 — Admin UI: Success Stories, Testimonials, FAQs.** Standard compact admin list pages —
  `FilterCard`, staged filters, `RowActions`, sticky header. Reuse the pattern exactly; do not reinvent it.
- [ ] **CMS-5 — Admin UI: Vision / Mission / About / Contact.** A settings page on the existing
  `company_settings` record.

### PHASE PUB — Public website

- [ ] **PUB-1 — Section renderer + the 12 section components.** Fixed registry (**SEC-5**), each
  section responsive and each with a sensible empty state for when the admin has not filled it in.

  **Three sections are already designed and built** (2026-09-24), from the client's reference PDF
  (`innovativeminds.lk`) — structure and density taken from it, **palette ignored**, because that
  site's green is not Plan B's. They live in `site/src/features/marketing/components/` and each takes
  its content **and its anchor id as props**, so the registry can drive them without a rewrite:
  - `HeroSlider` — copy and CTAs left, artwork right, per the client's instruction.
  - `HeroHighlights` — the reassurance strip that straddles the hero and the page below it.
  - `ProgrammesSection` + `ProgrammeCard` — "Our **Programmes**". The card is written to be reused
    verbatim by `PUB-3`'s catalogue; do not write a second one.
  - `CommunitySection` — About Us, in the reference's "Join 500+ Students" treatment. **Its right
    column is a video**, not a photograph (client instruction, 2026-09-25), through the same
    `YouTubeFacade`. The "Enrolment open now" pill still overhangs it and is `pointer-events-none`,
    so it cannot punch a dead spot in the play button underneath. **The four numbered proof cards
    were removed** at the client's request, along with their `points` data — the column is now a
    chip, heading, paragraph and one CTA. Do not reinstate them without asking. The band's
    background is a **gradient**: its existing tint at the top, held through the upper half by
    `via-muted/30`, fading to `to-background` at the bottom (never `to-white` — it has to resolve to
    whatever surface the page is using).
  - `SuccessStorySection` — **video testimonial**, added 2026-09-25. Navy band, video left / story
    right, deliberately reversing the two text-left bands above it. A real `<blockquote>`/`<cite>`,
    the student's photo, role and year, a short prose paragraph and outcome chips. Renders one story
    but takes an array, so `CMS-4` adds more without a rewrite; it degrades to a designed panel when
    no video link is set rather than collapsing the grid.

    > **HIDDEN ON THE HOME PAGE SINCE 2026-09-25** (client instruction). The component and its data
    > are complete and deliberately **kept, not deleted** — `CMS-3` turns section visibility into an
    > admin setting, at which point this becomes a toggle rather than a code change. Until then it
    > is unrendered.
    >
    > **Re-enabling is four edits, not one**, and each site is marked in place: render it in
    > `HomePage.tsx`; restore the `successStories` entry in `publicNav` (`siteNav.ts`); point the
    > testimonials CTA back at `/#success-stories` and revert `site.testimonials.cta` to "Read
    > success stories"; restore the hero's second-slide `secondaryCta` in `homeContent.ts`. Miss any
    > of the last three and you ship a link that scrolls nowhere.

  - `TestimonialsSection` — **the face wall**, added 2026-09-25, built to a client-supplied image.
    A canopy of portrait cards above centred copy; hovering, tapping or tab-focusing a face opens
    that person's quote in a popover. See the notes below.

  - `TeamSection` — **Our Team**, added 2026-09-25 to a client image, **replacing the FAQ section**
    (which is gone: its `sectionIds.faq`, its `site.nav.faq` string and its footer link were all
    removed). A paged carousel of portrait cards, each with a white name plate floating over the
    bottom of the photograph. See the notes below.

  Supporting shared pieces: `SectionHeading`, `EmptyState`, `Highlight`, `YouTubeFacade`, `popover`.

  **Still to design:** Stats, Why Plan B, Premium Services, CTA banner, Contact.
  The client is supplying a UI guide for these — **ask for it rather than inventing one.** Their
  anchors already exist on the home page as labelled placeholders.

  ### Success story video — decisions and the security boundary

  **Hosting is YouTube, loaded on click** (client decision, 2026-09-25). Bunny Stream was the
  alternative and was declined on cost/effort; serving the MP4 ourselves was ruled out because
  `docs/bunny-stream-setup.md` records that it took the whole API down at ~30 concurrent viewers.

  - **`components/shared/YouTubeFacade.tsx` renders a poster and a button, never an iframe, until
    it is clicked.** A plain embed costs ~1 MB of Google JavaScript and its cookies **on page load**
    for every visitor, most of whom never press play. The iframe points at
    `youtube-nocookie.com`; hover/focus preconnects so the click is not also paying for the
    handshake. The poster falls back to `i.ytimg.com`, which is Google's **cookieless** static host
    — an IP is revealed, no cookie is set, no script runs.
  - **`lib/youtube.ts` `youTubeVideoId()` is a security boundary, not a convenience.** Its output is
    interpolated into an `<iframe src>`, so admin input reaches an origin the browser executes. Two
    rules, neither of which may be loosened to support a new link format:
    1. **Hostname is matched against an exact `Set`, never `includes`** — `url.includes('youtube.com')`
       happily accepts `https://youtube.com.attacker.net/…`.
    2. **The extracted id is re-tested against `/^[A-Za-z0-9_-]{11}$/`** before being returned, so
       even a parsing bug cannot emit anything that closes the attribute or changes the path.
    Verified against 19 cases including `javascript:`, `data:`, quote-breakout, path traversal and
    three hostname-confusion attacks — all rejected.
  - **`SEC-10` must allow `frame-src https://www.youtube-nocookie.com` and
    `img-src https://i.ytimg.com`** when the CSP lands, or this renders an empty box in production
    only. There is no CSP today (deliberately — see `SecurityHeaders`, the PayHere hand-off page).
  - **The privacy policy needs a line about YouTube**, since playing sets Google cookies. Add it with
    `P1-4`'s legal pages.
  - **`CMS-1`'s `success_stories` table needs more columns than originally proposed**: `video_url`,
    `video_duration_label`, a poster via Media Library, and `*_si` siblings for `headline`, `quote`
    and `body`. Update the proposed migration before it runs.

  ### Testimonial wall — notes

  - **`@radix-ui/react-popover` was added to `site/`** (2026-09-25). Not a new library: it is a
    shadcn/ui primitive, which is the approved stack, and `web/` already depends on the same major
    version. `site/src/components/ui/popover.tsx` is the standard wrapper.
  - **The popup opens on hover, tap AND keyboard focus.** Hover does not exist on touch, so a
    hover-only reveal is a feature a phone user can never trigger. This also satisfies WCAG 2.1
    §1.4.13: dismissible (Escape, via Radix), **hoverable** (a close delay plus pointer handlers on
    the popover itself, so travelling from card to popup does not dismiss it) and persistent.
  - **Click always opens, never toggles closed.** Radix's trigger toggles by default, which on a
    mouse — where hover has already opened the popup — would make clicking a card close the thing
    the click was asking for. The trigger's `onClick` prevents default when already open.
  - **`pointerType === 'mouse'` gates the hover handlers.** Touch fires `pointerenter` immediately
    before `click`, so without the guard a tap opens and then instantly re-toggles.
  - **Card positions are authored data, transcribed from the client's reference image** — not
    computed and not random. A formula produces a mechanical smile; `Math.random()` would reshuffle
    the wall on every render and disagree with itself between the prerender pass (`FND-5`) and the
    browser.

    The arrangement is **nine columns on an even 10.85% pitch**: the outer two on each side hold a
    *stacked pair*, the five middle columns hold one card each at *alternating* heights — low, high,
    low, high, low — which is what gives the band its rhythm rather than a smooth arc. Cards are
    **9.9% wide and 4:5 portrait**, leaving a gap under 1%. At a 1280px viewport that is a
    **120×150px card with an 11.6px gap**.

    **Every card is upright and the same size** (client instruction, 2026-09-25). There is no
    `rotate` and no `scale` on the type, and no `transform` on the element. Do not reintroduce a
    tilt "for character" — it was explicitly rejected.

    **Use an even column pitch, not per-card eyeball measurements.** Transcribing each column's
    x-position individually from the reference carried about 1% of noise, which showed up as gaps
    ranging from 2px to 19px — visibly irregular against a design whose spacing is uniform. The
    y-positions still come from the image; only the horizontal pitch is regularised.
  - **`x` and `y` are BOTH percentages of the field's width**, and `TESTIMONIAL_FIELD_ASPECT` fixes
    the field's height as a fraction of its width via the `height: 0` + `padding-bottom` trick (a
    percentage padding resolves against the containing block's *width*; a percentage `height` would
    resolve against its height). Measuring both axes against one dimension is the only way to
    transcribe a reference image without the proportions drifting as the window widens — the
    component divides `y` by the aspect to get the height-relative `top` that CSS wants.
  - **The canopy shares the page `Container` with every other section** (client decision,
    2026-09-25). It spans exactly the width of the Programmes grid and the About band, so the page
    keeps one left and right edge all the way down. Nothing is clipped — the rightmost card edge
    lands at 97.6%. The reference's full-bleed, cut-off look was explicitly declined in favour of
    that alignment; switching back is a matter of moving the field outside `Container`.
  - **A card must never set its own width.** The wrapper owns it — a percentage in the canopy, a
    fixed size in the mobile strip. A width on the card itself overrides the canopy's percentage and
    flattens the whole arrangement.
  - **Below `lg` the canopy is replaced by a snap-scrolling strip.** Thirteen overlapping rotated
    cards cannot shrink into 360px without becoming a pile or postage stamps.
  - **Do not put `aria-hidden` on either the canopy or the strip.** They render the same thirteen
    people, but `hidden`/`lg:hidden` apply `display: none`, which already removes the inactive one
    from the accessibility tree. `aria-hidden` would instead leave thirteen focusable buttons hidden
    from screen readers — the "focusable but hidden" fault.
  - **This section is nothing without real photographs.** The initials-on-navy fallback is a holding
    pattern; `CMS-4` needs a photo per testimonial and the client needs to supply them.
  - **Two-line headings use two fields here, unlike the gold-accent headings.** The inline `**marker**`
    convention exists because word order shifts in Sinhala; these are two separate lines, so a
    translator can take each on its own.

  ### Our Team — notes

  - **The depth in the client's reference comes from one thing: the white name plate is a separate
    surface floating over the photograph and hanging past its bottom edge**, with its own shadow. It
    is not a caption inside the card and not a gradient overlay. The plate's `translate-y-1/2` and
    the track's `pb-16` must stay in step — reduce the padding and the overhang is clipped by the
    scroll container.
  - **The plate is positioned against the `<article>`, not the card**, so the card's hover lift does
    not carry it. It travels the same 4px itself, or a gap opens between the two on hover.
  - **The carousel is native scroll-snap, not a transform carousel.** The browser supplies touch
    swiping, trackpad gestures, keyboard scrolling and momentum for free, and there is no transform
    to fight on resize. The component only adds dots.
  - **The dots read their state off `scrollLeft`; they do not own an index.** An index-driven
    carousel silently desynchronises the moment someone drags the strip directly.
  - **Position is mapped proportionally across the scroll range, not by dividing `scrollLeft` by one
    container width.** On a phone the cards are 85% wide so the next one peeks, which means a page
    is not a whole container width and the naive division drifts a dot out of step by the end of the
    strip. `goToPage` uses the exact inverse of that mapping, so a dot scrolls to precisely where
    that dot lights up.
  - **Pages are measured, never configured.** Add a breakpoint to the `basis` list and the dot count
    follows on its own.
  - **Five across with a HALF CARD showing at the edge** (client instruction, 2026-09-25). The half
    is the point, not a rounding artefact: a row that ends flush at the container edge looks
    finished and nobody scrolls it, so a card sliced by the edge is the only honest signal that
    there is more to the right.

    Each breakpoint therefore shows `N.5` cards, which means `N` gaps between them, so the width is
    **`(100% − N×gap) / N.5`** — 1.5 / 2.5 / 3.5 / 5.5 across as the viewport grows. **These are
    derived from the gap, not independent numbers**: change `gap-4` and every one of the four
    `basis` values has to be recomputed or the peek stops being half a card. Card size stays roughly
    constant (~207–228px) across all four; only the count changes.
  - **The placeholder team is nine people, not six.** At 5.5 visible, six would leave half a card of
    travel and two dots, so the affordance the half card exists to provide would be advertising
    almost nothing. The real team is whatever size it is; nine only makes the component
    demonstrable.
  - **`CMS-4` needs a `team_members` table** — `name`, `role`, `role_si`, `sort_order`, `is_visible`
    and a photo via Media Library. Sinhala gets a sibling column for `role` only: a person's name is
    not translated.
  - **This section needs real photographs**, like the testimonial wall. Initials on navy is a holding
    pattern.

  ### Floating WhatsApp button

  - `components/shared/WhatsAppButton.tsx`, mounted by `PublicLayout` — **public pages only**. The
    portal has a bottom tab bar under `md` that it would sit on top of.
  - **It is an `<a>`, not a button.** One `wa.me` URL opens the app on a phone and WhatsApp Web on a
    desktop, so no platform detection is needed, it works without JavaScript, and middle-click and
    "open in new tab" behave normally.
  - **`--whatsapp` is not a fourth palette colour.** Root CLAUDE.md §8 caps us at one accent plus
    three semantic colours; this breaks none of it because the green is never used for anything of
    ours. It exists so the control is recognised without being read. Do not reuse it elsewhere.
  - **The animation is staged, not constant**: it arrives ~1.4s in so it does not compete with the
    hero, then two *staggered* rings pulse (one ring throbs, two offset rings sweep), and the label
    slides out on hover **and on keyboard focus**. `prefers-reduced-motion` removes the rings and the
    entrance outright — a permanently pulsing element fixed to a corner is close to the worst case
    for motion sensitivity, because it cannot be scrolled away from.
  - `z-40`, below Radix's `z-50` overlays, so a dialog covers it instead of a green circle floating
    over its own backdrop.
  - **Contact details live in `lib/siteContact.ts`**, read by both this button and the footer, so a
    changed number cannot update in one and not the other. `whatsappNumber` is stored **digits only,
    pre-normalised** — `wa.me` fails silently on a `+` or a space, which looks like a broken button
    rather than a bad URL. `CMS-5` replaces the module with `company_settings`.

  ### Header nav

  Six items is the ceiling. As of 2026-09-25 there are five, in this client-set order:

  **Home · About Us · Courses · Our Values · The Team**

  - **`key` is structural, the label is the client's wording.** `testimonials` and `team` are what
    the sections *are*; "Our Values" and "The Team" are what they are *called* this week. Renaming
    the keys to chase the copy would mean renaming section ids and anchors every time a word
    changes. The label is `site.nav.<key>` in `shared/src/i18n`.
  - **The section chip follows the nav label**, because `TestimonialsSection` looks up the same key
    — so the menu and the section it scrolls to cannot disagree.
  - **Three deliberate absences**, all client instructions and all documented in `siteNav.ts`:
    *Services* (a signed-in feature; lives at `/app/services`, and the public `/services` route
    still resolves for a direct link but is no longer promoted), *Contact* (the footer *is* the
    contact section — it owns `sectionIds.contact` and carries the address, phone and email, and the
    WhatsApp button is now the primary way to start a conversation), and *Success stories* (hidden).
  - Footer quick links are generated from `publicNav`, so anything dropped from the header
    disappears there too — Contact is re-added to the footer explicitly for that reason.

  ### Footer

  Tightened on 2026-09-25. **`min-h-11` on `FooterLink` and `ContactRow` is not negotiable when
  tightening further** — it is the 44px tap target root CLAUDE.md §8 requires, and the one piece of
  spacing in that file that is a requirement rather than taste. The `sm:` overrides drop it to a
  compact row from tablet up, where a pointer does not need the margin for error.

  **`Highlight` and the `**marked**` convention are load-bearing.** A heading marks its gold word
  inline (`Our **Programmes**`) instead of splitting into a second `heading_accent` column, because
  Sinhala does not put the emphasised word in the same position as English and a fixed
  "plain-then-accent" order would force a translator into an ungrammatical sentence. It is **not**
  Markdown and must never become Markdown — it splits plain text and hands React an array, so there
  is no `dangerouslySetInnerHTML` and no sanitiser needed. `CMS-2`'s heading fields must document the
  convention for the admin.

  **Use `accent-strong` (`#a3761f`), not `accent`, for gold TEXT on a light background.** Plan B's
  `#c79a3a` is 2.8:1 on white — under even the 3:1 WCAG AA allows for large text. On the navy
  `surface` the plain accent is 6.3:1 and is correct. The token and the reasoning are in `index.css`.
- [ ] **PUB-2 — Home page.** Assembles the renderer from `public/site-content`. Header nav scrolls to
  sections. Sticky header, mobile drawer nav. The page currently composes the four built sections in
  a fixed order in `HomePage.tsx`; this task replaces that list with the registry.
- [x] **PUB-3 — Courses catalog.** — done 2026-09-26. Search, category/bundle filter, price filter,
  sort, pagination. Skeletons. Empty state.
  **Backend:** `price` (`free`/`paid`) and `sort` (`recommended`/`newest`/`price_asc`/`price_desc`)
  on `GET public/courses` — closed lists in the Form Request, mapped to fixed ORDER BYs in
  `PublicCourseService::applySort()`, every one ending on `id` so paging is stable. New
  `GET public/course-categories` (from API-2's list) + `PublicCourseCategoryResource`: only categories
  holding a visible course, with counts. List and counts share one `visibleCourses()` builder so they
  cannot disagree. 9 new tests (price, each sort, 422 on unknown values, stable paging on ties,
  category tree/counts/hiding/fields/language).
  **Site:** `features/catalogue/` — `CoursesPage` (navy header band with the search box, category
  chips with a sub-category row, Free/Paid segmented control, sort select, result count, 1/2/3/4-column
  grid of the home page's `ProgrammeCard`, numbered pagination collapsing to "Page 2 of 5" on a
  phone). **Filters live in the URL** (`?q=&category=&price=&sort=&page=`) so a filtered view is
  shareable; every value is re-validated client-side against the same closed lists. Search is
  debounced 400 ms, Enter searches immediately. `keepPreviousData` dims the old grid instead of
  flashing skeletons. A signed-in student sees **Enrolled** on their own courses (from their own
  `student/courses`, presentation only). Helmet title/description/OG/canonical. `ProgrammeCard`'s
  hard-coded "Free", "In a bundle", "View details" and lesson count now go through `t()`, and it takes
  an optional `badge`. Added `components/ui/select.tsx` (copied from `web/`, `h-10` trigger).
  Fixed `ScrollManager` jumping to the top when only the navigation *type* changed on the same path
  (a paging push followed by a filter replace). 27 new i18n keys EN+SI.
  **Not done:** "bundle" filtering — bundles are categories, so the category chips cover it; a
  dedicated bundle page is `PUB-5`. Course cards link to `/courses/:id`, still `PUB-4`'s placeholder.
- [x] **PUB-4 — Course detail.** — done 2026-09-26. Syllabus accordion, what's included, price,
  ratings if present, related courses, OG tags. "Enrol" → sign-in dialog if signed out, then checkout.
  **Client decisions (2026-09-26):** (1) **No ratings, reviews or learner count** — mobile's are
  invented sample numbers (`courseSocialProof.ts`), and on a public page fake reviews are a trust and
  consumer-protection risk; they return when a real reviews feature exists. (2) **Numeric URLs**
  (`/courses/12`) for now; readable slugs stay `API-4`. (3) **Enrol while signed out opens sign-in and
  returns to the course page** — it never enrols or opens checkout on a click made before sign-in.
  **Backend:** `GET public/courses/{id}` + `PublicCourseDetailResource` (composed from the summary
  Resource so card and page cannot disagree). Syllabus is titles and durations only; `assessment` is a
  question count; `bundle` carries the list price. **Route parameter is `{id}` on purpose** — the
  student routes' global `Route::bind('course')` checks "published" only and would bypass the
  visitor's category rule; a test fails if that ever happens. 404s carry one fixed message: the
  default `findOrFail` message names the model class and echoes the id, and Laravel keeps an HTTP
  exception's message with debug off. 10 tests.
  **Site:** `features/catalogue/pages/CourseDetailPage.tsx` — navy band (breadcrumb Courses ›
  category, title, excerpt, length/lessons/topics, Share: native share sheet or copy link), About
  (plain text, line breaks kept, no HTML), `CourseSyllabus` (Radix accordion, first topic open,
  expand/collapse all, per-lesson durations), related courses (same category, up to 4, the shared
  `ProgrammeCard`). `CourseEnrolCard` — sticky on a laptop, pulled over the band; right under the
  header on a phone — decides in order: enrolled → "Go to course"; bundle-only → bundle + list price
  → `/bundles/:id`; paid with payments off → "Coming soon · price", disabled; else Enrol (free:
  enrol then open it in the portal; paid: server creates the order → `/checkout/:orderId`).
  `payments_enabled` is read from `student/app-config`; anything but `true` counts as off. Pages
  open sign-in through `useSignInDialog()` — `PublicLayout` now passes `openSignIn(returnTo)` as
  outlet context. Helmet title, description, OG image and canonical. 21 i18n keys EN+SI.
  **Leads to placeholders still:** `/checkout/:orderId` (`PUB-8`), `/bundles/:id` (`PUB-5`),
  `/app/courses/:id` (`POR-3`). Locally every seeded course is bundle-only, so the Enrol path is only
  reachable with a free or individually-sold course.
- [x] **PUB-5 — Bundle detail** — done 2026-09-26. Same shape, listing the courses in the bundle.
  **Backend:** `GET public/course-categories/{id}` (`{id}`, not `{category}` — same binder rule as
  `PUB-4`) + `PublicCategoryDetailResource`. For a category that is its own bundle, `courses` is
  exactly `bundleCategoryIds()` — what the button buys; otherwise the category and its
  sub-categories. `bundle` carries the owner's id and **list price**; `children` flags `own_bundle`
  (sold separately → linked, not listed). No student state; hidden or unknown → one fixed 404.
  8 tests.
  **Site:** `features/catalogue/pages/BundlePage.tsx` — navy band (breadcrumb, "Course bundle"
  badge, courses/lessons/length), courses grouped by sub-category as on mobile, "Also sold as
  separate bundles" links, and `BundleBuyCard`. **Two prices, never mixed:** signed out, the list
  price plus "you only pay for courses you don't own yet"; signed in, the student's own quote from
  `student/course-categories/{id}` (their remaining price, owned count, `is_available`) and
  "Enrolled" badges on what they own. Actions: owns everything → "Go to my courses"; payments off →
  "Coming soon · price"; signed out → sign-in, back to this page; signed in → `POST
  student/course-categories/{id}/purchase` → free remainder enrolled on the spot (→ My courses),
  otherwise `/checkout/:orderId`. **Redirects:** a category not sold as a bundle →
  `/courses?category=id`; a sub-category following its main bundle → the main bundle's page, so a
  bundle is only ever bought from the page listing it. 11 i18n keys EN+SI.
  Locally, "UAE Programs" (id 8) is the one bundle: 5 courses, LKR 10,450 — the listed prices sum to
  exactly the bundle price. **Checkout (`PUB-8`) is still a placeholder.**
- [ ] **PUB-6 — Services page.**
- [x] **PUB-7 — Sign-in dialog.** — done 2026-09-26. Email OTP + Google. ~~Returns the visitor to
  exactly where they were~~ **Lands on the portal** (§1 "Where sign-in lands"), or on the `/app/*`
  page a bounced deep link was heading for. UI copy carries the explanation **SEC-12** forbids the API
  from giving.
  **Built:** `features/auth/components/SignInDialog.tsx` — email step (RHF + the shared
  `requestCodeSchema`, validated on blur) → code step (one `autocomplete="one-time-code"` input,
  auto-submits on the sixth digit, guarded against double submission, resend countdown from the
  server's `resend_after_seconds`, "use a different email", spam-folder hint). Wrong/expired/unknown
  all show one message; only a suspended account (403) is named. 419/429/5xx are left to the client
  interceptor's toast rather than being reported as "wrong code".
  **Google:** `GoogleSignInButton` + `googleIdentity.ts` — **Google Identity Services, loaded as a
  script from `accounts.google.com` on first open**, because the backend verifies an ID token and GIS
  is the only thing that gives a web page one; Google does not publish it to npm, so no package was
  added. Hidden when `VITE_GOOGLE_CLIENT_ID` is unset or the script is blocked. Needs a CSP allowance
  at `SEC-10`, the Web client id in the backend's `GOOGLE_CLIENT_IDS`, and the site origin as an
  Authorised JavaScript origin in Google Cloud.
  **The dialog is lazy-loaded on first open** — it brings React Hook Form and Zod, which every
  marketing visitor would otherwise download. `PublicLayout` chunk 37.9 → **6.4 kB gzip**, entry
  144.6 → **117 kB gzip**.
  **Not yet:** a course page's "Enrol" button opening the dialog with its own `returnTo` — that is
  `PUB-4`'s, and the `returnTo` prop is already there for it.
- [~] **PUB-8 — Checkout.** Card (hosted redirect) + bank transfer with receipt upload. Respects
  `payments_enabled`. See §5 and §6.
  - [x] **Bank transfer — DONE 2026-09-26.** Card is out of scope for now (client instruction,
    2026-09-26) and **not shown at all** — no greyed-out option. `features/checkout/`:
    `CheckoutPage` (in the public shell, but needs a signed-in student: signed out → a sign-in prompt
    that returns here; not theirs / unknown → "Order not found"; `noindex`), `OrderSummaryCard`
    (artwork, type, order number, a bundle's frozen items, total, status — visible in every state), a
    panel per order state (paid → Start learning / My courses / My service; awaiting verification →
    Check status; cancelled/refunded → can't be paid; payable → newest rejection remark + the form),
    and `BankTransferPanel`: step 1 amount + account with **copy buttons** for name and number and
    the admin's notes; step 2 reference (shared `bankTransferSchema`, on blur) + a click-or-drag
    **dropzone** checking type and size before upload, image thumbnail via an object URL that is
    revoked. Multipart `File` upload, 60s timeout, no amount sent. The order refetches on tab focus,
    so a student returning from their banking app sees the current status.
    **`SEC-11` web path proven:** `tests/Feature/Payment/WebsiteBankTransferTest.php` — a real website
    session uploads a slip; it is re-encoded, stored on the private disk under a random name, the order
    goes to `awaiting_verification`; a disguised HTML "jpg" and a bad reference 422; another student's
    order is refused; no session is 401. Also verified live against the local API end to end (sign in →
    bundle purchase → order → bank details → multipart upload → awaiting verification).
    23 i18n keys EN+SI.
  - [ ] **Card** — later. The mobile card flow (`useCheckout`, hosted redirect, polling) is the model;
    the landing route is `PUB-9`.
- [ ] **PUB-9 — Payment return landing.** Polls the order. Reads nothing from the URL.

### PHASE POR — Student portal

Mirrors `mobile/app/`. Read the matching mobile screen before building each one — the logic is already
written and worth reusing rather than re-deriving.

- [x] **POR-1 — Portal shell + auth guard + session bootstrap.** — done 2026-09-26. The shell, guard
  and bootstrap existed from `FND-3`/`FND-4`; this added the missing pieces.
  **Built:** **Sign out** in the account menu (`useSignOut`) — local state and the **whole query
  cache** are cleared whether or not the request succeeds, so a shared computer never shows the last
  student's data. The guard's bounce now **opens the sign-in dialog** (`PublicLayout` reads
  `state.from`, validates it with `safeReturnPath`, then drops it from history so a refresh does not
  reopen it). `sessionStore.signOut()` vs `clear()`: pressing Sign out sends the student home
  *without* re-offering sign-in; an expired session mid-visit does re-offer it and returns them.
- [x] **POR-2 — Portal home.** — done 2026-09-26. Continue learning, progress summary, banners.
  **Built:** `features/portal/pages/PortalHomePage.tsx` — greeting, three stat tiles (courses
  enrolled, lessons watched, checklist %), `ContinueLearningCard` (navy hero; same next-course rule
  as mobile's card), `MyCoursesCard` (up to four enrolled, in progress first), `ChecklistSummaryCard`,
  `AnnouncementsStrip` (the app's `home-banners`, scroll-snap, links resolved by an exhaustive
  `switch` over the server's link union; `url` must be http/https and renders as a real `<a>`).
  Three requests, the same endpoints mobile uses, under `features/portal/queries.ts` keys that
  `POR-3`/`POR-7` will share. Each block loads and fails on its own, with skeletons. Two-thirds /
  one-third on a laptop, one column on a phone. Added `components/ui/progress.tsx` (shadcn, from
  FND-2's "when a page needs it" list). **Links to `/app/courses/:id` still land on `POR-3`'s
  placeholder** — that page is next.
- [x] **POR-3 — My courses + course detail** with topics, lessons and progress. — done 2026-09-26.
  - [x] **My Courses (`/app/courses`) — DONE 2026-09-26.** `features/portal/pages/MyCoursesPage.tsx`
    + `components/EnrolledCourseCard.tsx`, mirroring mobile's Courses tab: **enrolled courses only**,
    in the **server's order** (category → Course 1, Course 2 — a sequence, not sorted by progress),
    a client-side search over name and category that appears once there is more than one course, and
    a "Browse" button to the public catalogue (mobile's All/Mine toggle was dropped at the client's
    request; do not reinstate it here). Each card: artwork (branded fallback on a missing or broken
    image), "Course N", title, run time or lesson count, category, progress bar + percentage, and a
    Complete badge. Loading skeletons; error, nothing-enrolled and no-match empty states. One column
    on a phone, two from `lg`. Reads the same `student/courses` cache as the portal home. No new i18n
    keys — every string already existed for mobile.
  - [x] **Course detail (`/app/courses/:id`) — DONE 2026-09-26.**
    `features/portal/pages/PortalCourseDetailPage.tsx`, reading `GET student/courses/{id}` (no
    backend change). Header: breadcrumb My Courses › course, artwork, "Course N" + the order hint
    (advice, not a lock), length, topics/lessons, a link to the public page. `CourseProgressPanel`
    (server progress, "Up next", Start/Continue learning → `/app/lessons/:id`; finished → complete
    note + Watch again). `CourseAssessmentCard` (pass mark, questions, attempts left, instructions,
    the server's `blocked_reason` explained; start → `/app/courses/:id/paper`). `CourseTopicList`
    (Radix accordion opened on the topic holding the next lesson; ticks, locks, durations, "Up next"
    badge; a locked row explains itself on press instead of navigating). Next-lesson rule copied from
    mobile. **A course the student does not own redirects to its public page**, which already sells
    it — one place does that, not two. New `components/shared/RichText.tsx`: the only
    `dangerouslySetInnerHTML` in the app, with `DOMPurify.sanitize()` on the same line and the
    server's exact `HtmlSanitizer` allowlist (`SEC-6`); used for topic descriptions and assessment
    instructions. `noindex`. 6 i18n keys EN+SI. Verified against local data (course 15).
    **Still placeholders behind it:** the lesson player (`POR-4`) and the assessment (`POR-5`).
- [x] **POR-4 — Lesson player.** — built 2026-09-26. `video.js`, no-skip, progress posted to the
  server, re-seeded from the server's numbers on every response. Lazy-loaded chunk. Ties to **SEC-7**.
  Depends on **DEP-4**.
  > **Built, but NOT ready for real students until `DEP-4`.** With `BUNNY_STREAM_ENABLED=false` the
  > stream endpoint hands out a signed MP4 served by the API itself — the arrangement
  > `docs/bunny-stream-setup.md` records taking the whole API down at ~30 concurrent viewers. The
  > player needs no change when Bunny is switched on: it picks HLS or MP4 from the link it is given.
  **Built:** `features/player/components/LessonPlayer.tsx` (video.js, the web twin of mobile's
  `useNoSkipPlayer`) and `features/player/pages/LessonPage.tsx` at `/app/lessons/:id?course=:id`.
  No-skip: seeded from the server's `max_position_seconds` (never 0); any forward jump past the mark
  — bar, keyboard, devtools — snaps back on `seeking`/`timeupdate` with an overlay message
  **portalled into the player element so it shows in fullscreen**; the reachable stretch is drawn
  inside video.js's own seek bar (`.pb-vjs-unlocked`); rewind is free (plus a −10s button). Watched
  time accrues from the wall clock while playing only; **no playback-speed menu** (the server
  credits ≤ ~2× real time). Flushes every 15s, on pause, on `ended` (with the true duration, which
  is what crosses the 95% gate), on tab hidden, on unmount — and on `pagehide` via `fetch`
  **keepalive** with the XSRF header read from the cookie (`sendBeacon` cannot carry it). A failed
  flush puts its seconds back. The flush is behind a ref for the render-churn reason mobile learned
  the hard way. The signed link (30 min) is re-fetched 5 minutes before expiry and swapped in,
  keeping position and play state. Resumes 3s before where the student stopped.
  Page: the lesson's title and topic (from `?course=`, validated; the page still plays without it —
  the stream endpoint is the authority), "Lesson complete" + **Next lesson** once the server says
  watched (course and list queries are invalidated at that moment so the next lesson arrives
  unlocked), the course's lesson list with "Now playing", and a distinct state per failure: not
  uploaded (404), no access (403), offline, unknown. Lesson links now carry `?course=`.
  **SEC-7 in the browser:** `controlsList="nodownload noplaybackrate"`, picture-in-picture off (its
  window has its own controls), context menu suppressed on the player, links ≤ 30 min. This raises
  the bar; it does not make ripping impossible — the signed link is visible in the network tab for
  its short life, and true DRM is out of scope (§2.4).
  **Verified locally:** the server clamps a skip (a claimed 9,999s position was held to 11s) and a
  lesson with no file answers the "not ready" state; a tampered signed link is 403. **Not verified:
  actual playback in a browser** — no lesson in a published course has an uploaded video in the
  local data (the one file belongs to a deleted course). Upload a video to a lesson of course 15 and
  watch it through once before calling this done. video.js stays in the `player` chunk (205 kB gzip),
  loaded by the lesson page only.
- [ ] **POR-5 — Assessments.** Take, submit, result. Score only until passed or attempts exhausted.
- [x] **POR-6 — Services.** Catalog + my purchases. — built 2026-09-26.
  **Site:** `features/services/`. `/app/services` (`ServicesPage`) puts mobile's two screens — the
  My Services tab and `/browse/services` — on one page, because there is no public services
  catalogue to send a student to (services are a signed-in feature, see "Header nav"): **My
  Services** first (`PurchasedServiceCard`: art, frozen `title`, status badge, paid date; linked only
  while `service.is_available`; the section is omitted when nothing is bought), then **All
  Services** (`ServiceCard` grid, 1/2/3 columns) **minus anything bought and not cancelled** —
  nothing is hidden if the purchases list fails. One client-side search over both lists. Loading
  skeletons; error, empty-catalogue, all-bought and no-match states.
  `/app/services/:id` (`ServiceDetailPage`, **the only place a service is bought**, as on mobile):
  breadcrumb, art, name, delivery estimate; "What you get" through `RichText`; a sticky side card
  with the price and one action — open purchase → a note, no button; payments off → "Coming soon ·
  price"; else Buy now / Buy again → `POST student/services/{id}/purchase` (no body) →
  `/checkout/:orderId`. A 422 (still being delivered) toasts our translated `services.alreadyOpen`
  rather than the server's English message and refetches the page. Before purchase
  `ServiceHowItWorks`; after, `DeliveryTracker` (mobile's `DeliveryStepper` rules: cancelled
  replaces the last step, estimate only while open). Checkout's paid-service button now opens the
  service's own page. Query keys under `student` so sign-out clears them. 1 new i18n key EN+SI.
  **Backend fix found on the way:** `student/service-purchases` returned `is_available: false` for
  every purchase — `listForStudent()` eager-loaded the service without `price_cents`, which
  `isPurchasable()` reads. Mobile's rows were never tappable either. Fixed, plus the missing
  "live service → true" test (fails before the fix). 717 passing.
  **Verified** the three endpoints against local data (shapes match `@shared/types/studentService`,
  unknown id 404s). **Not verified in a browser** — no signed-in session was driven here. Local
  `delivery_time` values are bare numbers ("3-5"), so the copy reads "Usually 3-5"; the admin field
  expects "3-5 working days".
- [x] **POR-7 — Checklists.** Both phases, optimistic ticks, PUT-the-state (not a toggle). — built
  2026-09-26. **No backend change** — `GET student/checklists` and `PUT student/checklist-items/{id}`
  already existed for mobile. `/app/checklist`: the two phases as tabs (`?phase=after` in the URL,
  each tab showing "3/10"), a navy progress card (bar, steps to go, the phase's hint; an "All done"
  card at 100%), and the steps as rows — the web twin of mobile's `ChecklistItemCard`: a separate
  44px checkbox (`role="checkbox"`) so reading never ticks, the title opens the admin's instructions
  inline (via `RichText`, one open at a time, "N steps" counted from the `<li>`s) with the action
  repeated at the bottom. Ticks are optimistic with mobile's rules (`useChecklistTick`): per-item
  rollback, out-of-order responses dropped, the server's recount trusted, a toast when a phase
  reaches 100%; a 404 (step removed) refetches the list. It shares the `student/checklists` cache
  with the portal home, so the home summary moves with each tick. `ui/tabs.tsx` copied from `web/`
  (`@radix-ui/react-tabs` was already a dependency). Verified live: tick, repeated tick (idempotent),
  untick, 404, 422, 401.
- [ ] **POR-8 — Orders & payments history.**
- [ ] **POR-9 — Profile.** Edit, photo, language switch (**must refetch** anything cached under the old
  `Accept-Language`), account deletion.
- [ ] **POR-10 — Wishlist.**

### PHASE SEC — Security

`SEC-1` … `SEC-14` from §7.2. Each is ticked in both places. **`SEC-13` is the last task of the branch**
— it reviews everything else, so it runs after `SEC-14` despite the number.

### PHASE DEP — Deployment

- [ ] **DEP-1 — Domains + DNS. ASK** for the exact names. Add **both** the admin and the site origin
  to `FRONTEND_URLS` (CORS) **and** `SANCTUM_STATEFUL_DOMAINS`, plus `SESSION_DOMAIN`. Missing one of
  the two lists fails silently — see §2.3 step 6. Then run `CorsTest` against the real hosts.
- [ ] **DEP-2 — Nginx vhost + TLS** for the site domain; SPA fallback that does not swallow the
  prerendered files; security headers (**SEC-10**).
- [ ] **DEP-3 — Build pipeline** for `site/`. Extend `docs/deployment.md`.
- [ ] **DEP-4 — Turn Bunny Stream on** (`docs/bunny-stream-setup.md`). **Prerequisite for `POR-4`.**
- [ ] **DEP-5 — Smoke test on the real domain:** sign in, buy, watch, tick a checklist item, sign out;
  confirm the admin domain still works and that neither session reaches the other's routes.

---

## 9. Progress log

Append one line per completed task: date · task ID · what landed · files touched.

| Date | Task | Notes |
|---|---|---|
| 2026-09-24 | — | Branch `feature/public-website-and-student-portal` created. Guide written. Decisions in §1 confirmed with the client. |
| 2026-09-24 | FND-1 | `site/` scaffolded and verified (`tsc -b`, `build`, dev server, `@shared/*` alias). Part of FND-2 (tokens) and FND-4 (api client, i18n, session store) landed with it — see those tasks for what remains. |
| 2026-09-24 | FND-6 | Root `CLAUDE.md` corrected (§1, §2, §4, §16, §17) + new `site/CLAUDE.md`. Done out of order: the stale "student web area lives in `web/`" lines would have misdirected a fresh session. |
| 2026-09-24 | FND-2 | Design tokens + 12 shadcn primitives (4 adapted for mobile-first: see the task). |
| 2026-09-24 | FND-3 | Full app shell — both layouts, header, footer, nav, route table, guards, scroll manager. 26 new i18n keys EN+SI. Every route reachable; unbuilt ones show a `PlaceholderPage` naming their task. |
| 2026-09-24 | FND-4 | Completed early — session bootstrap works against the existing `/student/me` and needs no change at `API-5`. `safeReturnPath` (the `SEC-14` defence) written and in use. |
| 2026-09-24 | PUB-1 (part) | Hero slider, highlights strip, Programmes grid and the Community/About band built from the client's reference PDF, in Plan B's palette. Added `accent-strong` for WCAG-compliant gold text. "Home" added to the nav. Four sections still awaiting the client's UI guide. |
| 2026-09-24 | — | **Framer Motion removed from the landing path.** The hero was written with `AnimatePresence` first; it cost **44 kB gzip on the home page to perform a crossfade**. Rewritten with CSS transitions over mounted slides → home chunk 44 kB → **6.9 kB gzip**. The package is still in `package.json` but is no longer imported anywhere in `site/`. |
| 2026-09-25 | PUB-1 (part) | Success story section — click-to-load YouTube video + full story card, in a navy band. `YouTubeFacade` and `lib/youtube.ts` added; parser verified against 19 inputs including 3 hostname-confusion attacks. Raised two follow-ups: a CSP allowance at `SEC-10` and a privacy-policy line for YouTube. |
| 2026-09-25 | PUB-1 (part) | Testimonial face wall — canopy of portrait cards with a hover/tap/focus popover per person, built to a client image. Added `@radix-ui/react-popover` (shadcn primitive, already in `web/`) and `--primary-tint`. Needs real photographs from the client. |
| 2026-09-25 | PUB-1 (part) | Testimonial geometry re-cut from the client's reference: 9 columns, stacked pairs at both edges, alternating middle heights. Field now shares the page `Container` so the section lines up with Programmes and About (client chose alignment over the reference's full-bleed crop). |
| 2026-09-25 | PUB-1 (part) | Header nav settled at five, client-ordered: **Home · About Us · Courses · Our Values · The Team**. Services dropped from the public nav (signed-in feature). Footer spacing tightened, keeping the 44px mobile tap targets. Unused `site.nav.services` / `site.nav.closeMenu` removed; EN/SI verified at 43 keys each. |
| 2026-09-25 | PUB-1 (part) | Header nav: **Meet the Team** added, **Contact removed** (the footer is the contact section). New **floating WhatsApp button** on public pages with a staged entrance and staggered pulse rings, off under `prefers-reduced-motion`. Contact details centralised in `lib/siteContact.ts`, read by the footer and the button. |
| 2026-09-25 | PUB-1 (part) | Team carousel set to **5 across with a half-card peek** at the edge; placeholder team raised to nine so the scroll affordance is meaningful. |
| 2026-09-25 | PUB-1 (part) | **Our Team** section added to a client image — scroll-snap carousel of portrait cards with a floating white name plate. **Replaces the FAQ section**, which is fully removed (section id, nav string, footer link). Needs real photographs and a `team_members` table at `CMS-4`. |
| 2026-09-25 | PUB-1 (part) | Community/About band's four numbered proof cards removed and its background made a gradient fading to the page surface. |
| 2026-09-25 | PUB-1 (part) | Community/About band's right column became a video (same `YouTubeFacade`), keeping the "Enrolment open now" pill. **Success stories hidden** on the home page at the client's request — component kept, and the three links that pointed at it (nav, hero slide 2, testimonials CTA) all retargeted so nothing scrolls nowhere. |
| 2026-09-25 | PUB-1 (part) | Testimonial wall retuned to a second client reference: cards widened to 9.9% and squared to **4:5**, packed to an **11.6px gap** on an even 10.85% column pitch, and **all rotation and scaling removed** — every card upright and identical. |
| 2026-09-25 | CMS-0 | **Website Configuration shipped** — admin-managed hero slider, About video and team, plus the first public endpoint (`GET public/site-content`) and the website wired to it. Three migrations, two enums, two policies, three services, eight Form Requests, five Resources (three of them public-only), 29 new feature tests. `site/src/lib/youtube.ts` moved to `shared/` so the admin panel and the website parse a pasted link identically. The nine invented team members were **deleted** rather than kept as a fallback — a section headed "The Team" is a claim about real people. |
| 2026-09-25 | API-2 (part) · PUB-1 | **"Our Programmes" is live.** `GET public/courses` built (own Service and Resource, 19 tests) and the section rewritten from a 4-across grid to a **carousel** at the client's request — every published course, 4.5 cards across a laptop down to 1.5 on a phone. The card's three ticked bullets are now the course's **first three topic titles** and the fixed "Online" badge became the **lesson count**; neither `highlights` nor a mode column exists, and inventing admin fields for them was rejected in favour of content that is already written. The four placeholder programmes were **deleted** — an invented course is a product with a price on it. The scroll/dot maths moved to `components/shared/SnapCarousel.tsx` and `TeamSection` was refactored onto it, so the two carousels cannot drift. |
| 2026-09-25 | PUB-1 | **Gold retuned to the client's `#f19f00`**, and home page spacing tightened to one rhythm (`py-12 sm:py-14` sections, `gap-8 lg:gap-10` columns, `mt-8` under each heading — the table is in `SectionHeading`). The fill/text split was **kept and is load-bearing**: `#f19f00` is 7.5:1 on the navy but only **2.17:1 on white**, below even the 3:1 AA allows for large text, so `--accent-strong` is the same hue (39°) darkened to 5.3:1 on white and 4.8:1 on `--accent-soft`. Contrast was computed, not eyeballed. `web/`'s two live previews hardcode these literals on purpose and were moved with them; `web/`'s own `--accent` is the admin panel's chrome and was deliberately left alone. |
| 2026-09-25 | PUB-1 | **Header is navy with white links** (client instruction), logo enlarged (`h-16`→`h-20` bar, `h-12 sm:h-14` mark). The current-page marker moved from `--primary` to gold — `--primary` *is* this navy, so the old rule marked the current link by making it invisible. `Logo` is now shared by the header and footer. **It gets no plate on the navy**: `logo.png` is a circular badge carrying its own cream field and gold ring, so a white panel behind it just draws a rectangle around a round logo. A plate was added on the first pass and removed at the client's request the same day — along with the footer's long-standing hand-rolled copy of it, which had the same problem. Do not reintroduce one. |
| 2026-09-25 | CMS-0 (fix) | **`site/` was never able to read the API.** Its origin (`:5184`) was in `SANCTUM_STATEFUL_DOMAINS` but not in CORS `allowed_origins`, so every request was answered `200` and then discarded by the browser — invisible server-side. Surfaced as "the About video is not showing", because the website's designed fallback has no video by design. `allowed_origins` is now a comma-separated `FRONTEND_URLS` list, and `tests/Feature/CorsTest.php` asserts the **value** of `Access-Control-Allow-Origin` per origin, which is the only assertion that would have caught it. |
| 2026-09-26 | API-5 · SEC-1 | **Student web session.** `student-web` guard, three `auth/session/*` endpoints, `StudentAuthService` split so token and session share one verification path. Two findings recorded in §2.3: the API session cookie is **shared** by both front ends in one browser (the old "never travel together" claim was wrong), and `auth/refresh` would have let a web session mint a JS-readable token — now token-only. 18 new tests over real sessions; mutation-checked; 684 passing. |
| 2026-09-26 | PUB-7 · POR-1 · POR-2 | **Sign in on the website → the portal.** Sign-in dialog (email code + Google Identity Services), lazy-loaded; sign-out; guard bounce opens sign-in and returns to the deep link; portal home (continue learning, stats, my courses, checklist, announcements). 10 new i18n keys EN+SI, appended to the review sheet. |
| 2026-09-26 | POR-6 | **Services** — `/app/services` (my purchases + the rest of the catalogue, one search) and `/app/services/:id` (description, price, buy → checkout, how-it-works / delivery tracker). Backend fix: purchases always reported `is_available: false`; now tested. 1 new i18n key. |
| 2026-09-26 | POR-7 | **Checklists page** — both phases as tabs, progress card, steps with inline instructions, optimistic ticks with per-item rollback (mobile's rules), shared cache with the portal home. No backend change; 1 new i18n key. |
| 2026-09-26 | POR-4 · SEC-7 (player) | **Lesson player** — video.js no-skip player, progress flushes incl. keepalive on tab close, link refresh, lesson page with Next lesson and the course's lesson list. Not live-ready until `DEP-4`; browser playback still to be checked with a real uploaded lesson. |
| 2026-09-26 | POR-3 | **Portal course page** — progress, next lesson, syllabus with ticks and locks, assessment card. `RichText` (DOMPurify, server allowlist) added. Non-owners redirect to the public page. POR-3 complete. |
| 2026-09-26 | PUB-8 (bank transfer) · SEC-11 (web path) | **Checkout, bank transfer only** — order summary, per-state panels, account details with copy, reference + slip dropzone. 5 new tests prove the website upload path; full flow verified live. Card deferred by the client. |
| 2026-09-26 | PUB-5 · API-2 (part) | **Bundle page** — contents grouped by sub-category, list price signed out / personal price signed in, buy flow, redirects for non-bundle and following categories. `GET public/course-categories/{id}`. 8 new tests. |
| 2026-09-26 | PUB-4 · API-2 (part) | **Course detail page** — syllabus, what's included, enrol card (enrolled / bundle / coming soon / enrol), related courses, share, OG tags. `GET public/courses/{id}`. No ratings (client decision). 10 new tests. |
| 2026-09-26 | PUB-3 · API-2 (part) | **Public course catalogue at `/courses`** — search, category chips, Free/Paid, sort, paging, all in the URL. Backend: `price`/`sort` on `public/courses`, new `public/course-categories`. 9 new tests. |
| 2026-09-26 | POR-3 (part) | **My Courses page** — enrolled courses in course order, search, progress per course, all empty/loading/error states. Course detail still to build. |
| 2026-09-24 | SEC-14 | Raised, not fixed. `npm audit` found an open-redirect advisory in `react-router` `<7.18.0`, which **`web/` shares**. Fix is a semver-major upgrade of both apps — needs the client's decision. |

---

**Last updated:** 26 September 2026. **Update this file at the end of every session.**
