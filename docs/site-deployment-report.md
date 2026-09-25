# Production Deployment Report — `site/` (public website)

**Prepared:** 26 September 2026
**Repository inspected at commit:** `9d215f0` on `master`
**Audience:** infrastructure engineer deploying to `147.93.172.79` (Ubuntu 24.04, Nginx, PHP 8.3)

Every answer below was checked against the source. Where something cannot be confirmed from the
repository — anything about the state of the live server — it is marked **REQUIRED FROM DEVELOPER**
or **VERIFY ON SERVER**. Recommendations are labelled as such and are separated from confirmed facts.

---

## 0. Read this before anything else

**The request asks to deploy a "React Student Portal". That does not exist yet.** What this branch
contains is the **public marketing website**, and one page of it is finished.

Confirmed from the source:

| Route | State | File |
|---|---|---|
| `/` | **Built and working** | `site/src/features/marketing/pages/HomePage.tsx` |
| `/courses`, `/courses/:slug`, `/bundles/:slug`, `/services`, `/checkout/:orderId`, `/payment/:status`, `/privacy`, `/terms` | Placeholder page ("This page is not built yet") | `site/src/routes/router.tsx` |
| `/app`, `/app/courses`, `/app/lessons/:id`, `/app/orders`, `/app/profile`, + 6 more | Placeholder, and unreachable — the guard bounces every visitor | `site/src/routes/router.tsx`, `site/src/routes/guards.tsx` |
| Sign-in dialog | Renders the words "Coming soon" | `site/src/features/auth/components/SignInDialog.tsx` |

**There is no student authentication in the browser at all.** `/api/v1/student/*` is protected by
`Authenticate:student`, and that guard is `driver: sanctum, provider: students`
(`backend/config/auth.php`). Sanctum's session branch reads one global key, `sanctum.guard`, which is
stock `['web']` (`backend/config/sanctum.php:40`) — so a cookie session **cannot** authenticate a
student. Only a Bearer token can, and the browser client never sends one: it is cookie-only by design
(`site/src/api/client.ts`). The endpoints that would make a browser session work are tracked as
`API-5` / `SEC-1` in `docs/WEBSITE_AND_PORTAL_GUIDE.md` and are not written.

Consequences for this deployment request:

- **Sections 4 and 5** (registration, login, password reset, profile, courses, videos, payments,
  applications, uploads, notifications) — **none of these are called by this frontend.** It makes
  exactly three API calls. They are listed in §4 below.
- **Section 12's checklist** cannot be completed as written. Registration, login, logout, password
  reset, payments, uploads and video playback have nothing to test. A replacement checklist that
  matches what actually ships is in §12.
- Deploying this is still worth doing — it puts Plan B's public site live and gives the client the
  Website Configuration admin screens. It is a **marketing site launch**, not a portal launch, and
  the announcement should say so.

**Second finding, equally important:** the request says "existing database and Laravel backend are
already deployed" and that only a frontend is needed. **That is not sufficient.** This release adds
new API routes, 4 migrations and a CORS change. If only the static files are deployed, every request
the website makes returns 404 and the home page renders its built-in fallback copy with no courses
and no team. Backend deployment is mandatory — see §4 and §9.

---

## 1. Repository and release

| Item | Answer | Evidence |
|---|---|---|
| Repository URL | `https://github.com/anuradhapathirana-aws/planb.git` | `git remote -v` |
| Branch containing the website | `master` | merged 26 Sep 2026 |
| Exact commit | **`9d215f0`** | `git log -1` |
| Website source directory | **`site/`** | root `CLAUDE.md` §2 |
| Admin panel source directory | `web/` | root `CLAUDE.md` §2 |
| Laravel backend directory | `backend/` | root `CLAUDE.md` §2 |
| Own `package.json`? | Yes — `site/package.json`, with its own `package-lock.json` | — |
| Package manager | **npm** (`package-lock.json`, lockfile v3). No yarn or pnpm lockfile anywhere | — |
| Required Node.js | **`^20.19.0 \|\| >=22.12.0`** — Vite 8's own `engines.node`. Built and verified here on Node 20.19.5 / npm 10.8.2 | `site/node_modules/vite/package.json` |
| React version | 18.3.1 | `site/package.json` |
| Vite version | 8.x (8.3.0 installed) | `site/package.json`, lockfile |
| Git submodules | **None.** No `.gitmodules` exists | — |
| Does the current production release contain the website? | **VERIFY ON SERVER.** Run `git -C /var/www/planb rev-parse HEAD`. If it reports `c1881d7` or earlier, it does not | — |

### A fourth directory matters here

`shared/` is a **source-only** TypeScript package consumed by `web/`, `site/` and `mobile/` through a
path alias. It is never installed and has no `node_modules`. **A deploy that checks out only `site/`
will not build** — `site/` compiles `../shared/src` directly. Check out the whole repository, as the
current layout already does.

### Could this release affect the deployed Admin Panel or Laravel backend?

**Yes. Both. This is not a frontend-only change.** Confirmed by `git diff --name-status c1881d7..HEAD`:

- **Backend — 40 files.** New: `routes/api_public.php`, `app/Http/Controllers/Public/*` (2),
  `app/Http/Resources/Public/*` (4), `app/Services/Settings/SiteHeroSlideService.php`,
  `TeamMemberService.php`, `app/Services/Course/PublicCourseService.php`, `app/Support/YouTube.php`,
  2 enums, 2 models, 2 policies, 8 Form Requests, **4 migrations**.
  Modified: `bootstrap/app.php` (registers the new route group), **`config/cors.php`**,
  `routes/api.php`, `app/Models/CompanySetting.php`, `CompanySettingResource.php`,
  `CompanySettingsService.php`, `app/Support/PlainText.php`, `AppServiceProvider.php` (new rate
  limiter), `database/seeders/DatabaseSeeder.php`.
- **Admin panel — gains a "Website Configuration" section** (hero slides, About video, team) and
  `web/vite.config.ts` changed. **`web/` must be rebuilt and redeployed** or the admin panel will not
  have the screens that manage the website's content.
- **Risk to the existing admin login: one item, and it is the only real one.** `config/cors.php` now
  reads `FRONTEND_URLS` (comma-separated) and falls back to the old `FRONTEND_URL`. The fallback
  means the admin panel keeps working if nothing is changed — but then the website's origin is not
  allowed and **every request from `theplanbs.com` fails silently**: the API answers `200`, the
  browser discards the body, and nothing appears in any log. Set `FRONTEND_URLS` with **both** hosts
  (§5) and this is a non-event. This exact fault already happened once in development; it is recorded
  in `docs/CHANGELOG.md` and covered by `backend/tests/Feature/CorsTest.php`.
- **No change to any existing table, endpoint or permission.** The 4 migrations only create two new
  tables and add nullable columns to `company_settings`. No `down()` is destructive to existing data.

### Release tagging — **REQUIRED FROM DEVELOPER**

There is **no tag** in this repository, and commit `9d215f0` **has not been pushed** — `origin/master`
is one commit behind. Before deployment:

```bash
# On the developer's machine
git push origin master
git tag -a site-v1.0.0 -m "Public website launch"
git push origin site-v1.0.0
```

Deploy the **tag**, not `master`. Do not deploy a moving branch.

---

## 2. Build process

Node is needed **only at build time**. The output is static files; nothing runs continuously. No
Node process, no PM2, no systemd unit for the frontend.

**Build output directory: `dist`** — Vite's default, not overridden (`site/vite.config.ts` sets no
`build.outDir`). Verified: `site/dist/` contains `index.html`, `assets/`, `images/`, `logo.png` and
totals 1.4 MB.

`npm run build` is `tsc -b && vite build` (`site/package.json`), so a type error fails the build.
That is intentional — treat a failed build as a stop, never as a warning.

```bash
# 1. Install dependencies — `npm ci` (exact lockfile), never `npm install`, which can drift
cd /var/www/planb/site
npm ci

# 2. Production environment file  (values in §3; must exist BEFORE the build — Vite bakes them in)
cp .env.example .env.production
nano .env.production

# 3. Build
npm run build

# 4. Verify — all four must pass
test -f dist/index.html && echo "index.html OK"
ls dist/assets/*.js >/dev/null && echo "JS bundles OK"
grep -q "api.theplanbs.com" dist/assets/*.js && echo "API URL baked in OK"
grep -c "localhost" dist/assets/*.js   # MUST print 0 — a non-zero count means a wrong .env
```

Step 4's third check matters more than it looks: the API URL is compiled into the JavaScript. If
`.env.production` was wrong or missing, the build still succeeds and produces a site that calls
`localhost`. There is no runtime configuration to fix it afterwards — you rebuild.

### Deploying the files without touching the admin panel

They are different directories, so there is no overlap as long as the document roots stay distinct
(§7). Use a release directory plus a symlink so a rollback is instant and there is no moment where
the site is half-copied:

```bash
sudo mkdir -p /var/www/releases/site
TS=$(date +%Y%m%d-%H%M%S)
sudo cp -r /var/www/planb/site/dist /var/www/releases/site/$TS
sudo ln -sfn /var/www/releases/site/$TS /var/www/releases/site/current   # atomic swap
sudo chown -R www-data:www-data /var/www/releases/site/$TS
```

Nginx's root then points at `/var/www/releases/site/current`. **Recommendation**, not a requirement —
serving `/var/www/planb/site/dist` directly also works, but then a rollback means a rebuild.

---

## 3. Environment variables

**The website reads exactly four variables.** All four are in
`site/src/lib/constants.ts` and nowhere else; `grep -rn "import.meta.env" site/src` returns only that
file. Everything under `VITE_*` is **compiled into the public bundle** — it is readable by anyone who
opens the site. No secret may ever be placed here.

| Variable | Purpose | Production value | Used in | Mandatory |
|---|---|---|---|---|
| `VITE_API_BASE_URL` | Axios `baseURL`. Every API path is appended to it | `https://api.theplanbs.com/api/v1` | `site/src/lib/constants.ts:5` → `site/src/api/client.ts` | **Yes** |
| `VITE_API_URL` | API **origin only**, used to build `/sanctum/csrf-cookie`, which sits outside `/api/v1` | `https://api.theplanbs.com` | `constants.ts:6` → `client.ts` `ensureCsrfCookie()` | **Yes** |
| `VITE_SITE_URL` | This site's own origin, for canonical and OpenGraph URLs | `https://theplanbs.com` | `constants.ts:10` | Optional — falls back to `window.location.origin`. Set it anyway, so crawlers and prerenders agree |
| `VITE_APP_NAME` | Display name | `Plan B International` | `constants.ts:7` | Optional — defaults to the same string |

### The API URL question, answered from the code

The engineer asked whether it is `https://api.theplanbs.com` or `https://api.theplanbs.com/api/v1`
and asked us not to assume. **It is both, in two different variables** — that is why there are two:

- `apiClient` is created with `baseURL: API_BASE_URL` and then called as
  `apiClient.get('/public/site-content')` (`site/src/api/siteContent.api.ts`). For that to resolve to
  `https://api.theplanbs.com/api/v1/public/site-content`, `VITE_API_BASE_URL` **must include
  `/api/v1`** and must not have a trailing slash.
- `ensureCsrfCookie()` builds `` `${API_URL}/sanctum/csrf-cookie` `` (`client.ts`). Laravel serves
  that route at the domain root, not under `/api/v1`, so `VITE_API_URL` **must be the bare origin**.

Setting both to the same value breaks one of the two. Setting `VITE_API_BASE_URL` without `/api/v1`
makes every call 404.

### Variables the request asked about that do **not** exist here

Confirmed absent from `site/`, because the features are not built:

- **Google sign-in client ID** — no `VITE_GOOGLE_*`. Google sign-in exists only in the mobile app
  (`GOOGLE_CLIENT_IDS`, backend `.env`).
- **Payment configuration** — none. Payments are server-side only (`PAYMENTS_ENABLED`,
  `PAYMENT_GATEWAY`, `PAYHERE_*` in the backend `.env`), and a browser must never hold a payment
  credential. `PAYMENTS_ENABLED` is `false` by default.
- **Bunny/video configuration** — none. Video access is a signed, short-lived URL minted by the API
  per request (`backend/CLAUDE.md`, root `CLAUDE.md` §4); a client never holds a Bunny key.
- **Public asset URL** — none needed. Media URLs arrive fully formed in the API response, rebuilt
  against the requesting host by `backend/app/Support/PublicUrl.php`. Since the website calls
  `api.theplanbs.com`, images will be served from `https://api.theplanbs.com/storage/...` — which the
  existing deployment already serves. **No `/storage` location is needed on `theplanbs.com`.**
- **Any other third-party integration** — none in the bundle. The site loads Google Fonts and, only
  after a visitor clicks play, a `youtube-nocookie.com` iframe. Both are unauthenticated and need no
  variable.

No value in this section is sensitive, so no `<SECRET_REQUIRED>` placeholder is needed anywhere in
the frontend environment.

---

## 4. API endpoints and backend dependency

**The website calls three endpoints. That is the complete list**, from
`grep -rn "apiClient\.(get|post|put|patch|delete)" site/src`:

| Function | Method | Route | Auth | Content type | Uploads? | Notes |
|---|---|---|---|---|---|---|
| Home page content (hero slides, About video, team) | `GET` | `/api/v1/public/site-content` | **None** — anonymous | `application/json` | No | `site/src/api/siteContent.api.ts`. Rate limited `120/min` per IP |
| Course catalogue for the Programmes carousel | `GET` | `/api/v1/public/courses` | **None** — anonymous | `application/json` | No | `site/src/api/publicCourses.api.ts`. Paginated, `per_page` capped at 48 server-side |
| Session probe on every page load | `GET` | `/api/v1/student/me` | Session cookie | `application/json` | No | `site/src/api/auth.api.ts`, called by `useSessionBootstrap` from `RootLayout`. **Will return 401 for every visitor** until `API-5` lands. This is expected and handled — the store resolves to "signed out" and nothing is shown to the user. Expect one 401 per page load in the access log |

Registration, logout, password reset, profile, lessons, videos, payments, enrolment, uploads and
notifications: **no calls exist.** Nothing to configure, nothing to test.

`POST /sanctum/csrf-cookie` is reachable through `ensureCsrfCookie()` but nothing currently calls it,
because the only state-changing flow (sign-in) is not built.

### Do these routes exist in the deployed backend?

**`/api/v1/public/*` is new in this release.** It is registered in `backend/bootstrap/app.php` from
`backend/routes/api_public.php`, both of which are part of this commit. Verified locally:

```
GET|HEAD  api/v1/public/courses        → public.courses.index
GET|HEAD  api/v1/public/site-content   → public.site-content
```

**So backend code must be deployed.** Without it the website's two real endpoints 404 and the home
page falls back to its designed default copy — a hero with no photograph, and "No courses published
yet". It will look broken rather than error.

**Upload limits:** unchanged for the website (it uploads nothing). The new **admin** screens accept
JPG/PNG at **5 MB** for a hero slide image, team photo and About poster
(`backend/app/Http/Requests/Settings/Upload*Request.php`). If the existing `api.theplanbs.com` PHP
config already allows the admin panel's student photo and CV uploads, 5 MB is within it — **VERIFY
ON SERVER** that `upload_max_filesize` and `post_max_size` are ≥ 8M and that nginx's
`client_max_body_size` on the API host is ≥ 8M.

---

## 5. Authentication, cookies, CORS and CSRF

### What is actually implemented

| Question | Answer | Evidence |
|---|---|---|
| Sanctum cookies, Bearer tokens, or other? | **Admin panel:** Sanctum SPA **cookie session**. **Mobile app:** Sanctum **Bearer token**. **Website:** built to use a cookie session, but the student session guard does not exist yet — so today it authenticates nobody | `backend/config/auth.php`, `site/src/api/client.ts` |
| Does the website call `/sanctum/csrf-cookie` first? | The helper exists (`ensureCsrfCookie()`) and is wired to run before the first state-changing request and to retry after a 419. **Nothing currently triggers it**, because sign-in is not built | `site/src/api/client.ts` |
| Is `withCredentials: true` required? | **Yes, and it is already set**, together with `withXSRFToken: true`, on the single Axios instance | `site/src/api/client.ts` |

**Note for §12:** because `withCredentials` is set on *all* requests including the two anonymous ones,
CORS must be exactly right or the public endpoints fail. With credentials, the spec forbids a
wildcard `Access-Control-Allow-Origin`; `config/cors.php` therefore uses an explicit list and sets
`supports_credentials: true`.

### Exact Laravel `.env` values for the three hosts

Change these on `api.theplanbs.com`. **Everything else in the existing `.env` stays as it is** — no
secret is involved in this section.

```ini
APP_URL=https://api.theplanbs.com

# CORS. Comma-separated, no spaces, no trailing slash, exact origins.
# BOTH apps reach this API. Omitting the site host is the silent-failure case.
FRONTEND_URLS=https://admin.theplanbs.com,https://theplanbs.com,https://www.theplanbs.com

# Sessions. The leading dot is what lets api. and admin. share the admin cookie.
SESSION_DOMAIN=.theplanbs.com
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax
SESSION_ENCRYPT=true

# Which browser origins may open a stateful (cookie) session.
SANCTUM_STATEFUL_DOMAINS=admin.theplanbs.com,theplanbs.com,www.theplanbs.com
```

Notes, each one load-bearing:

- **`FRONTEND_URL` (singular) is superseded by `FRONTEND_URLS`.** The old key still works as a
  fallback, so leaving it in place is harmless — but if only the singular key is set, the website is
  not allowed and fails silently. `backend/.env.production.example` still documents the old key
  only; that is a **REQUIRED FROM DEVELOPER** doc fix, tracked below.
- **`SANCTUM_STATEFUL_DOMAINS` and the CORS list do different jobs and both are needed.** CORS
  decides whether the browser hands the response to JavaScript; Sanctum decides whether the request
  gets a session. The long version is in the comment block at the top of `backend/config/cors.php`.
- **Adding the site host to `SANCTUM_STATEFUL_DOMAINS` is safe but has no effect yet**, since no
  student can sign in. Add it now so it is not forgotten when `API-5` ships.
- **`config/cors.php` reads `env()`**, so the values are frozen by `php artisan config:cache`. After
  editing `.env` you **must** re-run `config:cache` (§9) or nothing changes.
- CORS `paths` is `['api/*', 'sanctum/csrf-cookie']` — already correct, no change.

### Will the admin panel and the website both authenticate without breaking admin login?

**Yes, with one caveat that is worth stating plainly.**

- The admin panel is unaffected: its origin stays in the allow-list, the session cookie and its
  domain are unchanged, and no guard, policy or middleware in its path changed.
- The website authenticates nobody today, so there is nothing to conflict with.
- **The caveat:** `SESSION_DOMAIN=.theplanbs.com` scopes the cookie to the parent domain, so once the
  student browser session exists the admin session cookie will also be *sent* on requests the
  public site makes to the API. Those requests are rejected — `EnsureAdminActor` and
  `EnsureStudentActor` reject the wrong actor type on every route group
  (`backend/CLAUDE.md` §1) — so this is defence in depth working as designed, not a hole.
  **Recommendation** for later, not now: serving the API under `/api` on each host instead of a
  third subdomain would make cookies host-only and remove that cross-sending entirely. It is a
  bigger change than this deployment should carry.

---

## 6. Domain behaviour

**Serve the website directly from `theplanbs.com`.** It is not a redirect to somewhere else — there
is no other student-portal URL. Confirmed from `site/src/routes/paths.ts`: the site owns `/` and the
portal lives on the *same* origin under `/app`, so a redirect would break it later.

- **Canonical host: `https://theplanbs.com`** (no `www`). It is what the client asked for, and what
  `VITE_SITE_URL` should be set to so canonical and OpenGraph tags agree.
- **`www.theplanbs.com` must work**, as a **301 redirect to the canonical host**, not a second copy.
  Two hosts serving identical content splits SEO and would need two certificates' worth of care for
  no benefit.
- Document root: the `dist` directory (§7). **SPA fallback is mandatory** — see §10.

---

## 7. Nginx configuration

New file, `/etc/nginx/sites-available/theplanbs.com`. **No change to the existing `api.` or `admin.`
server blocks is required.** They match on `server_name`, and this adds a different one.

The one thing to check before enabling: **whichever existing block is `default_server`**. If
`api.` or `admin.` carries `default_server`, an un-matched request to the bare IP lands there, which
is only cosmetic. Leave it alone unless you want the website to be the default.

```nginx
# ---------------------------------------------------------------- HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name theplanbs.com www.theplanbs.com;

    # Certbot's challenge must stay reachable over plain HTTP for renewals.
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

# ------------------------------------------------------------ the website
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name theplanbs.com;

    # Symlinked release directory (§2). Direct alternative:
    #   root /var/www/planb/site/dist;
    root /var/www/releases/site/current;
    index index.html;

    ssl_certificate     /etc/letsencrypt/live/theplanbs.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/theplanbs.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    charset utf-8;
    access_log /var/log/nginx/theplanbs.com.access.log;
    error_log  /var/log/nginx/theplanbs.com.error.log;

    # ---------------------------------------------------------- security headers
    add_header X-Content-Type-Options   "nosniff"                   always;
    add_header X-Frame-Options          "DENY"                      always;
    add_header Referrer-Policy          "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy       "geolocation=(), microphone=(), camera=()" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Content-Security-Policy, derived from what the bundle actually loads:
    #   connect  api.theplanbs.com            — the three API calls
    #   img      api.theplanbs.com (media), i.ytimg.com (YouTube posters), data:
    #   style    fonts.googleapis.com         — Inter + Noto Sans Sinhala
    #   font     fonts.gstatic.com
    #   frame    www.youtube-nocookie.com     — only after a visitor clicks play
    # 'unsafe-inline' on style-src is required: Vite emits inline styles and the
    # Google Fonts stylesheet is injected from index.html.
    add_header Content-Security-Policy "default-src 'self'; connect-src 'self' https://api.theplanbs.com; img-src 'self' data: https://api.theplanbs.com https://i.ytimg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; frame-src https://www.youtube-nocookie.com; script-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'" always;

    # ------------------------------------------------------------------ caching
    # Vite fingerprints every file in /assets, so they can be cached forever.
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        try_files $uri =404;         # a missing hashed asset must 404, not fall through
    }

    location /images/ {
        expires 30d;
        add_header Cache-Control "public";
        access_log off;
        try_files $uri =404;
    }

    # index.html must NEVER be cached, or a returning visitor keeps loading the
    # old build's asset filenames after a deploy and sees a blank page.
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

    location ~ /\. { deny all; }    # dotfiles
}
```

MIME handling needs nothing special — `/etc/nginx/mime.types` (included by `nginx.conf`) already
covers `.js`, `.css`, `.woff2`, `.webmanifest` and `.svg`. The build produces no unusual types.

Enable:

```bash
sudo ln -s /etc/nginx/sites-available/theplanbs.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 8. DNS and SSL

| Type | Name | Target | Proxy |
|---|---|---|---|
| `A` | `@` (`theplanbs.com`) | `147.93.172.79` | see below |
| `A` | `www` | `147.93.172.79` | same as the root record |

Use `A` records for both, not a `CNAME` on `www` — a `CNAME` is fine in principle but the root
cannot be one, and matching both keeps the certificate step simple.

**Do not touch the `MX` or `TXT` (SPF/DKIM) records** for `info@theplanbs.com`.

### Cloudflare: proxied or DNS only?

**Recommendation: DNS only (grey cloud) for the initial deployment.** Issue the certificate, confirm
the site and the admin login work, then turn the proxy on deliberately if you want it — with the
proxy on from the start, a misconfiguration is very hard to tell apart from a caching artefact.

If Cloudflare **is** proxied, three effects matter here:

1. **The real client IP is hidden.** The public endpoints are rate-limited per IP
   (`throttle:public-site`, 120/min, `backend/app/Providers/AppServiceProvider.php`). Behind an
   unconfigured proxy every visitor shares Cloudflare's IP and they would throttle each other. The
   backend already handles this: set `TRUSTED_PROXIES=cloudflare` in the Laravel `.env`
   (it is in `backend/.env.production.example`). **Mandatory if proxying.**
2. **Cookies and SSL mode.** Cloudflare must be **Full (strict)**. "Flexible" terminates TLS at the
   edge and talks HTTP to the origin, which breaks `SESSION_SECURE_COOKIE=true` — the admin login
   will appear to succeed and bounce straight back to the login screen.
3. **Caching.** Cloudflare must not cache `index.html` or any `/api/*` response. Default rules leave
   HTML uncached, but verify — a cached `index.html` serves a stale build after the next deploy.

Uploads are unaffected (they go to `api.` and are 5 MB, well under Cloudflare's 100 MB free-plan
limit).

### Certbot

```bash
sudo certbot --nginx -d theplanbs.com -d www.theplanbs.com --redirect \
  --agree-tos -m info@theplanbs.com --no-eff-email
```

Run it **after** DNS resolves to the server and **with Cloudflare set to DNS-only** — the HTTP-01
challenge must reach this host. Both names go on one certificate, which is what the server blocks
above expect (`/etc/letsencrypt/live/theplanbs.com/`).

Then confirm renewal works: `sudo certbot renew --dry-run`.

---

## 9. Database and Laravel changes

| Item | Required? | Detail |
|---|---|---|
| New migrations | **Yes — 4** | `2026_09_25_090000_create_site_hero_slides_table`, `..._090100_create_team_members_table`, `..._090200_add_website_content_to_company_settings_table`, `..._120000_add_social_links_to_team_members_table`. Two new tables; nullable columns added to `company_settings`. **No existing column is altered or dropped** |
| Seeders | **One, optional** | `WebsiteContentSeeder` — puts Plan B's designed hero and About copy into the database so the admin has something to edit. It is **idempotent and non-destructive**: it writes nothing if any slide exists, and fills only About fields that are still empty. It seeds **no** team members. Safe to run in production; **do not run `db:seed` without `--class`** |
| New roles or permissions | **No** | The new policies reuse the existing `SuperAdmin` and `ContentManager` roles (`app/Policies/TeamMemberPolicy.php`, `SiteHeroSlidePolicy.php`). No permission table change |
| New queues or scheduled jobs | **No** | Nothing in this release dispatches a job. The existing worker and cron are unchanged — but they remain **mandatory for student sign-in generally** (`backend/CLAUDE.md` §6) |
| Laravel `.env` changes | **Yes** | `FRONTEND_URLS` and `SANCTUM_STATEFUL_DOMAINS` (§5). Nothing else |
| New storage directories or symlinks | **No** | Hero images and team photos use Spatie Media Library on the existing `public` disk, so the existing `storage:link` covers them. Confirm the link exists: `ls -l /var/www/planb/backend/public/storage` |
| Supervisor changes | **No** | |
| PHP / nginx upload limits | **Verify only** | 5 MB per admin image upload; needs `upload_max_filesize` and `post_max_size` ≥ 8M and `client_max_body_size` ≥ 8M on the API host |
| Cache clearing / queue restart | **Yes, mandatory** | `config/cors.php` reads `env()`, which `config:cache` freezes. Without re-caching, the new `FRONTEND_URLS` is ignored |

```bash
cd /var/www/planb/backend

composer install --no-dev --optimize-autoloader

php artisan migrate --force                            # 4 migrations, additive only
php artisan db:seed --class=WebsiteContentSeeder --force   # optional, idempotent

php artisan config:clear && php artisan config:cache
php artisan route:clear  && php artisan route:cache
php artisan view:clear   && php artisan view:cache
php artisan queue:restart                              # workers pick up new code

# Confirm the new routes are live
php artisan route:list --path=api/v1/public
```

`php artisan migrate --force` only runs the 4 pending files; it does not touch anything already in
the `migrations` table, and it does not read or write `.env` beyond the database credentials.

---

## 10. Frontend routing and refresh behaviour

Router: **`react-router-dom` 6.30.x**, `createBrowserRouter` — real URLs, no hash routing
(`site/src/routes/router.tsx`).

**No base path is configured.** `site/vite.config.ts` sets no `base`, and the router is created with
no `basename`, so the app is served from the domain root. Do not deploy it into a subdirectory
without setting both.

Routes (all from `site/src/routes/paths.ts` and `router.tsx`):

- **Public:** `/` (built), `/courses`, `/courses/:slug`, `/bundles/:slug`, `/services`,
  `/checkout/:orderId`, `/payment/:status`, `/privacy`, `/terms` — the last eight are placeholders.
- **Portal (all placeholders, all unreachable today):** `/app`, `/app/courses`, `/app/courses/:id`,
  `/app/courses/:id/paper`, `/app/lessons/:id`, `/app/paper-attempts/:attemptId`, `/app/services`,
  `/app/checklist`, `/app/orders`, `/app/wishlist`, `/app/profile`.
- **Unknown paths** redirect to `/` (`{ path: '*', element: <Navigate to="/" replace /> }`). A real
  404 page is a later task, so a mistyped URL silently goes home rather than showing an error.

Confirmations:

- **Direct access to a nested route works — only with the SPA fallback in place.**
  `try_files $uri $uri/ /index.html` is what makes `https://theplanbs.com/courses` return the app
  instead of nginx's 404. Without it, every route except `/` fails on a direct hit.
- **Browser refresh on a nested route works** for the same reason, and for the same reason it is the
  first thing to break if the fallback is missing. It is in the server block in §7.
- **API routes cannot be captured by the frontend.** They are on a different host
  (`api.theplanbs.com`). There is no `/api` location on this server block at all, so there is nothing
  to collide.
- **Anchor links** (`/#about`, `/#team`) are handled in the browser and need no server support.

---

## 11. Deployment safety and rollback

### Back up first

```bash
TS=$(date +%Y%m%d-%H%M%S)
sudo mkdir -p /var/backups/planb/$TS

# 1. Laravel .env — the single most important file on the server
sudo cp /var/www/planb/backend/.env /var/backups/planb/$TS/backend.env

# 2. Database
mysqldump -u <db_user> -p --single-transaction --routines planb \
  | gzip > /var/backups/planb/$TS/planb.sql.gz

# 3. Uploaded files
sudo tar czf /var/backups/planb/$TS/storage-app.tar.gz \
  -C /var/www/planb/backend/storage app

# 4. The current admin panel build, and the deployed commit
sudo tar czf /var/backups/planb/$TS/web-dist.tar.gz -C /var/www/planb/web dist
git -C /var/www/planb rev-parse HEAD | sudo tee /var/backups/planb/$TS/PREVIOUS_COMMIT
```

That last line is what makes a rollback possible. Do not skip it.

### Things that must not be overwritten

| Path | Why |
|---|---|
| `backend/.env` | Git-ignored, so `git checkout` will not touch it — but never `cp .env.example .env` on this server |
| `backend/storage/app/` | Every uploaded photo, CV and document |
| `backend/public/storage` | The symlink to the above |
| `web/dist/` | The live admin panel. `git checkout` does not touch it (`dist` is ignored), but a careless `rm -rf` in `web/` would |
| The database | Only `migrate --force` should touch it |

`git status` on the server should be clean apart from ignored files. If it is not, **stop** and find
out what was edited in place before checking anything out.

### Deployment order

The order matters in one specific way: **the backend must be live before the website is**, or the
first visitors get a home page with no content. The admin panel rebuild can follow.

1. Read-only pre-deployment checks
2. Backup
3. `git fetch && git checkout site-v1.0.0`
4. Backend: `composer install`, `migrate`, seeder, caches, `queue:restart`
5. Laravel `.env`: `FRONTEND_URLS`, `SANCTUM_STATEFUL_DOMAINS`, then `config:cache` again
6. Rebuild and redeploy the **admin panel** (`web/`) — it needs the new Website Configuration screens
7. Build and deploy the **website** (`site/`)
8. Nginx server block + Certbot
9. Verify (§12)

### Expected interruption

- **The website:** none — it does not exist publicly yet.
- **The API:** a few seconds during `config:cache` / `route:cache`, when a request can be served
  mid-rebuild. Run `php artisan down --render="errors::503"` around steps 4–5 if you want zero risk;
  for an additive release it is usually unnecessary. The migrations are additive and fast.
- **The admin panel:** a few seconds while `web/dist` is swapped. Use the same
  release-directory-plus-symlink approach to make it atomic.

### Rollback

```bash
# --- frontend only (website or admin panel looks wrong) ---
# With release directories: repoint the symlink. Instant, no rebuild.
sudo ln -sfn /var/www/releases/site/<previous-timestamp> /var/www/releases/site/current
sudo systemctl reload nginx

# --- API misbehaving ---
cd /var/www/planb
git checkout $(cat /var/backups/planb/<TS>/PREVIOUS_COMMIT)
cd backend
composer install --no-dev --optimize-autoloader
php artisan config:clear && php artisan config:cache
php artisan route:clear  && php artisan route:cache
php artisan queue:restart
```

**On rolling back migrations:** you almost certainly should not. The 4 migrations only add tables and
nullable columns, so **old code runs perfectly against the new schema** — leave them. If something
must be undone, `php artisan migrate:rollback --step=4` drops the two new tables and the added
columns, which destroys any website content the client has entered. Restore from the dump instead.

To restore the admin panel build without a rebuild:
`sudo tar xzf /var/backups/planb/<TS>/web-dist.tar.gz -C /var/www/planb/web`.

---

## 12. Verification checklist

The requested checklist assumes features that do not exist. Below is the same list with each item
marked ✅ testable, ⚠️ partly testable, or ❌ **not applicable — feature not built**.

### ✅ Domains, SSL, delivery

```bash
curl -sI https://theplanbs.com | head -3                  # expect 200, text/html
curl -sI https://www.theplanbs.com | head -3              # expect 301 → https://theplanbs.com/
curl -sI http://theplanbs.com | head -3                   # expect 301 → https
curl -sI https://theplanbs.com/courses | head -3          # expect 200 — SPA fallback works
curl -sI https://theplanbs.com/nonexistent-path | head -3 # expect 200 (app redirects home)
curl -sI https://theplanbs.com/assets/index-*.js | grep -i cache-control  # immutable
curl -sI https://theplanbs.com/ | grep -i cache-control   # must be no-store
echo | openssl s_client -connect theplanbs.com:443 -servername theplanbs.com 2>/dev/null \
  | openssl x509 -noout -dates -subject                   # cert covers both names, not expired
```

### ✅ API communication and CORS — the most likely thing to be wrong

```bash
# Must return JSON, and the header must echo the site's exact origin
curl -s -D - -o /dev/null https://api.theplanbs.com/api/v1/public/site-content \
  -H "Origin: https://theplanbs.com" | grep -i "access-control-allow"
#   expect: access-control-allow-origin: https://theplanbs.com
#           access-control-allow-credentials: true

curl -s https://api.theplanbs.com/api/v1/public/courses | head -c 300   # expect JSON
curl -s -D - -o /dev/null https://api.theplanbs.com/api/v1/public/site-content \
  -H "Origin: https://evil.example" | grep -ci "access-control-allow-origin"
#   expect: 0  — an unlisted origin must NOT be allowed
```

If the first command returns JSON but **no** `access-control-allow-origin`, that is the silent
failure described in §1: the API is healthy and the browser is throwing the body away. Fix
`FRONTEND_URLS` and re-run `config:cache`.

### ✅ In the browser, on `https://theplanbs.com`

1. Hero section shows the slides from the admin panel (not the built-in fallback copy).
2. "Our Programmes" lists real published courses, and the prev/next arrows scroll the row.
3. "Community & trust" video shows a poster; clicking it loads the YouTube player.
4. "The Team" shows the people added in the admin panel, with Facebook/LinkedIn icons where set.
5. Switch the language to Sinhala — content changes (the server picks the column from
   `Accept-Language`).
6. DevTools → Console: no CORS errors, no mixed-content warnings, no CSP violations.
7. DevTools → Network: exactly three API calls — `site-content`, `courses`, and `student/me`
   returning **401 (expected)**.
8. Refresh while on `/courses` — the placeholder page loads, not an nginx 404.
9. Resize to 375px wide: no horizontal scrollbar, tap targets comfortable, carousels swipe.

### ✅ Admin panel — must be re-checked after this release

1. Log in at `https://admin.theplanbs.com` — **this is the regression to watch for.** If login now
   bounces back to the login screen, the cause is almost always `SESSION_DOMAIN` or Cloudflare SSL
   mode (§8), not this release's code.
2. Sidebar shows **Website Configuration** with Hero Slider, About video and The Team.
3. Add a hero slide with an image, mark it visible, and confirm it appears on the website.
4. Upload a team photo (≤5 MB) — confirms upload limits on the API host.

### ❌ Not applicable — the feature does not exist

Student registration · login/logout · password reset · authentication cookies for students ·
lesson/video playback · payments · student file uploads. There is no UI and no API call for any of
them in this frontend. Re-test these when `API-5` and `PUB-7` ship.

### ✅ Logs

```bash
sudo tail -n 100 /var/log/nginx/theplanbs.com.error.log
sudo tail -n 100 /var/log/nginx/theplanbs.com.access.log
sudo tail -n 200 /var/www/planb/backend/storage/logs/laravel-$(date +%Y-%m-%d).log
sudo supervisorctl status                # queue workers still running
php artisan queue:failed                 # expect empty
```

A run of `401` on `/api/v1/student/me` in the access log is **expected and harmless** (§4).

---

## 13. Final deployment command sequence

Replace `<db_user>`, `<TS>` and `<previous-timestamp>` as you go. Nothing below prints or requires a
secret.

```bash
# =============================================================================
# 1. READ-ONLY PRE-DEPLOYMENT CHECKS
# =============================================================================
git -C /var/www/planb rev-parse HEAD                  # record the current commit
git -C /var/www/planb status --porcelain               # MUST be empty; if not, stop
node -v                                                # need ^20.19 or >=22.12
php -v                                                 # expect 8.3
nginx -t
ls -l /var/www/planb/backend/public/storage            # storage symlink present
php -i | grep -E "upload_max_filesize|post_max_size"   # both >= 8M
sudo supervisorctl status                              # workers running

# =============================================================================
# 2. BACKUP
# =============================================================================
TS=$(date +%Y%m%d-%H%M%S); sudo mkdir -p /var/backups/planb/$TS
sudo cp /var/www/planb/backend/.env /var/backups/planb/$TS/backend.env
mysqldump -u <db_user> -p --single-transaction --routines planb | gzip > /var/backups/planb/$TS/planb.sql.gz
sudo tar czf /var/backups/planb/$TS/storage-app.tar.gz -C /var/www/planb/backend/storage app
sudo tar czf /var/backups/planb/$TS/web-dist.tar.gz -C /var/www/planb/web dist
git -C /var/www/planb rev-parse HEAD | sudo tee /var/backups/planb/$TS/PREVIOUS_COMMIT
echo "Backup at /var/backups/planb/$TS"

# =============================================================================
# 3. CODE UPDATE TO THE APPROVED TAG
# =============================================================================
cd /var/www/planb
git fetch --all --tags
git checkout site-v1.0.0                               # NOT `git pull origin master`
git log -1 --oneline

# =============================================================================
# 4. BACKEND  (must be live before the website)
# =============================================================================
cd /var/www/planb/backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan db:seed --class=WebsiteContentSeeder --force     # optional, idempotent

# --- edit .env: FRONTEND_URLS + SANCTUM_STATEFUL_DOMAINS (§5) ---
sudo nano /var/www/planb/backend/.env

php artisan config:clear && php artisan config:cache
php artisan route:clear  && php artisan route:cache
php artisan view:clear   && php artisan view:cache
php artisan queue:restart
php artisan route:list --path=api/v1/public                  # expect 2 routes

# =============================================================================
# 5. ADMIN PANEL REBUILD  (it gains the Website Configuration screens)
# =============================================================================
cd /var/www/planb/web
npm ci
# ensure web/.env.production points at https://api.theplanbs.com/api/v1
npm run build
sudo mkdir -p /var/www/releases/web
sudo cp -r dist /var/www/releases/web/$TS
sudo chown -R www-data:www-data /var/www/releases/web/$TS
# then repoint the admin server block's root, or copy over the existing dist

# =============================================================================
# 6. WEBSITE BUILD AND DEPLOY
# =============================================================================
cd /var/www/planb/site
npm ci
cp .env.example .env.production && nano .env.production      # §3 — four variables
npm run build
grep -c localhost dist/assets/*.js                           # MUST be 0
sudo mkdir -p /var/www/releases/site
sudo cp -r dist /var/www/releases/site/$TS
sudo ln -sfn /var/www/releases/site/$TS /var/www/releases/site/current
sudo chown -R www-data:www-data /var/www/releases/site/$TS

# =============================================================================
# 7. NGINX AND SSL
# =============================================================================
sudo nano /etc/nginx/sites-available/theplanbs.com            # block from §7
sudo ln -s /etc/nginx/sites-available/theplanbs.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d theplanbs.com -d www.theplanbs.com --redirect \
  --agree-tos -m info@theplanbs.com --no-eff-email
sudo nginx -t && sudo systemctl reload nginx
sudo certbot renew --dry-run

# =============================================================================
# 8. VERIFY  (full list in §12)
# =============================================================================
curl -sI https://theplanbs.com | head -3
curl -sI https://theplanbs.com/courses | head -3
curl -s -D - -o /dev/null https://api.theplanbs.com/api/v1/public/site-content \
  -H "Origin: https://theplanbs.com" | grep -i "access-control-allow"
# then the browser checks in §12, INCLUDING admin panel login

# =============================================================================
# 9. ROLLBACK  (only if needed)
# =============================================================================
sudo ln -sfn /var/www/releases/site/<previous-timestamp> /var/www/releases/site/current
sudo systemctl reload nginx
# API:
cd /var/www/planb && git checkout $(cat /var/backups/planb/$TS/PREVIOUS_COMMIT)
cd backend && composer install --no-dev --optimize-autoloader
php artisan config:clear && php artisan config:cache
php artisan route:clear  && php artisan route:cache && php artisan queue:restart
# Leave the migrations in place — they are additive and old code runs against them.
```

---

## 14. REQUIRED FROM DEVELOPER

Consolidated. Nothing above can be finished without these.

1. **Push and tag the release.** `9d215f0` is local only, and no tag exists. §1.
2. **Decide what is being launched, publicly.** This is the marketing website, not the student
   portal. Sign-in says "Coming soon". Confirm that is acceptable, or hold the launch for `API-5`
   and `PUB-7`.
3. **Replace or remove the invented testimonials.** The "Our Values" wall ships 13 fabricated
   students — names, job titles, quotes and sample photographs. Publishing fabricated testimonials
   is deceptive advertising. `site/src/features/marketing/homeContent.ts`.
4. **Verify or change the "500+ Students" claims** in the hero stat and the About heading. Both are
   editable in the admin panel.
5. **Real contact details.** `site/src/lib/siteContact.ts` ships `+94 11 000 0000`,
   WhatsApp `94110000000`, `info@planbinternational.lk` and "Colombo, Sri Lanka". The floating
   WhatsApp button currently dials a number that does not exist. Note the domain in that email is
   also the wrong one — the live domain is `theplanbs.com`.
6. **Fill `LEGAL_COMPANY_ADDRESS` and `LEGAL_COMPANY_REGISTRATION_NUMBER`** in the Laravel `.env`.
   They print on `/privacy` and `/terms`. (Those two routes are themselves still placeholders —
   `PUB-2`.)
7. **Add the favicon files.** `site/index.html` references `/icons/icon-192.png` twice and
   `site/public/icons/` does not exist, so it 404s and the site has no favicon or Apple touch icon.
8. **Add `robots.txt` and `sitemap.xml`** to `site/public/`. Neither exists.
9. **Update `backend/.env.production.example`** — it documents `FRONTEND_URL` (singular) and
   `SANCTUM_STATEFUL_DOMAINS=admin.<domain>` only, which would reproduce the silent CORS failure on
   the next fresh deploy. `backend/tests/Feature/EnvironmentTemplateTest.php` asserts the old key and
   needs the same change.
10. **Fix the four broken references to `docs/SECURITY_AND_LAUNCH_GUIDE.md`**, which does not exist.
    One of them is the pre-flight pointer on the `PAYMENTS_ENABLED` line.
11. **Decide on Cloudflare** (proxied vs DNS only) before Certbot runs. §8.
12. **Confirm `PAYMENTS_ENABLED=false` is intended at launch.** The site will show "Coming soon"
    beside prices.

### Recommendations, not requirements

- `site/public/logo.png` is **590 KB** and loads in the header on every page. Re-export it at the
  size it is displayed; it is the single largest asset in the bundle.
- **No prerendering** (`FND-5`). The site is client-rendered, so a crawler's first pass and every
  WhatsApp or Facebook link preview sees only the static fallback tags in `index.html`. For a
  marketing site this is worth fixing before any advertising spend.
- **`react-router` open-redirect advisory** GHSA-wrjc-x8rr-h8h6 affects both `site/` and `web/`; the
  fix is a major-version upgrade (`SEC-14`).
- Set up **off-server backups** (Backblaze B2 is in the stack) — `/var/backups` on the same disk does
  not survive the disk.
