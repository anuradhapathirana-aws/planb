# Deployment Readiness Report — Plan B International

**Target:** New Contabo VPS, Ubuntu 24.04 LTS
**Prepared:** 16 September 2026
**Scope:** Laravel API (`backend/`) and React admin panel (`web/`). The student mobile app (`mobile/`)
is built separately through Expo EAS and is **not** deployed to this server.

Items marked **REQUIRED FROM DEVELOPER** must be supplied before or during deployment. No secrets are
included in this document; sensitive values are shown as `<SECRET_REQUIRED>`.

A step-by-step install guide already exists in the repository at `docs/deployment.md`, and video
setup is in `docs/bunny-stream-setup.md`. This report summarises and confirms them.

---

## 1. Source Code

| Item | Value |
|---|---|
| Repository | `https://github.com/anuradhapathirana-aws/planb.git` — **one repository** (monorepo) holding backend and frontend |
| Backend repository URL | Same repository, folder `backend/` |
| Frontend repository URL | Same repository, folder `web/` |
| Visibility | **Currently public** (readable without login). **REQUIRED FROM DEVELOPER:** decide whether to make it private before go-live. If private, the server clones with a read-only **deploy key**. |
| Production branch | `master` |
| Production tag | None exists yet. **REQUIRED FROM DEVELOPER:** merge the current release work into `master`, push it, and create a release tag (e.g. `v1.0.0`) to deploy from. |
| Backend directory | `<repo>/backend` — web root is `<repo>/backend/public` |
| Frontend directory | `<repo>/web` — build output is `<repo>/web/dist` |
| Shared code | `<repo>/shared` — TypeScript source compiled into the frontend at build time. **The whole repository must be cloned**; building `web/` alone fails without `../shared`. |
| Git submodules | None |

Suggested server path: `/var/www/planb` (so backend = `/var/www/planb/backend`).

---

## 2. Version Requirements

| Component | Required | Notes |
|---|---|---|
| Laravel | **11.x** (locked at 11.55.1) | |
| PHP | **8.2 or newer — 8.3 recommended** | Ubuntu 24.04 ships PHP 8.3; no PPA needed |
| Composer | **2.x** (2.7+ recommended) | |
| React | **18.3** | |
| Build tool | **Vite 8.2**, TypeScript 5.9, Tailwind CSS 4.3 | |
| Node.js | **22 LTS recommended** (minimum 20.19.0) | Vite 8 refuses Node below 20.19. Only needed at build time. |
| Package manager | **npm 10.x** | Project uses `package-lock.json`. Do not use yarn or pnpm. |
| Database | **MySQL 8.0** (8.0 or 8.4 LTS) | Developed and tested on MySQL 8.0. MariaDB is **not tested** — use MySQL. |

### Required PHP extensions

```
php8.3-fpm  php8.3-cli  php8.3-mysql  php8.3-mbstring  php8.3-xml  php8.3-curl
php8.3-zip  php8.3-gd  php8.3-bcmath  php8.3-intl
```

This covers every extension the locked packages require: `ctype`, `curl`, `dom`, `exif`, `fileinfo`,
`filter`, `gd`, `hash`, `iconv`, `json`, `libxml`, `mbstring`, `openssl`, `pcre`, `pdo_mysql`,
`session`, `tokenizer`, `xml`, `zip`, `zlib`. Most are compiled into Ubuntu's PHP by default; confirm
with `php -m`. **GD is required** (image re-encoding). Imagick is **not** required.

---

## 3. Backend Deployment

### 3.1 Commands (first deploy)

```bash
# Clone
sudo mkdir -p /var/www/planb && sudo chown deploy:deploy /var/www/planb
git clone https://github.com/anuradhapathirana-aws/planb.git /var/www/planb
cd /var/www/planb && git checkout <RELEASE_TAG>          # REQUIRED FROM DEVELOPER

cd /var/www/planb/backend

# Dependencies
composer install --no-dev --optimize-autoloader --no-interaction

# Environment
cp .env.example .env
chmod 600 .env
nano .env                                                  # fill in values from Section 4

# App key (first deploy ONLY — never regenerate on a live server)
php artisan key:generate --force

# Database
php artisan migrate --force
php artisan db:seed --class=RoleSeeder --force             # required: creates admin roles

# First Super Admin (prompts for name, email, password)
php artisan admin:create

# Public storage link (profile photos, thumbnails, banners)
php artisan storage:link

# Caches
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
```

> ⚠️ **Never run `php artisan db:seed` without `--class`, and never `migrate --seed`, in production.**
> The full seeder creates demo admin accounts with a known password and fake students.

Optional seeders — **REQUIRED FROM DEVELOPER / client decision:**
- `IndustrySeeder` — starter list of industries and professions. Can instead be entered in the admin panel.
- `HomeCarouselSeeder` — sample home-screen banners. Banners can be managed in the admin panel.

### 3.2 Permissions

```bash
sudo chown -R deploy:www-data /var/www/planb/backend
sudo find /var/www/planb/backend -type d -exec chmod 755 {} \;
sudo find /var/www/planb/backend -type f -exec chmod 644 {} \;
sudo chown -R www-data:www-data /var/www/planb/backend/storage /var/www/planb/backend/bootstrap/cache
sudo chmod -R 775 /var/www/planb/backend/storage /var/www/planb/backend/bootstrap/cache
sudo chmod 600 /var/www/planb/backend/.env && sudo chown www-data:www-data /var/www/planb/backend/.env
```

### 3.3 Clearing and rebuilding caches

```bash
php artisan optimize:clear          # clears config, route, view, event, cache
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
php artisan queue:restart           # workers pick up new code/config
```

Run after every `.env` change — cached config ignores `.env` edits until rebuilt.

### 3.4 Queue workers (Supervisor) — **mandatory**

Student sign-in codes are emailed by a queued job. **If the worker is not running, no student can log
in**, and nothing shows an error.

`/etc/supervisor/conf.d/planb-worker.conf`:

```ini
[program:planb-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/planb/backend/artisan queue:work database --tries=3 --timeout=120 --sleep=3 --max-time=3600
autostart=true
autorestart=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/planb/backend/storage/logs/worker.log
stopwaitsecs=180
```

```bash
sudo supervisorctl reread && sudo supervisorctl update && sudo supervisorctl start planb-worker:*
sudo supervisorctl status
```

### 3.5 Scheduler (cron) — **mandatory**

```bash
sudo crontab -u www-data -e
```

```cron
* * * * * cd /var/www/planb/backend && php artisan schedule:run >> /dev/null 2>&1
```

Scheduled task today: `exchange-rate-refresh` (AED→LKR rate shown in the app), hourly at :05, runs
every 6 hours. It dispatches a queued job, so it needs the worker as well.

### 3.6 Every later deploy

```bash
cd /var/www/planb && git fetch --tags && git checkout <NEW_TAG>
cd backend
composer install --no-dev --optimize-autoloader --no-interaction
php artisan migrate --force
php artisan optimize:clear
php artisan config:cache && php artisan route:cache && php artisan view:cache && php artisan event:cache
php artisan queue:restart
```

Then rebuild and redeploy `web/dist` (Section 6).

### 3.7 Feature confirmation

| Feature | Used? | Details |
|---|---|---|
| Queue workers | **Yes** | `database` driver. Sends sign-in codes, account-deletion codes, admin lockout emails, exchange-rate refresh |
| Scheduled tasks | **Yes** | One task (above). Needs cron |
| Supervisor | **Yes** | To keep `queue:work` running |
| Redis | **No** | Cache, sessions and queue all use MySQL tables |
| WebSockets | **No** | No broadcasting (`BROADCAST_CONNECTION=log`) |
| Laravel Horizon | **No** | Not installed (it would require Redis) |
| Uploaded / local files | **Yes** | Stored on local disk under `backend/storage/app/` — see Section 9 |
| PDF generation | **No** | No PDFs are generated. PDFs are only *uploaded* (student CVs, bank-transfer receipts) |
| Image processing | **Yes** | Intervention Image 3 + Spatie Media Library, **GD driver**. Every uploaded image is re-encoded |
| Video processing | **No** (on server) | Lesson videos upload from the admin's browser directly to **Bunny Stream**, which encodes them. No ffmpeg needed |
| Special system packages | **None** | Beyond Nginx, PHP-FPM + extensions, MySQL, Supervisor, Certbot, git, unzip |

---

## 4. Environment Configuration

### 4.1 Backend — `backend/.env`

Values shown are the production setting where it is fixed; otherwise a placeholder.

```env
# --- Application ---
APP_NAME="Plan B International"
APP_ENV=production
APP_KEY=<generated by php artisan key:generate>
APP_DEBUG=false
APP_TIMEZONE=UTC
APP_URL=https://api.<DOMAIN>                 # must be the PUBLIC https API URL — image URLs are built from it
FRONTEND_URL=https://admin.<DOMAIN>          # also the CORS allowed origin
APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_MAINTENANCE_DRIVER=file
BCRYPT_ROUNDS=12

# --- Logging ---
LOG_CHANNEL=stack
LOG_STACK=daily
LOG_DAILY_DAYS=14
LOG_LEVEL=warning
LOG_DEPRECATIONS_CHANNEL=null

# --- Database ---
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=planb
DB_USERNAME=planb
DB_PASSWORD=<SECRET_REQUIRED>

# --- Session / admin login (cookie shared by api. and admin.) ---
SESSION_DRIVER=database
SESSION_LIFETIME=480
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=.<DOMAIN>                     # leading dot is required
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax
SANCTUM_STATEFUL_DOMAINS=admin.<DOMAIN>

# --- Cache / queue ---
CACHE_STORE=database
CACHE_PREFIX=planb
QUEUE_CONNECTION=database
BROADCAST_CONNECTION=log
FILESYSTEM_DISK=local

# --- Mail (SMTP) ---
MAIL_MAILER=smtp
MAIL_SCHEME=smtp                             # smtp = STARTTLS on 587; smtps = SSL on 465
MAIL_HOST=<REQUIRED FROM DEVELOPER>
MAIL_PORT=587
MAIL_USERNAME=<SECRET_REQUIRED>
MAIL_PASSWORD=<SECRET_REQUIRED>
MAIL_FROM_ADDRESS="no-reply@<DOMAIN>"
MAIL_FROM_NAME="Plan B Academy"
MAIL_SUPPORT_ADDRESS="support@<DOMAIN>"

# --- Legal pages (/privacy, /terms, /account-deletion) ---
LEGAL_COMPANY_NAME="Plan B International Private Limited"
LEGAL_APP_NAME="Plan B Academy"
LEGAL_COMPANY_ADDRESS=<REQUIRED FROM DEVELOPER>
LEGAL_COMPANY_REGISTRATION_NUMBER=<REQUIRED FROM DEVELOPER>
LEGAL_PAYMENT_RETENTION_YEARS=7
LEGAL_DELETION_REQUEST_DAYS=30

# --- Student sign-in (email code + Google) ---
STUDENT_LOGIN_CODE_TTL_MINUTES=10
STUDENT_LOGIN_CODE_DAILY_CAP=10
STUDENT_TOKEN_TTL_DAYS=30
GOOGLE_CLIENT_IDS=<web-id>,<android-id>,<ios-id>   # REQUIRED FROM DEVELOPER (public IDs, not secrets)
STUDENT_GOOGLE_SIGNUP_ENABLED=true

# --- Video: Bunny Stream ---
BUNNY_STREAM_ENABLED=true
BUNNY_STREAM_LIBRARY_ID=<REQUIRED FROM DEVELOPER>
BUNNY_STREAM_API_KEY=<SECRET_REQUIRED>
BUNNY_STREAM_CDN_HOSTNAME=<REQUIRED FROM DEVELOPER>
BUNNY_STREAM_TOKEN_KEY=<SECRET_REQUIRED>
BUNNY_STREAM_RESOLUTIONS=240p,360p,480p,720p
COURSE_MAX_VIDEO_UPLOAD_MB=512
COURSE_MAX_THUMBNAIL_UPLOAD_MB=2

# --- Payments ---
PAYMENT_GATEWAY=payhere                      # "sandbox" refuses to run in production
PAYMENT_CURRENCY=LKR
PAYMENT_RETURN_URL=planb://payment/complete
PAYMENT_CANCEL_URL=planb://payment/cancelled
PAYHERE_MERCHANT_ID=<REQUIRED FROM DEVELOPER>
PAYHERE_MERCHANT_SECRET=<SECRET_REQUIRED>
PAYHERE_SANDBOX=false
PAYHERE_CHECKOUT_URL=https://www.payhere.lk/pay/checkout
BANK_TRANSFER_MAX_RECEIPT_MB=5

# --- Exchange rate (display only, no key) ---
EXCHANGE_BASE=AED
EXCHANGE_QUOTE=LKR
EXCHANGE_URL="https://open.er-api.com/v6/latest/{base}"
EXCHANGE_REFRESH_HOURS=6
EXCHANGE_STALE_AFTER_HOURS=48
```

### 4.2 Categories requested — status

| Category | Status |
|---|---|
| Application URL | `APP_URL` |
| Database | `DB_*` |
| Frontend URL | `FRONTEND_URL` |
| CORS | No separate variable. Allowed origin = `FRONTEND_URL`; credentials enabled; paths `api/*` and `sanctum/csrf-cookie` |
| Mail | `MAIL_*` |
| Redis / queue | Redis **not used**. `QUEUE_CONNECTION=database` |
| External APIs | `EXCHANGE_*` (no key), Google certs (no key) |
| Payment gateways | `PAYMENT_*`, `PAYHERE_*` |
| Cloud storage | **None in use.** Files are on local disk. `AWS_*` variables are unused |
| SMS / OTP | **None.** Sign-in codes are sent by **email** |
| OAuth / social login | `GOOGLE_CLIENT_IDS` (Google Sign-In for students) |

**Variables in `.env.example` that the code does not read** (can be left blank or removed):
`FIREBASE_PROJECT_ID`, `FIREBASE_CREDENTIALS`, `PAYHERE_SECRET` (the live one is `PAYHERE_MERCHANT_SECRET`),
`BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_KEY`, `WHATSAPP_CONTACT_NUMBER`, `AWS_*`, `REDIS_*`, `MEMCACHED_HOST`,
`VITE_APP_NAME`, `PHP_CLI_SERVER_WORKERS`.

### 4.3 Frontend — `web/.env.production` (build time)

```env
VITE_API_BASE_URL=https://api.<DOMAIN>/api/v1
VITE_API_URL=https://api.<DOMAIN>
VITE_APP_NAME="Plan B International"
```

These are **baked into the JavaScript at build time** and are public. Changing them requires a rebuild.
Put no secrets here.

---

## 5. Database

| Item | Value |
|---|---|
| Database name | `planb` (any name works; set `DB_DATABASE`) |
| Empty database sufficient? | **Yes.** Migrations build the full schema (42 tables) |
| Backup import required? | **No production data exists yet.** **REQUIRED FROM DEVELOPER:** confirm whether any course content, services or settings entered on a development/staging copy must be carried over. If yes, the developer supplies a sanitized dump. |
| Migrations | `php artisan migrate --force` on every deploy |
| Seeders | `RoleSeeder` only (required). `IndustrySeeder` / `HomeCarouselSeeder` optional. Never the full `DatabaseSeeder` |
| Character set / collation | `utf8mb4` / `utf8mb4_unicode_ci` (Sinhala text must store correctly) |
| Current size | ~2 MB on the development copy. Expect well under 500 MB in the first year |
| Engine | InnoDB (MySQL default) |

Create it:

```sql
CREATE DATABASE planb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'planb'@'127.0.0.1' IDENTIFIED BY '<SECRET_REQUIRED>';
GRANT ALL PRIVILEGES ON planb.* TO 'planb'@'127.0.0.1';
FLUSH PRIVILEGES;
```

MySQL-specific requirements:
- Bind to `127.0.0.1` only. Port 3306 must **not** be open to the internet.
- Default `sql_mode` is fine — Laravel sets strict mode per connection.
- Sessions, cache and the job queue live in MySQL, so keep default `max_connections` (151) or higher.
- Time zone: the app stores UTC; no MySQL time-zone tables needed.

---

## 6. Frontend Deployment

| Question | Answer |
|---|---|
| Framework | **React 18 + Vite 8** (single-page app, installable PWA). Not Next.js, not Create React App |
| Runtime | **Static build only.** No Node.js process runs in production |
| Build output | `web/dist/` |
| API URL variables | `VITE_API_BASE_URL`, `VITE_API_URL` |
| Public env variables | `VITE_API_BASE_URL`, `VITE_API_URL`, `VITE_APP_NAME` |
| Router fallback | **Required.** Unknown paths must serve `index.html` (React Router) |
| CORS | Browser calls `https://api.<DOMAIN>` with cookies. Backend `FRONTEND_URL` must equal the admin origin exactly (`https://admin.<DOMAIN>`, no trailing slash) |

### 6.1 Build commands

On the server (Node 22 installed) or on a CI/local machine, then copy `dist/`:

```bash
cd /var/www/planb/web
cat > .env.production <<'EOF'
VITE_API_BASE_URL=https://api.<DOMAIN>/api/v1
VITE_API_URL=https://api.<DOMAIN>
VITE_APP_NAME="Plan B International"
EOF

npm ci
npm run build            # runs type-check (tsc -b) then vite build → web/dist
```

If building elsewhere: `rsync -avz --delete dist/ deploy@<SERVER_IP>:/var/www/planb/web/dist/`

### 6.2 Nginx — admin panel

```nginx
server {
    listen 80;
    server_name admin.<DOMAIN>;
    root /var/www/planb/web/dist;
    index index.html;
    server_tokens off;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # PWA service worker and manifest must never be long-cached,
    # or admins keep running an old version after a deploy.
    location ~* ^/(sw\.js|registerSW\.js|workbox-.*\.js|manifest\.webmanifest|index\.html)$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        try_files $uri =404;
    }

    # Vite puts hashed, immutable files under /assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable" always;
        try_files $uri =404;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~ /\. { deny all; }
}
```

> Note: `docs/deployment.md` caches every `.js` file for a year, which would also cache the PWA
> service worker. Use the block above instead.

### 6.3 Nginx — API

```nginx
server {
    listen 80;
    server_name api.<DOMAIN>;
    root /var/www/planb/backend/public;
    index index.php;
    charset utf-8;
    server_tokens off;
    client_max_body_size 128M;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_read_timeout 300s;
    }

    location ~ /\.(?!well-known) { deny all; }
}
```

Then: `sudo certbot --nginx -d api.<DOMAIN> -d admin.<DOMAIN> --redirect`

---

## 7. Domain and Networking

| Item | Requirement |
|---|---|
| Base domain | **REQUIRED FROM DEVELOPER** |
| Frontend (admin panel) | `admin.<DOMAIN>` |
| Backend / API | `api.<DOMAIN>` — also serves public pages `/privacy`, `/terms`, `/account-deletion` (needed for Google Play / App Store listings) |
| Constraint | Admin and API **must share the same parent domain**. Admin login uses a cookie scoped to `.<DOMAIN>`; putting them on different domains breaks login |
| Additional subdomains | None on this server. (A future student web area would be added later.) Email DNS records (SPF/DKIM/DMARC) are needed on the base domain |
| Inbound ports | **22** (SSH, key-only, ideally restricted), **80** (redirect to HTTPS + Certbot), **443** |
| Internal only | 3306 MySQL (localhost) |
| Outbound | 443 (Bunny, PayHere, Google, exchange-rate API, GitHub, package mirrors); **587 or 465** (SMTP) — confirm Contabo does not block outbound SMTP |
| SSL | **Mandatory** on both hosts. Let's Encrypt via Certbot with auto-renewal. Secure cookies, PayHere callbacks, Google Sign-In and the mobile app all require HTTPS. Add HSTS after TLS works |
| WebSockets | **Not required** |
| Max upload size | Largest file through PHP is **10 MB** (student profile video). CV and receipts 5 MB, images 2 MB, CSV import 2 MB. Lesson videos go **browser → Bunny directly** and do not touch the server. Recommended: `client_max_body_size 128M`, PHP `upload_max_filesize = 128M`, `post_max_size = 128M`. Only if Bunny is ever disabled do these need raising to **550M** |
| IP whitelisting | **None required.** Do **not** firewall or rate-limit-by-country these public callback URLs: `POST /api/v1/payments/webhook/payhere` (PayHere) and `POST /api/v1/videos/bunny/webhook` (Bunny). Both are verified in code |

Recommended PHP-FPM settings (`/etc/php/8.3/fpm/php.ini`): `expose_php = Off`, `display_errors = Off`,
`max_execution_time = 120`. Pool: `pm = dynamic`, `pm.max_children = 25` (tune to RAM).

Server timezone may be `Asia/Colombo`; the application itself runs in UTC.

**REQUIRED FROM DEVELOPER:** confirm the VPS plan and region. Project notes mention both
"Cloud VPS 20, Mumbai" and "Cloud VPS 4, Singapore". 4 vCPU / 8 GB RAM / 100 GB SSD is sufficient.

---

## 8. External Dependencies

| Integration | Used? | Purpose | Must be supplied separately |
|---|---|---|---|
| **SMTP / email** | **Yes — critical** | Student sign-in codes, account-deletion codes, admin lockout alerts. **No email = no student login** | SMTP host, port, username, password; verified sender domain; **SPF, DKIM, DMARC DNS records**. Suggested provider in docs: Brevo |
| SMS / OTP | **No** | — | Nothing |
| **PayHere** (payment gateway) | **Yes** | Card payments via PayHere hosted checkout | Live Merchant ID; **Merchant Secret generated for `api.<DOMAIN>`** (PayHere issues secrets per approved domain/app); live checkout URL. Notify URL is automatic: `https://api.<DOMAIN>/api/v1/payments/webhook/payhere` |
| Bank transfer | Yes | Manual payment with receipt upload, admin approval | Bank account details are entered in the admin panel (Settings), not `.env` |
| **Bunny Stream** | **Yes** | Lesson video hosting, encoding, signed playback | Library ID, API key, CDN hostname, Token Authentication key. In Bunny dashboard: **Token Authentication ON**, **Webhook URL** = `https://api.<DOMAIN>/api/v1/videos/bunny/webhook`. See `docs/bunny-stream-setup.md` |
| **Google Sign-In** | **Yes** | Student login in the mobile app | OAuth client IDs for Web, Android, iOS (Google Cloud Console). Android client needs the release SHA-1 from EAS/Play. No client secret is used by the server |
| Exchange-rate API | Yes | AED→LKR converter on student home screen (display only) | Nothing — `open.er-api.com`, no key. Needs outbound HTTPS |
| Firebase / FCM | **No (not built yet)** | Push notifications are planned, not implemented | Nothing for this deployment |
| Microsoft login | No | — | Nothing |
| Maps | No | — | Nothing |
| Cloud file storage (S3 etc.) | **No** | Files on local disk | Nothing |
| **Backblaze B2** | Planned for **backups** | Off-server backup copies | Bucket name + application key limited to that bucket — **REQUIRED FROM DEVELOPER/client** |
| Inbound webhooks | Yes | PayHere payment notify; Bunny encoding finished | Public HTTPS reachability (Section 7) |
| Mobile app | Yes (separate) | Consumes the API | Developer rebuilds the app with `EXPO_PUBLIC_API_BASE_URL=https://api.<DOMAIN>/api/v1` after the API is live — **REQUIRED FROM DEVELOPER** |

---

## 9. Storage and Backups

### 9.1 Where files live

All under `/var/www/planb/backend/storage/app/`:

| Folder | Contents | Public? |
|---|---|---|
| `public/` | Profile photos, course/service/lesson thumbnails, home banners, company logo, bank-transfer receipts | Yes, via `/storage` symlink |
| `student-documents/` | Student CVs (PDF), student profile videos — **personal data** | No (signed URLs only) |
| `private/` | Laravel default private disk; currently unused | No |
| `course-videos/` | Only used if Bunny is disabled; normally empty in production | No |

Logs: `storage/logs/` (daily rotation).

### 9.2 Approximate storage

- Database: under 500 MB in year one.
- Uploads: worst case ~17 MB per student (2 MB photo + 5 MB CV + 10 MB profile video), realistically
  far less. 1,000 students ≈ 5–17 GB. Lesson videos are on Bunny, not this disk.
- A **100 GB SSD is sufficient** for launch. Alert at 80% disk usage.
- **REQUIRED FROM DEVELOPER/client:** expected student numbers for year one, to confirm.

### 9.3 What to back up

| Item | Frequency | Retention |
|---|---|---|
| MySQL database (`mysqldump --single-transaction --quick --routines planb`, gzipped) | **Daily** (plus before every deploy) | 7 daily on server; 30 daily + 12 monthly off-server (B2) |
| `backend/storage/app/` (all subfolders) | **Daily** | Same as database |
| `backend/.env` | On every change | Store in a password manager / secrets vault, **not** in B2 alongside the data. Losing `APP_KEY` logs everyone out and breaks every outstanding signed link |
| Nginx, Supervisor, PHP config | After changes | Keep a copy |

Not needed: `vendor/`, `node_modules/`, `web/dist/` (rebuilt from Git).

Backups must be copied **off the server**, encrypted, and a restore must be tested into a scratch
database before go-live and then quarterly. A ready backup script is in `docs/deployment.md` Part 11.

---

## 10. Deployment Verification Checklist

**Frontend**
- [ ] `https://admin.<DOMAIN>` loads over HTTPS, valid certificate, HTTP redirects to HTTPS
- [ ] Refreshing a deep link (e.g. `/admin/students`) loads the page, not a 404

**API**
- [ ] `curl -I https://api.<DOMAIN>` — HTTPS, no `X-Powered-By`
- [ ] `curl https://api.<DOMAIN>/api/v1/student/me` returns JSON **401**, no stack trace
- [ ] `https://api.<DOMAIN>/privacy`, `/terms`, `/account-deletion` load on a phone
- [ ] `APP_DEBUG=false` confirmed (trigger a 404 — no debug page)

**Login**
- [ ] Admin logs in at `https://admin.<DOMAIN>` and **stays logged in after page refresh**
      (if it bounces back to login: check `SESSION_DOMAIN` leading dot and `SANCTUM_STATEFUL_DOMAINS`)
- [ ] Student requests a sign-in code in the mobile app and receives the email within a minute
- [ ] Google Sign-In works in the mobile app

**Database**
- [ ] `php artisan migrate:status` — all migrations "Ran"
- [ ] Roles exist; the Super Admin created with `admin:create` can log in
- [ ] Port 3306 not reachable from outside (`nmap -p 3306 <SERVER_IP>` from another machine)

**File uploads**
- [ ] Upload a course thumbnail — image displays (confirms `storage:link`, permissions, `APP_URL`)
- [ ] Upload a student CV — opens via its link; `https://api.<DOMAIN>/storage/` does not list files
- [ ] Nginx directory listing is off (`autoindex` not enabled) — bank receipts sit under `/storage`

**Email**
- [ ] `php artisan mail:test you@example.com` — arrives in **inbox**, not spam

**Queue processing**
- [ ] `sudo supervisorctl status` — both `planb-worker` processes RUNNING
- [ ] `jobs` table empties after sending a sign-in code; `php artisan queue:failed` is empty

**Scheduled jobs**
- [ ] `php artisan schedule:list` shows `exchange-rate-refresh`
- [ ] After the next run window, the converter on the student home screen shows a current date

**PDF / report generation**
- [ ] Not applicable — the application generates no PDFs

**External integrations**
- [ ] Bunny: upload a lesson — shows "Processing", then ready; plays on a phone; a playback URL with
      the token removed is refused
- [ ] PayHere: one low-value live payment marks the order paid (via webhook) and enrols the student;
      refund it afterwards
- [ ] Bank transfer: receipt upload appears for admin approval
- [ ] Backups: first backup present on B2, and a test restore succeeded

---

## Summary of items REQUIRED FROM DEVELOPER

1. Production release: merge current work to `master`, push, create a release tag.
2. Decide whether the GitHub repository should become private (and add a deploy key if so).
3. Base domain name, and DNS access for `api.` / `admin.` A records plus SPF/DKIM/DMARC.
4. VPS plan and region confirmation.
5. SMTP provider credentials.
6. PayHere live Merchant ID and domain-specific Merchant Secret.
7. Bunny Stream Library ID, API key, CDN hostname, Token Authentication key.
8. Google OAuth client IDs (web, Android, iOS).
9. Company address and registration number for the legal pages.
10. Backblaze B2 bucket and application key for backups.
11. Whether `IndustrySeeder` / `HomeCarouselSeeder` should run, and whether any existing content must be imported.
12. Expected year-one student count (storage sizing).
13. Rebuild of the mobile app pointing at the production API once it is live.
