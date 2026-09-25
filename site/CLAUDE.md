# `site/` — Public website & student web portal

Read this before touching anything in `site/`. The root `CLAUDE.md` still applies in full; this file
covers what is specific to this app. **The build plan, the decisions already made and the security
gates live in `docs/WEBSITE_AND_PORTAL_GUIDE.md`** — read that too, and update it when you finish a task.

## 1. What this app is

Two areas in one app, on one public domain (`planbinternational.lk`):

| Area | Routes | Audience |
|---|---|---|
| Public website | `/`, `/courses`, `/courses/:slug`, `/bundles/:slug`, `/services`, `/checkout/:orderId` | Anonymous visitors |
| Student portal | `/app/*` | Signed-in students |

**This app is not the admin panel.** The admin panel is `web/`, on its own subdomain. Never add an
admin screen here, and never import from `web/`.

## 2. Auth — read this before touching it

The student signs in with a **Sanctum cookie session**, not a Bearer token. Nothing in this app ever
holds a credential: the session cookie is httpOnly and JavaScript cannot read it.

- **There is no token anywhere.** Not in `localStorage`, not in `sessionStorage`, not in a Zustand
  store, not in a module global. `src/stores/sessionStore.ts` holds the student *record* so the header
  knows whose name to draw — nothing more, and it is deliberately not persisted.
- **`src/api/client.ts` is the only HTTP client.** It sets `withCredentials` and `withXSRFToken`;
  `ensureCsrfCookie()` runs before the first state-changing request. Never use a bare `fetch`.
- **Route guards hide UI. They are not authorization.** Every endpoint re-checks the session
  server-side, and `is_enrolled` / `is_locked` are presentation only — the 403 on the stream, progress
  and paper endpoints is the control.
- The backend side of this (a `student-web` session guard, and why **nothing** may be added to
  `config/sanctum.php`'s `guard` array) is in `docs/WEBSITE_AND_PORTAL_GUIDE.md` §2.3 and
  `backend/CLAUDE.md` §1. Both are worth the five minutes before you change a guard.

## 3. Anonymous traffic is new

Everything built before this app was authenticated. Here, strangers reach the API.

- Public data comes from `/api/v1/public/*`, which has **its own Resources** in
  `app/Http/Resources/Public/`. Never a reused student or admin Resource — a Resource written for a
  signed-in student carries progress, enrolment and lock state that a stranger must not receive.
- A public payload carries **no PII**. "N learners" is a number, never a name or a face.
- Public endpoints are rate-limited by IP. Assume every caller is automated.

## 4. Conventions specific to this app

- **Light theme only.** Unlike `web/`, `src/index.css` has no dark-mode block, and that is deliberate
  — the reason is written in the file. Do not add one without asking.
- **Admin-authored HTML is rendered with DOMPurify, every time.** `dangerouslySetInnerHTML` is allowed
  only with a `DOMPurify.sanitize()` call at the same call site (root `CLAUDE.md` §7.6). Style it with
  the `.pb-rich-text` class.
- **The home page's sections come from a fixed registry**, keyed by the section `type` the API sends.
  An unknown type renders nothing. Never build a component name, import path or class from admin input.
- **Every page is `React.lazy`-loaded.** A visitor landing on the marketing home must not download the
  portal's video player. `video.js` is pinned to its own `player` chunk in `vite.config.ts`.
- **Mobile-first.** A student who signed up on the app may well open the portal on their phone.
- **The server picks the language column, this client never does.** `src/api/client.ts` sends
  `Accept-Language` on every request; switching language invalidates the whole query cache, because
  everything on screen was fetched under the old header.
- **No new packages without asking** (root `CLAUDE.md` §12.3). The approved list for this work is in
  `docs/WEBSITE_AND_PORTAL_GUIDE.md` §3. `TanStack Table`, `TipTap`, `Recharts` and `tus-js-client`
  are admin tools and must not enter this bundle.
- **No Prettier** — this repo has no Prettier config and running it rewrites files to a foreign style.

## 5. Payments

A browser redirect back from the gateway **proves nothing**. Success, cancel and dismiss all take the
same path: poll `GET /student/orders/{id}` and believe only that. `/payment/:status` reads nothing out
of the URL.

The card form is always the gateway's own hosted page, on its own origin, in a full navigation — never
an iframe and never a WebView. That is what keeps Plan B at PCI-DSS SAQ-A.

`payments_enabled` from `app-config` is currently **false** by default server-side. Read it and show
"Coming soon · price" rather than assuming payments are on.

## 6. Commands

```bash
npm install
npm run dev          # Vite dev on :5184  (web/ holds :5183)
npm run build
npm run preview
npm run lint         # oxlint
npx tsc -b           # type-check
```
