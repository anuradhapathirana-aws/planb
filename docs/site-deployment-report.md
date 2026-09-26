# Production Deployment Report — `site/` (public website + student portal)

**Prepared:** 26 September 2026 · **regenerated** against the current code
**Repository inspected at commit:** `a7f0d9c` on `master`
**Target:** `147.93.172.79` — Ubuntu 24.04, Nginx, PHP 8.3, Laravel 11
**Supersedes:** the first version of this file (written at `9d215f0`). Three commits have landed
since, and its headline conclusion — "there is no student portal" — is **no longer true.** Read §0.

Every answer was checked against the source, and the file that proves each one is named. Anything
that can only be confirmed on the live server is marked **VERIFY ON SERVER**; anything still owed by
the development side is marked **REQUIRED FROM DEVELOPER**. Recommendations are labelled and kept
apart from confirmed facts.

---

## 0. What changed since the last report, and what this release actually is

The previous report said the portal was placeholders and that student registration, login, payments,
video and uploads were not in the release. **That was accurate at `9d215f0` and is now out of date.**
Commits `f7245b5`, `cfd1ef5` and `a7f0d9c` added:

- **A real browser sign-in.** `backend/config/auth.php` now defines a fourth guard, `student-web`
  (`driver: session`, `provider: students`), and `backend/routes/api_student.php` exposes
  `auth/session/verify-code`, `auth/session/google` and `auth/session/logout`. The sign-in dialog is
  implemented: emailed code **and** Google. `backend/app/Http/Controllers/Student/WebSessionController.php`.
- **A working portal.** My Learning, My Courses, course detail, the **no-skip video player**
  (`site/src/features/player/components/LessonPlayer.tsx`, video.js + HLS from Bunny), Checklists,
  Services, service purchase, Profile, account deletion, and **bank-transfer payment with a receipt
  upload**.
- **A public catalogue.** `/courses`, `/courses/:id`, category pages — 5 public endpoints now, not 2.

**So this deployment is a website *and* a student portal**, and the things the engineer's reply says
should not be announced — registration, authentication, payments, uploads — **are** in it and do need
testing. Four things are still not built, and none of them is reached from the public menu:

| Route | State | Linked from |
|---|---|---|
| `/`, `/courses`, `/courses/:id`, `/app`, `/app/courses`, `/app/courses/:id`, `/app/lessons/:id`, `/app/services`, `/app/services/:id`, `/app/checklist`, `/app/profile` | **Built** | menus, page CTAs |
| `/privacy`, `/terms` | Placeholder (`PUB-2`) | **the footer, on every public page** |
| `/payment/:status` | Placeholder (`PUB-9`) | payment return — reachable after a real bank transfer |
| `/services` (public) | Placeholder (`PUB-6`) | nothing |
| `/app/courses/:id/paper`, `/app/paper-attempts/:id` | Placeholder (`POR-5`) | a course page's Assessment button |
| `/app/orders`, `/app/wishlist` | Placeholder (`POR-8`, `POR-10`) | Profile → Account settings |

**These are the release's real content problem**: four finished, linked journeys end on "This page is
not built yet". Privacy and Terms are linked from every single public page and are legally expected.
Decision required — see §14, item 3.

**Verified locally at `a7f0d9c`:** `php artisan test` → **721 passed** (2841 assertions);
`site` type-checks and builds (`✓ 3.46s`); `web` builds (`✓ 17.15s`, 153 files precached).

---

## 1. Repository and release

| Item | Answer | Evidence |
|---|---|---|
| Repository URL | `https://github.com/anuradhapathirana-aws/planb.git` | `git remote -v` |
| Branch | `master` | — |
| Commit inspected | **`a7f0d9c`** ("Profile Page, service page") | `git log -1` |
| Website + portal source | **`site/`** | root `CLAUDE.md` §2 |
| Admin panel source | `web/` | root `CLAUDE.md` §2 |
| Laravel backend | `backend/` | root `CLAUDE.md` §2 |
| Shared code | `shared/` — **source-only TypeScript**, no `node_modules`, consumed through a path alias by all three clients | root `CLAUDE.md` §2 |
| Own `package.json`? | Yes, with its own `package-lock.json` | `site/package.json` |
| Package manager | **npm** (lockfile v3). No yarn or pnpm lockfile exists | — |
| Required Node.js | **`^20.19.0 \|\| >=22.12.0`** (Vite 8's own `engines.node`). Built here on Node 20.19.5 / npm 10.8.2 | `site/node_modules/vite/package.json` |
| React | 18.3.1 | `site/package.json` |
| Vite | 8.x | `site/package.json` |
| Router | `react-router-dom` 6.30.x | `site/package.json` |
| Git submodules | **None** — no `.gitmodules` | — |

**A checkout of `site/` alone will not build.** It compiles `../shared/src` directly through the
`@shared` alias, so the whole repository must be present. The existing `/var/www/planb` layout is
correct.

### Release state — **REQUIRED FROM DEVELOPER**

1. **9 files are uncommitted** at the time of writing, including a new
   `backend/app/Http/Resources/Public/PublicBrandingResource.php` and a modified
   `SiteContentController`. A tag cannot be cut mid-change. Either land them or stash them.
2. **No tag exists.** After the working tree is clean:

```bash
git push origin master
git tag -a site-v1.0.0 -m "Public website and student portal launch"
git push origin site-v1.0.0
```

3. **Deploy the tag, never `master`.** The branch moves; a tag does not.

### Does this release affect the deployed Admin Panel, mobile app or backend?

**Yes — the backend is a required part of this deployment.** It is not a frontend-only release.

- **Backend:** 4 migrations, a new route group (`routes/api_public.php`), a new guard
  (`student-web`), new session sign-in endpoints, new public controllers and Resources, a changed
  `config/cors.php`, and the Website Configuration admin API. If only static files are deployed,
  every call the site makes 404s.
- **Admin panel:** gains the **Website Configuration** screens (Hero Slider, About video, The Team).
  **`web/` must be rebuilt and redeployed**, or the client cannot manage the website's content.
- **Mobile app: unaffected.** The `student` (Bearer) guard, its routes and its payloads are unchanged;
  `backend/tests/Feature/GuardIsolationTest.php` covers all four actor/route directions and passes.
- **Existing data: unaffected.** No migration alters or drops an existing column. Two new tables plus
  nullable columns on `company_settings` and `team_members`.
- **The one real risk is CORS**, described in §5. It is a configuration step, not a code risk.

---

## 2. Build process

Node is needed **only at build time**. The output is static files — no Node process in production, no
PM2, no systemd unit for the frontend.

**Output directory: `dist`** (Vite's default; `site/vite.config.ts` does not override `build.outDir`).
`npm run build` is `tsc -b && vite build` (`site/package.json`), so a type error fails the build —
treat that as a stop, never a warning.

```bash
# 1. Dependencies — `npm ci` (exact lockfile), never `npm install`
cd /var/www/planb/site
npm ci

# 2. Production environment file — MUST exist before the build (§3)
cp .env.example .env.production
nano .env.production

# 3. Build
npm run build

# 4. Verify — all four must pass
test -f dist/index.html && echo "index.html OK"
ls dist/assets/*.js >/dev/null && echo "JS bundles OK"
grep -q "api.theplanbs.com" dist/assets/*.js && echo "API URL baked in OK"
grep -c localhost dist/assets/*.js      # MUST print 0 for every file
```

The last check is the one that matters: `VITE_*` values are **compiled into the JavaScript**. With a
missing or wrong `.env.production` the build still succeeds and produces a site that calls
`localhost`. There is no runtime configuration to correct it — you rebuild.

Expect a `player-*.js` chunk of about **700 KB** (205 KB gzipped). That is video.js, deliberately
split out (`site/vite.config.ts`) so it only downloads when a student opens a lesson. It is not a
build fault.

### Deploying without disturbing the admin panel

Different directories, so nothing overlaps as long as the document roots stay distinct (§7). Use a
release directory and a symlink so the swap is atomic and a rollback needs no rebuild:

```bash
sudo mkdir -p /var/www/releases/site
TS=$(date +%Y%m%d-%H%M%S)
sudo cp -r /var/www/planb/site/dist /var/www/releases/site/$TS
sudo chown -R www-data:www-data /var/www/releases/site/$TS
sudo ln -sfn /var/www/releases/site/$TS /var/www/releases/site/current
```

**Recommendation**, not a requirement — serving `/var/www/planb/site/dist` directly also works.

---

## 3. Environment variables

**The frontend reads exactly five variables.** All five are in `site/src/lib/constants.ts` and nowhere
else (`grep -rn "import.meta.env" site/src` returns only that file). Everything under `VITE_*` is
**compiled into the public bundle** and is readable by anyone who opens the site. No secret may be
placed here.

| Variable | Purpose | Production value | Mandatory |
|---|---|---|---|
| `VITE_API_BASE_URL` | Axios `baseURL`; every API path is appended to it | `https://api.theplanbs.com/api/v1` | **Yes** |
| `VITE_API_URL` | API **origin only** — used to build `/sanctum/csrf-cookie`, which is not under `/api/v1` | `https://api.theplanbs.com` | **Yes** |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth **Web** client id for "Continue with Google" | `<web-client-id>.apps.googleusercontent.com` | Optional — blank hides the Google button and leaves the emailed code working |
| `VITE_SITE_URL` | This site's own origin, for canonical and OpenGraph URLs | `https://theplanbs.com` | Optional; falls back to `window.location.origin`. Set it |
| `VITE_APP_NAME` | Display name | `Plan B International` | Optional |

No `<SECRET_REQUIRED>` placeholder is needed: none of these is a secret. A Google **client id** is
public by design — Google prints it in its own popup. A client **secret** must never appear here, and
the website does not use one.

### The API URL question, answered from the code

It is **both forms, in two different variables** — which is why there are two:

- `apiClient` is created with `baseURL: API_BASE_URL` and called as
  `apiClient.get('/public/site-content')` (`site/src/api/siteContent.api.ts`). For that to resolve to
  `https://api.theplanbs.com/api/v1/public/site-content`, `VITE_API_BASE_URL` **must include
  `/api/v1`**, with no trailing slash.
- `ensureCsrfCookie()` builds `` `${API_URL}/sanctum/csrf-cookie` `` (`site/src/api/client.ts`).
  Laravel serves that at the domain root, so `VITE_API_URL` **must be the bare origin**.

Setting both the same breaks one of them. Omitting `/api/v1` makes every call 404.

### Backend variables this release needs

Names only; values are set on the server. §5 and §9 give the full context.

| Variable | Why it is needed now |
|---|---|
| `FRONTEND_URLS` | **Replaces `FRONTEND_URL`.** Comma-separated CORS allow-list; must contain the admin **and** the site origins |
| `SANCTUM_STATEFUL_DOMAINS` | Must contain the site hosts — this is what makes the student cookie session and its CSRF protection work at all |
| `SESSION_DOMAIN`, `SESSION_SECURE_COOKIE`, `SESSION_SAME_SITE`, `SESSION_ENCRYPT` | The student session cookie has to travel from `theplanbs.com` to `api.theplanbs.com` |
| `GOOGLE_CLIENT_IDS` | Must include the website's Web client id, or the server rejects the Google token's audience |
| `BANK_TRANSFER_MAX_RECEIPT_MB` | Defaults to 5. Governs the receipt upload and therefore the nginx body limit |
| `PAYMENTS_ENABLED` | `false` by default. Card checkout stays off; bank transfer is what the portal offers |
| `BUNNY_STREAM_*` | Lesson video. Already set if the mobile app plays lessons today — **VERIFY ON SERVER** |

---

## 4. API endpoints called by the frontend

Complete list, extracted from `site/src/api/*.api.ts`. **34 calls.** Every path is relative to
`https://api.theplanbs.com/api/v1`. "Session" means the `student-web` cookie session.

### Anonymous — public website

| Method | Route | Auth | Type | Upload |
|---|---|---|---|---|
| `GET` | `/public/site-content` | none | JSON | no |
| `GET` | `/public/courses` | none | JSON | no |
| `GET` | `/public/courses/{id}` | none | JSON | no |
| `GET` | `/public/course-categories` | none | JSON | no |
| `GET` | `/public/course-categories/{id}` | none | JSON | no |

All five are rate-limited by IP at **120/minute** (`throttle:public-site`,
`backend/app/Providers/AppServiceProvider.php`).

### Sign-in and session

| Method | Route | Auth | Notes |
|---|---|---|---|
| `POST` | `/student/auth/request-code` | none | Emails a one-time code. Throttled by `student-login-request` |
| `POST` | `/student/auth/session/verify-code` | none | Starts the cookie session. Throttled by `student-login-verify` |
| `POST` | `/student/auth/session/google` | none | Google credential → cookie session. Same limiter |
| `POST` | `/student/auth/session/logout` | session | Throttled 30/min |
| `GET` | `/student/me` | session | Called on **every page load** to resolve the session. A signed-out visitor gets **401, which is normal** and is handled silently |

`GET /sanctum/csrf-cookie` (outside `/api/v1`) is called before every state-changing request.

### Profile and account

| Method | Route | Auth | Type | Upload | Max size |
|---|---|---|---|---|---|
| `GET` / `PUT` | `/student/profile` | session | JSON | no | — |
| `POST` | `/student/profile/photo` | session | **multipart** | **yes** | **2 MB**, JPG/PNG (`UploadProfilePhotoRequest`) |
| `DELETE` | `/student/profile/photo` | session | — | no | — |
| `GET` | `/student/industries`, `/student/professions` | session | JSON | no | — |
| `POST` | `/student/account/deletion-code` | session | JSON | no | — |
| `DELETE` | `/student/account` | session | JSON | no | — |

### Courses, lessons and video

| Method | Route | Auth | Notes |
|---|---|---|---|
| `GET` | `/student/courses`, `/student/courses/{id}` | session | |
| `POST` | `/student/courses/{id}/enrol` | session | Free courses only; paid ones go through an order |
| `GET` | `/student/course-categories/{id}` | session | Bundle page |
| `POST` | `/student/course-categories/{id}/purchase` | session | Opens a bundle order |
| `GET` | `/student/lessons/{id}/stream` | session | Returns `{ url, expires_at, progress }` — a **short-lived signed Bunny URL**. 404 while Bunny is still encoding. The player re-calls it to refresh a link mid-lesson |
| `POST` | `/student/lessons/{id}/progress` | session | Every 15s while playing, and on exit. The **no-skip rule is enforced here**, server-side (`CourseProgressService`) |
| `GET` | `/student/app-config`, `/student/home-banners` | session / public | Branding and the home carousel |
| `GET` | `/student/checklists` · `PUT` `/student/checklist-items/{id}` | session | |

### Services and payment

| Method | Route | Auth | Type | Upload | Max size |
|---|---|---|---|---|---|
| `GET` | `/student/services`, `/student/services/{id}`, `/student/service-purchases` | session | JSON | no | — |
| `POST` | `/student/services/{id}/purchase` | session | JSON | no | — |
| `GET` | `/student/orders/{id}` | session | JSON | no | — |
| `GET` | `/student/payment-methods/bank-transfer` | session | JSON | no | Returns Plan B's bank details — **authenticated on purpose** |
| `POST` | `/student/orders/{id}/bank-transfer` | session | **multipart** | **yes** | **5 MB** (`BANK_TRANSFER_MAX_RECEIPT_MB`), JPG/PNG/PDF. 60-second client timeout |

**No amount is ever sent by the client.** The price comes from the product, server-side. A bank
transfer is never auto-approved: an admin reviews the slip.

### Are these routes in the deployed backend?

**No — `/api/v1/public/*` and the three `auth/session/*` routes are new in this release**, registered
from `backend/routes/api_public.php` and `backend/routes/api_student.php`. Verified locally:

```
GET|HEAD  api/v1/public/course-categories        GET|HEAD  api/v1/public/courses
GET|HEAD  api/v1/public/course-categories/{id}   GET|HEAD  api/v1/public/courses/{id}
GET|HEAD  api/v1/public/site-content
POST      api/v1/student/auth/session/verify-code  …/session/google  …/session/logout
```

**Backend deployment is mandatory.** Without it the public pages fall back to built-in copy with no
courses, and nobody can sign in.

### Nginx / PHP body limits — **VERIFY ON SERVER**

Largest upload is the 5 MB bank-transfer receipt; admin hero/team images are also 5 MB. Required on
the **API host**: `client_max_body_size` ≥ **8M**, `upload_max_filesize` and `post_max_size` ≥ **8M**.
If the admin panel already accepts student CVs and profile videos, this is likely satisfied already.

---

## 5. Authentication, cookies, CORS and CSRF

### What is implemented

Three actor types, three credentials, and they are kept apart deliberately
(`backend/CLAUDE.md` §1, `backend/config/auth.php`):

| Client | Guard | Credential |
|---|---|---|
| Admin panel (`web/`) | `sanctum` → `users` | Sanctum SPA **cookie session** |
| Mobile app (`mobile/`) | `student` → `students` | Sanctum **Bearer token** |
| **Website / portal (`site/`)** | **`student-web` → `students`** | **httpOnly cookie session** (plain `session` driver, not Sanctum) |

- **Does the frontend call `/sanctum/csrf-cookie` first?** Yes. `ensureCsrfCookie()` runs before
  sign-in and before every multipart post, and again after a 419 (`site/src/api/client.ts`).
- **Is `withCredentials: true` required?** Yes, and it is already set, with `withXSRFToken: true`
  which echoes Laravel's `XSRF-TOKEN` cookie back as `X-XSRF-TOKEN`.
- **No token is stored anywhere in the browser** — not `localStorage`, not `sessionStorage`, not a
  store. The cookie is httpOnly and JavaScript cannot read it. `site/src/stores/sessionStore.ts`
  holds only the student's name for the header, and is not persisted.

### Exact Laravel `.env` values for the three hosts

Set on `api.theplanbs.com`. No secret is involved in this section.

```ini
APP_URL=https://api.theplanbs.com

# CORS allow-list. Comma-separated, exact origins, no spaces, no trailing slash.
# BOTH browser apps reach this API; omitting one is the silent-failure case below.
FRONTEND_URLS=https://admin.theplanbs.com,https://theplanbs.com,https://www.theplanbs.com

# Which browser origins may hold a cookie session. REQUIRED for student sign-in:
# the session sign-in routes only work from an origin on this list, and that is
# also what makes Sanctum enforce CSRF on them.
SANCTUM_STATEFUL_DOMAINS=admin.theplanbs.com,theplanbs.com,www.theplanbs.com

# The leading dot lets the cookie travel from theplanbs.com to api.theplanbs.com.
# Without it the student's session cookie is never sent and sign-in appears to
# succeed, then every following request is 401.
SESSION_DOMAIN=.theplanbs.com
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax
SESSION_ENCRYPT=true
SESSION_DRIVER=database

# Must include the website's Google Web client id, or the audience check fails.
GOOGLE_CLIENT_IDS=<web-client-id>.apps.googleusercontent.com,<android-id>,<ios-id>
```

Each of these earns its place:

- **`FRONTEND_URL` (singular) is superseded by `FRONTEND_URLS`.** `config/cors.php` falls back to the
  old key, so the admin panel keeps working if nothing changes — but the site's origin is then not
  allowed and **every request from it fails silently**: the API answers 200 and the browser discards
  the body. Nothing appears in any log. This happened once in development; `tests/Feature/CorsTest.php`
  now asserts the header value per origin.
- **The CORS list and `SANCTUM_STATEFUL_DOMAINS` do different jobs and both are required.** CORS
  decides whether the browser hands the response to JavaScript; Sanctum decides whether the request
  gets a session. An origin in one but not the other fails in a way that looks like a code bug.
- **`config/cors.php` reads `env()`**, which `php artisan config:cache` freezes. After editing
  `.env` you **must** re-run `config:cache` or nothing changes.
- CORS `paths` is already `['api/*', 'sanctum/csrf-cookie']` — correct, no change.
- **Never add `student-web` to `config/sanctum.php`'s `guard` array.** That list is global; adding it
  is how a student session would start satisfying `auth:sanctum` on the admin API. The comment in
  `config/auth.php` says so, and `GuardIsolationTest` fails if it is done.

### Will both apps authenticate without breaking the admin login?

**Yes, and the collision case is already handled in code.**

The API has one host, so one browser holds one session cookie for it. An admin who is also signed in
to the portal has both logins in that cookie. `backend/routes/api_student.php` therefore declares
`auth:student-web,student` with **`student-web` first** — tried second, Sanctum's global `web` guard
list would find the admin first and `student.actor` would 401 the student. `EnsureStudentActor` and
`EnsureAdminActor` reject the wrong actor type on every route group regardless, and
`tests/Feature/GuardIsolationTest.php` proves all four directions. 721 tests pass.

What could break the admin login is **configuration**, not this code: a wrong `SESSION_DOMAIN`, or
Cloudflare set to Flexible SSL (§8). Both are covered in §12's checks.

---

## 6. Domain behaviour

**Serve the site directly from `theplanbs.com`** — it is not a redirect to somewhere else. The portal
lives on the *same* origin under `/app` (`site/src/routes/paths.ts`), so a redirect would break it.

- **Canonical: `https://theplanbs.com`** (no `www`). Set `VITE_SITE_URL` to it so canonical and
  OpenGraph tags agree.
- **`www.theplanbs.com` must work, as a 301 to the canonical host** — not a second copy. Two hosts
  serving the same content splits SEO, and the session cookie would be set per host.
- **SPA fallback is mandatory** (§10).

---

## 7. Nginx configuration

New file, `/etc/nginx/sites-available/theplanbs.com`. **No change is required to the existing `api.`
or `admin.` server blocks** — they match on `server_name`, and this adds a different one. The only
thing worth checking is which existing block holds `default_server`; leave it as it is unless you
want the website to answer for the bare IP.

```nginx
# ---------------------------------------------------------------- HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name theplanbs.com www.theplanbs.com;

    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://theplanbs.com$request_uri; }
}

# ------------------------------------------------- www → canonical (over HTTPS)
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name www.theplanbs.com;

    ssl_certificate     /etc/letsencrypt/live/theplanbs.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/theplanbs.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    return 301 https://theplanbs.com$request_uri;
}

# --------------------------------------------------- the website and portal
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name theplanbs.com;

    root /var/www/releases/site/current;     # or /var/www/planb/site/dist
    index index.html;

    ssl_certificate     /etc/letsencrypt/live/theplanbs.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/theplanbs.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    charset utf-8;
    access_log /var/log/nginx/theplanbs.com.access.log;
    error_log  /var/log/nginx/theplanbs.com.error.log;

    # --------------------------------------------------------- security headers
    add_header X-Content-Type-Options    "nosniff"                          always;
    add_header X-Frame-Options           "DENY"                             always;
    add_header Referrer-Policy           "strict-origin-when-cross-origin"  always;
    add_header Permissions-Policy        "geolocation=(), microphone=(), camera=()" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Content-Security-Policy, derived from what the bundle actually loads:
    #   connect  api.theplanbs.com      the 34 API calls
    #            <bunny-cdn-host>       HLS playlist + segments, fetched by video.js
    #   media    <bunny-cdn-host>, blob:   the video itself (blob: is MSE)
    #   script   accounts.google.com    Google Identity Services
    #   frame    accounts.google.com    the Google sign-in popup
    #            www.youtube-nocookie.com   the About video, only after a click
    #   img      api.theplanbs.com (media), i.ytimg.com (YouTube posters), data:
    #   style    fonts.googleapis.com · font  fonts.gstatic.com
    # REPLACE <bunny-cdn-host> with the value of BUNNY_STREAM_CDN_HOSTNAME.
    # 'unsafe-inline' on style-src is required — Vite emits inline styles and the
    # Google Fonts stylesheet is injected from index.html.
    add_header Content-Security-Policy "default-src 'self'; connect-src 'self' https://api.theplanbs.com https://<bunny-cdn-host>; media-src 'self' blob: https://<bunny-cdn-host>; script-src 'self' https://accounts.google.com; frame-src https://accounts.google.com https://www.youtube-nocookie.com; img-src 'self' data: blob: https://api.theplanbs.com https://i.ytimg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'" always;

    # ---------------------------------------------------------------- caching
    # Vite fingerprints everything in /assets, so it can be cached forever.
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        try_files $uri =404;          # a missing hashed asset must 404, not fall through
    }

    location /images/ {
        expires 30d;
        add_header Cache-Control "public";
        access_log off;
        try_files $uri =404;
    }

    # index.html must NEVER be cached, or a returning visitor keeps asking for the
    # previous build's asset filenames and sees a blank page after a deploy.
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        expires 0;
    }

    # ------------------------------------------------------------ SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_vary on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;

    location ~ /\. { deny all; }
}
```

MIME handling needs nothing special — `/etc/nginx/mime.types` already covers `.js`, `.css`, `.woff2`
and `.svg`. The build produces no unusual types.

**On the CSP:** it is the one block here that can break a working page invisibly. If the Google button
renders as an empty box, or a lesson will not play, the CSP is the first suspect — check the browser
console for a violation and confirm `<bunny-cdn-host>` was substituted. If you would rather launch
without it, comment out that single `add_header` line; everything else in this block is safe.

```bash
sudo ln -s /etc/nginx/sites-available/theplanbs.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 8. DNS and SSL

| Type | Name | Target |
|---|---|---|
| `A` | `@` (`theplanbs.com`) | `147.93.172.79` |
| `A` | `www` | `147.93.172.79` |

Both as `A` records — the root cannot be a `CNAME`, and matching them keeps the certificate simple.
**Do not touch the `MX` or `TXT` (SPF/DKIM) records** for `info@theplanbs.com`.

### Cloudflare — proxied or DNS only?

**Recommendation: DNS only (grey cloud) for this deployment.** Issue the certificate, confirm the
site, the student sign-in and the admin login, then enable the proxy deliberately. With the proxy on
from the start, a misconfiguration is very hard to distinguish from a caching artefact.

If it **is** proxied, four things matter, and the first two can break sign-in outright:

1. **SSL mode must be Full (strict).** "Flexible" terminates TLS at the edge and speaks HTTP to the
   origin, which breaks `SESSION_SECURE_COOKIE=true` — sign-in appears to succeed and immediately
   drops, for students **and** admins.
2. **`TRUSTED_PROXIES=cloudflare`** must be set in the Laravel `.env`, or Laravel sees Cloudflare's IP
   as the client. That matters twice over: the public endpoints are limited to 120/min **per IP**, and
   the sign-in limiters are per IP too — every visitor would share one bucket and lock each other out.
3. **Do not cache `index.html` or anything under `/api/*`.** Default rules leave HTML uncached;
   verify. A cached `index.html` serves a stale build after the next deploy.
4. **Uploads** are unaffected — 5 MB is far below Cloudflare's 100 MB limit.

### Certbot

```bash
sudo certbot --nginx -d theplanbs.com -d www.theplanbs.com --redirect \
  --agree-tos -m info@theplanbs.com --no-eff-email
sudo certbot renew --dry-run
```

Run it **after** DNS resolves to this server and **with Cloudflare on DNS-only** — the HTTP-01
challenge has to reach this host. Both names go on one certificate, which is what §7 expects.

---

## 9. Database and Laravel changes

| Item | Required? | Detail |
|---|---|---|
| Migrations | **Yes — 4** | Listed below. Two new tables; nullable columns added. **No existing column is altered or dropped** |
| Seeders | **One, optional** | `WebsiteContentSeeder` only. **No demo-data seeder is needed or wanted** |
| New roles or permissions | **No** | New policies reuse `SuperAdmin` and `ContentManager` (`app/Policies/TeamMemberPolicy.php`) |
| New queues or scheduled jobs | **No new ones** — but see the warning below | |
| Laravel `.env` changes | **Yes** | The block in §5 |
| Storage directories / symlinks | **No new ones** | Hero images and team photos use the existing `public` disk. Confirm the link: `ls -l backend/public/storage` |
| Supervisor | **No change**, but **must be running** | See below |
| PHP / nginx upload limits | **Verify** | ≥ 8M on the API host (§4) |
| Cache clearing / queue restart | **Yes, mandatory** | `config/cors.php` reads `env()`, frozen by `config:cache` |

### The four migrations, and what each one does

| File | Change | Reversible? |
|---|---|---|
| `2026_09_25_090000_create_site_hero_slides_table.php` | Creates `site_hero_slides` — the website's hero carousel: eyebrow, heading, body, two CTA buttons, two stat figures, an icon key, `sort_order`, `is_visible`, plus `*_si` Sinhala siblings. One nullable FK to `course_programmes` (`nullOnDelete`) for a "this course" button | Yes — `down()` drops the table |
| `2026_09_25_090100_create_team_members_table.php` | Creates `team_members` — name, role, `role_si`, `sort_order`, `is_visible` | Yes — `down()` drops the table |
| `2026_09_25_090200_add_website_content_to_company_settings_table.php` | Adds ten **nullable** `community_*` columns to the existing `company_settings` singleton (About heading, body, YouTube link, badge wording, and Sinhala siblings) | Yes — `down()` drops those ten columns |
| `2026_09_25_120000_add_social_links_to_team_members_table.php` | Adds nullable `facebook_url` and `linkedin_url` to `team_members` | Yes — `down()` drops both |

**Production-safe:** yes. Every one is additive. Nothing is renamed, retyped or dropped, no data is
rewritten, and no existing query changes meaning. They are fast — two `CREATE TABLE`s and two
`ALTER TABLE`s adding nullable columns.

**Reversible:** yes, technically — every `down()` is written. **But rolling them back destroys any
website content the client has entered**, and it is not necessary: because they are purely additive,
**the previous release's code runs correctly against the new schema.** A rollback of code needs no
rollback of schema. If a schema rollback is ever genuinely required, restore the dump instead.

### Seeder

```bash
php artisan db:seed --class=WebsiteContentSeeder --force
```

Idempotent and non-destructive by construction: it writes nothing if any hero slide already exists,
and fills only About fields that are still empty. It seeds **no** team members and **no** demo
students, courses or payments. **Never run bare `php artisan db:seed`** on this server — the default
seeder chain includes development data.

### Queue workers — now mandatory, not advisory

Student sign-in sends its one-time code through a **queued** notification
(`backend/CLAUDE.md` §6). If `queue:work` is not running, the job sits in the `jobs` table, **nobody
can sign in, and nothing errors**. This release is the first one where a browser user depends on it.

```bash
sudo supervisorctl status          # the planb worker must be RUNNING
php artisan queue:failed           # expect empty
```

### Commands

```bash
cd /var/www/planb/backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan db:seed --class=WebsiteContentSeeder --force      # optional

# then edit .env per §5, and:
php artisan config:clear && php artisan config:cache
php artisan route:clear  && php artisan route:cache
php artisan view:clear   && php artisan view:cache
php artisan queue:restart

php artisan route:list --path=api/v1/public                   # expect 5 routes
php artisan route:list --path=api/v1/student/auth             # expect the session/* routes
```

---

## 10. Frontend routing and refresh behaviour

Router: `react-router-dom` 6.30.x with `createBrowserRouter` — real URLs, no hash routing.

**No base path.** `site/vite.config.ts` sets no `base` and the router has no `basename`, so the app is
served from the domain root. Do not deploy it into a subdirectory without setting both.

- **Public:** `/`, `/courses`, `/courses/:slug`, `/bundles/:slug`, `/services`, `/checkout/:orderId`,
  `/payment/:status`, `/privacy`, `/terms`
- **Portal:** `/app`, `/app/courses`, `/app/courses/:id`, `/app/courses/:id/paper`,
  `/app/lessons/:id`, `/app/paper-attempts/:id`, `/app/services`, `/app/services/:id`,
  `/app/checklist`, `/app/orders`, `/app/wishlist`, `/app/profile`
- **Unknown paths** redirect to `/`. A real 404 page is `PUB-2`.

Confirmations:

- **Direct access and browser refresh on a nested route work — only with the SPA fallback.**
  `try_files $uri $uri/ /index.html` is what makes `https://theplanbs.com/app/courses` return the app
  instead of nginx's 404. Without it every route except `/` fails on a direct hit or a refresh. This
  is the single most common launch fault for a React app.
- **API routes cannot be captured by the frontend.** They are on another host, and this server block
  has no `/api` location at all.
- **`/app/*` is guarded client-side** (`site/src/routes/guards.tsx`) which is **UX, not
  authorization** — the API re-checks the session on every request and 403s the stream, progress and
  paper endpoints without an enrolment.
- **Anchor links** (`/#about`, `/#team`) are handled in the browser and need no server support.

---

## 11. Deployment safety and rollback

### Back up first

```bash
TS=$(date +%Y%m%d-%H%M%S); sudo mkdir -p /var/backups/planb/$TS
sudo cp /var/www/planb/backend/.env /var/backups/planb/$TS/backend.env
mysqldump -u <db_user> -p --single-transaction --routines planb \
  | gzip > /var/backups/planb/$TS/planb.sql.gz
sudo tar czf /var/backups/planb/$TS/storage-app.tar.gz -C /var/www/planb/backend/storage app
sudo tar czf /var/backups/planb/$TS/web-dist.tar.gz -C /var/www/planb/web dist
git -C /var/www/planb rev-parse HEAD | sudo tee /var/backups/planb/$TS/PREVIOUS_COMMIT
```

That last line is what makes a rollback possible. Do not skip it.

### Must not be overwritten

| Path | Why |
|---|---|
| `backend/.env` | Git-ignored, so `git checkout` will not touch it. Never `cp .env.example .env` here |
| `backend/storage/app/` | Every uploaded photo, CV, document and bank slip |
| `backend/public/storage` | The symlink to the above |
| `web/dist/` | The live admin panel (`dist` is git-ignored, so only a manual `rm` endangers it) |
| The database | Only `migrate --force` should touch it |

`git status` on the server should be clean apart from ignored files. If it is not, **stop** and find
out what was edited in place before checking anything out.

### Order

The backend must be live before the website, or the first visitors see a site with no content and no
working sign-in.

1. Read-only pre-deployment checks → 2. Backup → 3. `git checkout site-v1.0.0` →
4. Backend (composer, migrate, seeder, `.env`, caches, `queue:restart`) →
5. Rebuild and deploy the **admin panel** → 6. Build and deploy the **website** →
7. Nginx + Certbot → 8. Verify → 9. Rollback if needed

### Expected interruption

- **Website:** none — it is not public yet.
- **API:** a few seconds during `config:cache` / `route:cache`. For an additive release that is
  usually acceptable; use `php artisan down --render="errors::503"` around steps 4–5 for zero risk.
- **Admin panel:** a few seconds while `dist` is swapped; use the symlink approach to make it atomic.

### Rollback

```bash
# Frontend — repoint the symlink. Instant, no rebuild.
sudo ln -sfn /var/www/releases/site/<previous-timestamp> /var/www/releases/site/current
sudo systemctl reload nginx

# API
cd /var/www/planb
git checkout $(cat /var/backups/planb/<TS>/PREVIOUS_COMMIT)
cd backend
composer install --no-dev --optimize-autoloader
php artisan config:clear && php artisan config:cache
php artisan route:clear  && php artisan route:cache
php artisan queue:restart
```

**Leave the migrations in place** — they are additive and the previous code runs against them (§9).
Restore the admin panel without a rebuild:
`sudo tar xzf /var/backups/planb/<TS>/web-dist.tar.gz -C /var/www/planb/web`.

---

## 12. Verification checklist

Unlike the previous version of this report, nearly everything here is now testable.

### Domains, SSL, delivery

```bash
curl -sI https://theplanbs.com | head -3                   # 200, text/html
curl -sI https://www.theplanbs.com | head -3               # 301 → https://theplanbs.com/
curl -sI http://theplanbs.com | head -3                    # 301 → https
curl -sI https://theplanbs.com/app/courses | head -3       # 200 — SPA fallback works
curl -sI https://theplanbs.com/assets/index-*.js | grep -i cache-control   # immutable
curl -sI https://theplanbs.com/ | grep -i cache-control    # must be no-store
echo | openssl s_client -connect theplanbs.com:443 -servername theplanbs.com 2>/dev/null \
  | openssl x509 -noout -dates -subject
```

### API and CORS — the most likely thing to be wrong

```bash
# Must return JSON AND echo the site's exact origin
curl -s -D - -o /dev/null https://api.theplanbs.com/api/v1/public/site-content \
  -H "Origin: https://theplanbs.com" | grep -i "access-control-allow"
#   expect: access-control-allow-origin: https://theplanbs.com
#           access-control-allow-credentials: true

curl -s https://api.theplanbs.com/api/v1/public/courses | head -c 300     # JSON

# An unlisted origin must NOT be allowed
curl -s -D - -o /dev/null https://api.theplanbs.com/api/v1/public/site-content \
  -H "Origin: https://evil.example" | grep -ci "access-control-allow-origin"   # expect 0

# CSRF cookie must be issued to the site's origin
curl -s -D - -o /dev/null https://api.theplanbs.com/sanctum/csrf-cookie \
  -H "Origin: https://theplanbs.com" | grep -iE "set-cookie|access-control-allow-origin"
```

JSON with **no** `access-control-allow-origin` is the silent failure from §5: the API is healthy and
the browser is discarding the body. Fix `FRONTEND_URLS`, re-run `config:cache`.

### Student journeys, in a browser

1. **Sign-in by email code** — enter an email, receive the code, sign in. **If no email arrives, check
   the queue worker first** (§9), not the mail credentials.
2. **Sign-in with Google** — the button must render. An empty box means either
   `VITE_GOOGLE_CLIENT_ID` is unset at build time, the site's origin is not an authorised JavaScript
   origin on the Google client, or the CSP is blocking `accounts.google.com`.
3. **Session survives a refresh**, and `/app` stays reachable. In DevTools → Application → Cookies,
   the session cookie is `HttpOnly`, `Secure`, domain `.theplanbs.com`.
4. **Sign out** — `/app/*` bounces to the home page.
5. **My Courses → a course → a lesson.** Video plays. **Try to drag the bar forward: it must snap
   back.** Rewinding is free. Leave and return — it resumes where you left off.
6. **Checklist** — tick an item; it persists across a refresh.
7. **Services** — list and detail load.
8. **Bank transfer** — open a paid course or service, choose bank transfer, upload a slip (JPG/PNG/PDF
   under 5 MB), submit. It must appear in the admin panel for review. **A 413 here means
   `client_max_body_size` on the API host** (§4).
9. **Profile** — edit details, upload a photo (under 2 MB), remove it.
10. **Sinhala** — switch language; content changes.
11. **Console** — no CORS, CSP or mixed-content errors anywhere in the above.
12. **375px wide** — no horizontal scrollbar, carousels swipe, tap targets comfortable.
13. **Placeholder pages** — Privacy, Terms, Orders, Saved courses and Assessment currently show "not
    built yet". Confirm that is the agreed state (§14, item 3).

### Password reset

**Not applicable.** There is no password for students — sign-in is an emailed one-time code or
Google (`backend/CLAUDE.md` §4). Nothing to test. Admin password reset is unchanged by this release.

### Admin panel — the regression to watch

1. **Log in at `https://admin.theplanbs.com`.** If login bounces back to the login screen, suspect
   `SESSION_DOMAIN` or Cloudflare SSL mode, not this release's code.
2. Sidebar shows **Website Configuration** → Hero Slider, About video, The Team.
3. Add a hero slide with an image, mark it visible, confirm it appears on the website.
4. Review the bank transfer submitted in step 8 above and approve it; the student's order updates.

### Logs

```bash
sudo tail -n 100 /var/log/nginx/theplanbs.com.error.log
sudo tail -n 100 /var/log/nginx/theplanbs.com.access.log
sudo tail -n 200 /var/www/planb/backend/storage/logs/laravel-$(date +%Y-%m-%d).log
sudo supervisorctl status
php artisan queue:failed
```

A run of `401` on `/api/v1/student/me` is **expected and harmless** — it is how a signed-out visitor
is detected on every page load.

---

## 13. Final deployment command sequence

```bash
# =============================================================================
# 1. READ-ONLY PRE-DEPLOYMENT CHECKS
# =============================================================================
git -C /var/www/planb rev-parse HEAD                   # record the current commit
git -C /var/www/planb status --porcelain                # MUST be empty; if not, stop
node -v                                                 # ^20.19 or >=22.12
php -v                                                  # 8.3
nginx -t
ls -l /var/www/planb/backend/public/storage             # storage symlink
php -i | grep -E "upload_max_filesize|post_max_size"    # both >= 8M
sudo supervisorctl status                               # queue worker RUNNING

# =============================================================================
# 2. BACKUP
# =============================================================================
TS=$(date +%Y%m%d-%H%M%S); sudo mkdir -p /var/backups/planb/$TS
sudo cp /var/www/planb/backend/.env /var/backups/planb/$TS/backend.env
mysqldump -u <db_user> -p --single-transaction --routines planb | gzip > /var/backups/planb/$TS/planb.sql.gz
sudo tar czf /var/backups/planb/$TS/storage-app.tar.gz -C /var/www/planb/backend/storage app
sudo tar czf /var/backups/planb/$TS/web-dist.tar.gz -C /var/www/planb/web dist
git -C /var/www/planb rev-parse HEAD | sudo tee /var/backups/planb/$TS/PREVIOUS_COMMIT

# =============================================================================
# 3. CODE UPDATE TO THE APPROVED TAG
# =============================================================================
cd /var/www/planb
git fetch --all --tags
git checkout site-v1.0.0                                # NOT `git pull origin master`
git log -1 --oneline

# =============================================================================
# 4. BACKEND  (must be live before the website)
# =============================================================================
cd /var/www/planb/backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan db:seed --class=WebsiteContentSeeder --force
sudo nano /var/www/planb/backend/.env                   # the block in §5
php artisan config:clear && php artisan config:cache
php artisan route:clear  && php artisan route:cache
php artisan view:clear   && php artisan view:cache
php artisan queue:restart
php artisan route:list --path=api/v1/public             # expect 5 routes

# =============================================================================
# 5. ADMIN PANEL REBUILD
# =============================================================================
cd /var/www/planb/web
npm ci
# confirm web/.env.production points at https://api.theplanbs.com/api/v1
npm run build
sudo mkdir -p /var/www/releases/web
sudo cp -r dist /var/www/releases/web/$TS
sudo chown -R www-data:www-data /var/www/releases/web/$TS
# repoint the admin block's root, or copy over the existing dist

# =============================================================================
# 6. WEBSITE BUILD AND DEPLOY
# =============================================================================
cd /var/www/planb/site
npm ci
cp .env.example .env.production && nano .env.production  # §3 — five variables
npm run build
grep -c localhost dist/assets/*.js                       # MUST be 0
sudo mkdir -p /var/www/releases/site
sudo cp -r dist /var/www/releases/site/$TS
sudo chown -R www-data:www-data /var/www/releases/site/$TS
sudo ln -sfn /var/www/releases/site/$TS /var/www/releases/site/current

# =============================================================================
# 7. NGINX AND SSL
# =============================================================================
sudo nano /etc/nginx/sites-available/theplanbs.com        # §7 — substitute <bunny-cdn-host>
sudo ln -s /etc/nginx/sites-available/theplanbs.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d theplanbs.com -d www.theplanbs.com --redirect \
  --agree-tos -m info@theplanbs.com --no-eff-email
sudo nginx -t && sudo systemctl reload nginx
sudo certbot renew --dry-run

# =============================================================================
# 8. VERIFY  (full list in §12 — include the student and admin journeys)
# =============================================================================
curl -sI https://theplanbs.com | head -3
curl -sI https://theplanbs.com/app/courses | head -3
curl -s -D - -o /dev/null https://api.theplanbs.com/api/v1/public/site-content \
  -H "Origin: https://theplanbs.com" | grep -i "access-control-allow"

# =============================================================================
# 9. ROLLBACK  (only if needed)
# =============================================================================
sudo ln -sfn /var/www/releases/site/<previous-timestamp> /var/www/releases/site/current
sudo systemctl reload nginx
cd /var/www/planb && git checkout $(cat /var/backups/planb/$TS/PREVIOUS_COMMIT)
cd backend && composer install --no-dev --optimize-autoloader
php artisan config:clear && php artisan config:cache
php artisan route:clear  && php artisan route:cache && php artisan queue:restart
# Leave the migrations in place (§9).
```

---

## 14. REQUIRED FROM DEVELOPER

1. **Clean the working tree and cut the tag.** 9 files are uncommitted; no tag exists. §1.
2. **Content that is not true yet**, all in `site/`:
   - **The 13 invented testimonials** on the home page — names, job titles, quotes and sample
     photographs (`site/src/features/marketing/homeContent.ts`). Publishing fabricated testimonials
     is deceptive advertising. Replace with real, consented ones or remove the section.
   - **"500+ students"** in the hero stat and the About heading. Editable in the admin panel; must be
     true or changed.
   - **Contact details** (`site/src/lib/siteContact.ts`): phone `+94 11 000 0000`, WhatsApp
     `94110000000`, email `info@planbinternational.lk` — **wrong domain**, should be
     `info@theplanbs.com`. The floating WhatsApp button currently dials a number that does not exist.
   - **Favicon files.** `site/index.html` references `/icons/icon-192.png` twice and
     `site/public/icons/` does not exist, so the icon 404s.
3. **Decide what happens to the four unbuilt journeys** (§0). They are reached from finished pages:
   Privacy and Terms from the footer on **every** page, Orders and Saved courses from Profile,
   Assessment from a course page, and `/payment/:status` after a real bank transfer. Options: build
   them, or remove the links until they exist. Privacy and Terms are the pressing pair.
4. **`robots.txt` and `sitemap.xml`** in `site/public/` — neither exists.
5. **Google OAuth Web client.** Create or confirm one, add `https://theplanbs.com` (and `www`) as
   authorised JavaScript origins, put the id in `site/.env.production` as `VITE_GOOGLE_CLIENT_ID`,
   **and** add the same id to the backend's `GOOGLE_CLIENT_IDS`. If this is skipped, leave the
   variable blank — the Google button then hides and the emailed code still works.
6. **`BUNNY_STREAM_CDN_HOSTNAME`** — needed for the CSP in §7. Names only; no key is required in this
   report.
7. **Update `backend/.env.production.example`.** It still documents `FRONTEND_URL` (singular) and
   `SANCTUM_STATEFUL_DOMAINS=admin.<domain>` only, which would reproduce the silent CORS failure on
   the next fresh deploy. `backend/tests/Feature/EnvironmentTemplateTest.php` asserts the old key and
   changes with it.
8. **Fix the broken references to `docs/SECURITY_AND_LAUNCH_GUIDE.md`, which does not exist** — 11
   of them, in `docs/play-store-launch.md` (5), `docs/WEBSITE_AND_PORTAL_GUIDE.md` (5) and
   `backend/config/payments.php` (1), plus the pointer on the `PAYMENTS_ENABLED` line of
   `backend/.env.production.example`. That pointer is the pre-flight check guarding the riskiest
   switch on the server, and it leads nowhere.
9. **Confirm `PAYMENTS_ENABLED=false` at launch.** Card checkout stays off; bank transfer is what the
   portal offers, and it needs an admin to review each slip.
10. **Legal text.** `LEGAL_COMPANY_ADDRESS` and `LEGAL_COMPANY_REGISTRATION_NUMBER` are blank in the
    production template and print on the legal pages.
11. **Decide on Cloudflare** before Certbot runs. §8.

### Recommendations, not requirements

- `site/public/logo.png` is **580 KB** and loads in the header on every page. Re-export it at display
  size; it is the largest single asset in the bundle.
- **No prerendering** (`FND-5`). The site is client-rendered, so a crawler's first pass and every
  WhatsApp or Facebook link preview sees only the fallback tags in `index.html`. Worth fixing before
  any advertising spend.
- **`react-router` open-redirect advisory** GHSA-wrjc-x8rr-h8h6 affects `site/` and `web/`; the fix is
  a major-version upgrade (`SEC-14`).
- **Off-server backups.** `/var/backups` on the same disk does not survive the disk. Backblaze B2 is
  already in the stack.

---

## Appendix — answers to the infrastructure engineer's 14 points

| # | Their request | Answer |
|---|---|---|
| 1 | Push all changes | 9 files still uncommitted. §1 — **owed by the developer** |
| 2 | Tag name, commit, confirmation of contents | No tag yet. Proposed `site-v1.0.0` from `master` once clean; it will contain the website, the portal, the Laravel API changes, the CORS change and all four migrations. §1 |
| 3 | Are the migrations production-safe and reversible? | **Yes to both.** All additive; every `down()` written. But a schema rollback destroys entered content and is unnecessary — old code runs against the new schema. §9 |
| 4 | Exact filenames and what each changes | Table in §9 |
| 5 | Which seeder, no demo data | **`WebsiteContentSeeder` only** — idempotent, non-destructive, seeds no demo data. Never bare `db:seed`. §9 |
| 6 | Identify placeholder/inaccurate content | §14 item 2, with file paths |
| 7 | Approved contact email | **`info@theplanbs.com`** — pending the client's confirmation; the code currently has the wrong domain. §14 item 2 |
| 8 | Final telephone and WhatsApp numbers | **Not yet supplied.** Both are placeholders. §14 item 2 |
| 9 | Coming soon / hidden / removed? | **Developer decision, §14 item 3.** Note that four are linked from finished pages, so "leave as is" means a visitor can reach a "not built" page — Privacy and Terms from every page |
| 10 | Canonical URL | **`https://theplanbs.com`, `www` 301s to it.** §6 |
| 11 | Will the backend change affect admin, mobile, queues or data? | **No.** Mobile's guard, routes and payloads unchanged; admin's session untouched; no existing column altered; no new queue. `GuardIsolationTest` covers all four actor directions; 721 tests pass. The one thing that *can* break the admin login is misconfiguration — `SESSION_DOMAIN` or Cloudflare Flexible SSL. §5, §8, §12 |
| 12 | Required environment-variable names, no values | Frontend: five, §3. Backend: the block in §5 plus the table in §3 |
| 13 | Send this file | This is that file: `docs/site-deployment-report.md`, regenerated at `a7f0d9c` |
| 14 | Every REQUIRED FROM DEVELOPER item with an answer | §14 — 11 items, each with the file or decision it needs |
