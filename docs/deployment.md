# Deployment — Contabo VPS, Ubuntu 24.04

Full first-time setup for the Plan B API and admin panel, start to finish. Follow top to bottom.

**Server:** Contabo Cloud VPS 4 — 4 vCPU, 8 GB RAM, 100 GB SSD, Singapore.
**Stack:** Ubuntu 24.04 · Nginx · PHP 8.3 FPM · MySQL 8 · Supervisor · Certbot.
**Video:** Bunny Stream (see `bunny-stream-setup.md`). Lesson files never live on this server.
**Mail:** Brevo SMTP. **Nothing else is required** — no Redis, no Node on the server if you build the
admin panel locally.

Replace `<domain>` with your real domain and `<server-ip>` with the VPS address throughout.

> **Never put real secrets in this file.** It is committed.

---

## Part 0 — Before you start

- Contabo server IP and the root password they emailed.
- Login to your domain registrar (to add DNS records).
- A Brevo account (free tier) — created in Part 8.
- Bunny Stream keys, if video is going live at the same time.

---

## Part 1 — Secure the server (first 20 minutes)

Do this before installing anything. A fresh VPS is found by scanners within minutes.

```bash
ssh root@<server-ip>
passwd                                  # change the emailed password immediately
apt update && apt upgrade -y

adduser deploy                          # your own account; stop using root
usermod -aG sudo deploy
```

From **your own machine**, create a key. On Windows, in PowerShell (OpenSSH is built in):

```powershell
ssh-keygen -t ed25519 -C "planb-deploy"
# press Enter to accept C:\Users\<you>\.ssh\id_ed25519, then set a passphrase
```

Copy the public key to the server. `ssh-copy-id` does not exist on Windows, so:

```powershell
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh deploy@<server-ip> "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

On macOS/Linux, `ssh-copy-id deploy@<server-ip>` does the same thing.

Confirm key login works — **in a new window, leaving the root session open**:

```bash
ssh deploy@<server-ip>
```

Only once that logs you in without asking for the account password:

```bash
sudo tee /etc/ssh/sshd_config.d/00-planb-hardening.conf > /dev/null <<'EOF'
PasswordAuthentication no
PermitRootLogin no
EOF
sudo sshd -t && sudo systemctl restart ssh

sudo sshd -T | grep -Ei '^(passwordauthentication|permitrootlogin)'
# must print: passwordauthentication no / permitrootlogin no
```

The settings go in their own file under `sshd_config.d/`, named `00-` on purpose. Cloud images ship
`50-cloud-init.conf` in that folder with `PasswordAuthentication yes`; sshd reads the folder in
alphabetical order, before the main `sshd_config`, and **the first value it reads wins**. Editing the
main file — or naming this one `99-` — silently does nothing. `sshd -T` prints what is actually in
force; trust that, not the files.

sudo apt install -y ufw fail2ban unattended-upgrades
sudo ufw allow 22,80,443/tcp && sudo ufw enable
sudo dpkg-reconfigure --priority=low unattended-upgrades
sudo timedatectl set-timezone Asia/Colombo
```

Disabling passwords before your key works locks you out; recovery then needs Contabo's rescue console.

---

## Part 2 — DNS

At your registrar, add two `A` records pointing at `<server-ip>`:

| Host | Type | Value |
|---|---|---|
| `api` | A | `<server-ip>` |
| `admin` | A | `<server-ip>` |

Both subdomains sit under one domain **on purpose**: the admin panel signs in with a cookie, and a
cookie can only be shared across `api.<domain>` and `admin.<domain>` if they share a parent. Splitting
them across two different domains breaks admin login.

Wait for propagation, then confirm:

```bash
dig +short api.<domain>      # must print <server-ip>
dig +short admin.<domain>
```

Do not continue to TLS until both answer correctly — Certbot fails otherwise.

### Cloudflare (planned for theplanbs.com)

The domain sits behind Cloudflare's proxy. Order matters, because Certbot needs to reach the server:

1. Add the two `A` records in Cloudflare DNS as **DNS only (grey cloud)** first.
2. Finish Part 7 (Certbot issues real certificates on the server).
3. Switch both records to **Proxied (orange cloud)**.
4. Cloudflare → SSL/TLS → Overview → **Full (strict)**. Never "Flexible": that sends traffic from
   Cloudflare to this server unencrypted.
5. In the backend `.env`, set `TRUSTED_PROXIES=cloudflare` (Part 6), then `php artisan config:cache`.

**Why step 5 matters.** Behind Cloudflare, every request reaches the server from a Cloudflare
address. Without it, Laravel thinks all students share a handful of IPs, so the sign-in code limit
(8 per IP per hour) locks everyone out at once. With it, Laravel believes the forwarded client IP only
when the request really came from a Cloudflare range, so nobody can fake one by calling the server
directly. Check the bundled ranges are still current with `php artisan proxies:check-cloudflare`.

**Recommended: only accept web traffic from Cloudflare.** Otherwise anyone who finds the server's IP
can skip Cloudflare's protection. After step 3, replace the open 80/443 rule from Part 1:

```bash
sudo ufw delete allow 80/tcp && sudo ufw delete allow 443/tcp
for ip in $(curl -s https://www.cloudflare.com/ips-v4) $(curl -s https://www.cloudflare.com/ips-v6); do
  sudo ufw allow proto tcp from "$ip" to any port 80,443
done
sudo ufw status numbered      # 22 open to you, 80/443 only from Cloudflare ranges
```

Certbot renewals keep working through Cloudflare. If a renewal ever fails, set the records back to
grey cloud, renew, and switch them back.

---

## Part 3 — Install the stack

```bash
sudo apt install -y nginx mysql-server supervisor certbot python3-certbot-nginx git unzip \
  php8.3-fpm php8.3-mysql php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip \
  php8.3-gd php8.3-bcmath php8.3-intl

# Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

Ubuntu 24.04 ships PHP 8.3, which is what the app needs — no third-party PPA.

### PHP settings

```bash
sudo nano /etc/php/8.3/fpm/php.ini
```

```ini
expose_php = Off
display_errors = Off
upload_max_filesize = 128M      ; student CVs, profile videos, receipts, thumbnails
post_max_size = 128M
max_execution_time = 120
```

Lesson videos go browser → Bunny and never pass through PHP, so these limits only cover the small
uploads. Lesson videos have no size cap in the app (multi-GB recordings are expected), so if Bunny
is ever disabled these two values become the only ceiling — raise both (and `client_max_body_size`
in Nginx, and `max_execution_time`) above the largest lesson you intend to upload, e.g. `4G`.

### PHP-FPM workers

```bash
sudo nano /etc/php/8.3/fpm/pool.d/www.conf
```

```ini
pm = dynamic
pm.max_children = 25
pm.start_servers = 5
pm.min_spare_servers = 3
pm.max_spare_servers = 10
```

The Ubuntu default is 5 children, which is far too few — that is a stall at roughly five simultaneous
requests.

```bash
sudo systemctl restart php8.3-fpm
```

---

## Part 4 — Database

```bash
sudo mysql_secure_installation      # set a root password, answer yes to the rest
sudo mysql
```

```sql
CREATE DATABASE planb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'planb'@'127.0.0.1' IDENTIFIED BY 'a-long-random-password';
GRANT ALL PRIVILEGES ON planb.* TO 'planb'@'127.0.0.1';
FLUSH PRIVILEGES;
EXIT;
```

MySQL binds to `127.0.0.1` by default on Ubuntu — leave it that way. The database must never be
reachable from the internet.

---

## Part 5 — Get the code onto the server

```bash
sudo mkdir -p /var/www/planb
sudo chown deploy:deploy /var/www/planb
git clone <your-repo-url> /var/www/planb
```

For a private repo, create a **deploy key**: `ssh-keygen -t ed25519 -f ~/.ssh/planb_deploy` on the
server, add the `.pub` to the repository's deploy keys (read-only), then clone over SSH.

---

## Part 6 — Backend configuration

```bash
cd /var/www/planb/backend
composer install --no-dev --optimize-autoloader
cp .env.production.example .env
chmod 600 .env
nano .env
```

**Start from `.env.production.example`, never `.env.example`.** The production template already
has the safe settings — debug off, HTTPS-only encrypted session cookies, daily `warning` logs, real
SMTP, Cloudflare proxies, payments off with the live PayHere gateway — and
`tests/Feature/EnvironmentTemplateTest.php` fails if any of them drift. `.env.example` is for a
developer machine and is unsafe on a server.

What is left for you to fill in:

| Setting | Value |
|---|---|
| every `<domain>` | your domain, e.g. `theplanbs.com` (7 places) |
| `DB_PASSWORD` | the password from Part 4 |
| `MAIL_USERNAME`, `MAIL_PASSWORD` | Brevo login and SMTP key (Part 8) || `LEGAL_COMPANY_ADDRESS`, `LEGAL_COMPANY_REGISTRATION_NUMBER` | shown on /privacy, /terms |
| `BUNNY_STREAM_*` (four blanks) | `bunny-stream-setup.md` |
| `GOOGLE_CLIENT_IDS` | web, Android and iOS OAuth client ids, comma-separated |
| `PLAY_REVIEW_CODE` | a random 6-digit code (never `123456`); blank turns reviewer sign-in off |
| `PAYHERE_MERCHANT_ID`, `PAYHERE_MERCHANT_SECRET` | only when payments are switched on |
| `APP_KEY` | leave blank — `key:generate` below fills it |

Check nothing was missed — this must print nothing:

```bash
grep -v '^\s*#' .env | grep '<'
```

`SESSION_DOMAIN` with the leading dot and `SANCTUM_STATEFUL_DOMAINS` are the two settings that decide
whether admin login works at all. A missing dot produces a login that appears to succeed and then
bounces straight back to the login screen.

Then:

```bash
php artisan key:generate
php artisan migrate --force                        # NEVER --seed in production
php artisan db:seed --class=RoleSeeder --force     # roles only; safe and required
php artisan storage:link
php artisan config:cache && php artisan route:cache && php artisan view:cache
php artisan payments:migrate-receipts              # only if data was copied from an older install; safe to re-run
php artisan students:migrate-photos                # same, for profile photos
php artisan admin:create                           # your real Super Admin, password typed at the prompt
```

**Never run `php artisan db:seed` without `--class`.** The full seeder includes `AdminUserSeeder`,
which creates four accounts with a published password. With `APP_ENV=production` it now refuses and
writes nothing, as do `AdminUserSeeder`, `StudentSeeder` and `DemoStudentAppSeeder` called by name —
but that guard depends on `APP_ENV` being right, so check `.env` first.

`admin:create` needs a password of at least 12 characters that has not appeared in a known data
breach (checked against Have I Been Pwned; only a 5-character hash prefix is sent).

### Permissions

```bash
sudo chown -R deploy:www-data /var/www/planb/backend
sudo find /var/www/planb/backend -type d -exec chmod 755 {} \;
sudo find /var/www/planb/backend -type f -exec chmod 644 {} \;
sudo chmod -R 775 /var/www/planb/backend/storage /var/www/planb/backend/bootstrap/cache
sudo chown -R www-data:www-data /var/www/planb/backend/storage /var/www/planb/backend/bootstrap/cache
sudo chmod 600 /var/www/planb/backend/.env
```

The web server can write to `storage/` and nothing else. Application code stays read-only to it.

---

## Part 7 — Nginx and TLS

### API host

```bash
sudo nano /etc/nginx/sites-available/api.<domain>
```

```nginx
server {
    listen 80;
    server_name api.<domain>;
    root /var/www/planb/backend/public;

    index index.php;
    charset utf-8;
    server_tokens off;
    client_max_body_size 128M;

    # No security headers at this level: Laravel sends them on everything PHP answers
    # (App\Http\Middleware\SecurityHeaders), and a server-level add_header here would
    # send each one twice.

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # Public images are served straight from disk without PHP, so they get theirs here.
    location ^~ /storage/ {
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "DENY" always;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_read_timeout 300s;
        fastcgi_hide_header X-Powered-By;      # backs up expose_php = Off (Part 3)
    }

    location ~ /\. { deny all; }
}
```

The API's headers — `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`,
and HSTS in production over HTTPS — come from the app, so they work behind Cloudflare and are
covered by `tests/Feature/SecurityHeadersTest.php`. The API sends no Content-Security-Policy on
purpose: the PayHere hand-off page submits itself with a small inline script.

### Admin panel host

The admin panel is static files, so Nginx is the only thing that can send its headers. They live in
a snippet because they are needed twice (see the note below the server block):

```bash
sudo nano /etc/nginx/snippets/planb-admin-headers.conf
```

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
# Browsers ignore HSTS over plain http, so this is harmless before Certbot runs.
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# Enforced: no other site may put the admin panel in a frame.
add_header Content-Security-Policy "frame-ancestors 'none'" always;
# The full policy, REPORT-ONLY for now — see "Switching the full CSP on" below.
add_header Content-Security-Policy-Report-Only "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://api.<domain> https://*.b-cdn.net; media-src 'self' blob: https://api.<domain> https://*.b-cdn.net; connect-src 'self' https://api.<domain> https://video.bunnycdn.com https://*.b-cdn.net; font-src 'self' data:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;
```

```bash
sudo nano /etc/nginx/sites-available/admin.<domain>
```

```nginx
server {
    listen 80;
    server_name admin.<domain>;
    root /var/www/planb/web/dist;

    index index.html;
    server_tokens off;

    include snippets/planb-admin-headers.conf;

    # The service worker, its manifest and index.html must never be long-cached, or admins keep
    # running the old panel after a deploy.
    location ~* ^/(sw\.js|registerSW\.js|workbox-.*\.js|manifest\.webmanifest|index\.html)$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        include snippets/planb-admin-headers.conf;
        try_files $uri =404;
    }

    # Vite puts hashed, never-changing files under /assets.
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable" always;
        include snippets/planb-admin-headers.conf;
        try_files $uri =404;
    }

    # A single-page app: every unknown path is handled by the app, not the server.
    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~ /\. { deny all; }
}
```

**Why the snippet is included three times.** Nginx has a trap: a `location` with any `add_header` of
its own inherits **none** from the server level. Both caching blocks set `Cache-Control`, so without
their own `include` the panel's JavaScript, CSS and `index.html` would go out with no security
headers at all — including the CSP. (An earlier version of this guide cached every `.js` file for a
year, which also froze the service worker; the two blocks above replace it.)

Enable both and get certificates:

```bash
sudo ln -s /etc/nginx/sites-available/api.<domain> /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/admin.<domain> /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d api.<domain> -d admin.<domain> --redirect
sudo systemctl status certbot.timer        # auto-renewal must be active
```

Certbot rewrites both files to listen on 443 and redirect HTTP. Nothing to add afterwards: HSTS
already comes from Laravel on the API host and from the snippet on the admin host.

Check both hosts once TLS works:

```bash
curl -sI https://api.<domain>/up     | grep -Ei 'strict-transport|x-frame|nosniff|referrer|permissions|x-powered'
curl -sI https://admin.<domain>/     | grep -Ei 'strict-transport|x-frame|nosniff|content-security'
```

Each header must appear **exactly once**, and `X-Powered-By` must not appear at all. A header
printed twice means an `add_header` was left at the API's server level.

### Switching the full CSP on

The admin panel's full Content-Security-Policy starts in report-only mode, because a policy that is
wrong blocks part of the panel with no error the admin can see — a video preview that stays black,
an image that never loads. Report-only blocks nothing and logs what it *would* have blocked.

1. Open the admin panel in Chrome with DevTools → Console open.
2. Use every screen once: sign in, the student list and a student's photo and CV, add a course with
   an image and a lesson video upload, preview a lesson, the home banner, settings.
3. Look for console messages starting `[Report Only] Refused to …`. Each names the address that was
   refused — add that address to the matching directive in the snippet and reload Nginx.
4. When a full pass shows none, enforce it: in the snippet, delete the short
   `Content-Security-Policy "frame-ancestors 'none'"` line, then rename
   `Content-Security-Policy-Report-Only` to `Content-Security-Policy`.
   `sudo nginx -t && sudo systemctl reload nginx`, and repeat step 2 once.

Enforced, the policy means a script injected into the panel cannot load code from another site or
send data anywhere except the API and Bunny.

---

## Part 8 — Email (Brevo)

Sign-in codes are the whole authentication system. If mail does not arrive, nobody can log in.

1. Create a free Brevo account and verify your sending domain under **Senders, Domains & Dedicated IPs**.
2. Brevo gives you DNS records — add them at your registrar. All three matter:
   - **SPF** (TXT)
   - **DKIM** (TXT)
   - **DMARC** (TXT) — start with `v=DMARC1; p=none; rua=mailto:you@<domain>`
3. Create an **SMTP key** (not the API key) and put the login and key in `.env`.
4. Test it for real:

```bash
php artisan config:cache
php artisan mail:test you@gmail.com
```

The email must arrive in the **inbox**, not spam. If it lands in spam, the DNS records are wrong or
still propagating — fix that now, not after launch.

---

## Part 9 — Background workers

Without these, sign-in emails are never sent and nothing errors. The job simply sits in the database.

```bash
sudo nano /etc/supervisor/conf.d/planb-worker.conf
```

```ini
[program:planb-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/planb/backend/artisan queue:work --tries=3 --timeout=120 --sleep=3
autostart=true
autorestart=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/planb/backend/storage/logs/worker.log
stopwaitsecs=3600
```

```bash
sudo supervisorctl reread && sudo supervisorctl update && sudo supervisorctl start planb-worker:*
sudo supervisorctl status
```

Scheduler:

```bash
crontab -e
```

```cron
* * * * * cd /var/www/planb/backend && php artisan schedule:run >> /dev/null 2>&1
```

---

## Part 10 — Build and deploy the admin panel

Build it **on your own machine** — that keeps Node off the server entirely.

```bash
# locally, in web/
VITE_API_BASE_URL=https://api.<domain>/api/v1 VITE_API_URL=https://api.<domain> npm run build
rsync -avz --delete dist/ deploy@<server-ip>:/var/www/planb/web/dist/
```

Or, if you prefer building on the server, install Node 20 first
(`curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs`)
then `npm ci && npm run build` in `/var/www/planb/web`.

---

## Part 11 — Backups

Losing the database loses every student, order and payment record.

```bash
sudo nano /usr/local/bin/planb-backup.sh
```

```bash
#!/bin/bash
set -euo pipefail
STAMP=$(date +%F)
DEST=/var/backups/planb
mkdir -p "$DEST"

mysqldump --single-transaction --quick planb | gzip > "$DEST/db-$STAMP.sql.gz"
tar czf "$DEST/files-$STAMP.tar.gz" -C /var/www/planb/backend/storage/app .

# Off the server — a backup on the same disk is not a backup.
b2 file upload planb-backups "$DEST/db-$STAMP.sql.gz" "db-$STAMP.sql.gz"
b2 file upload planb-backups "$DEST/files-$STAMP.tar.gz" "files-$STAMP.tar.gz"

find "$DEST" -type f -mtime +7 -delete
```

```bash
sudo chmod +x /usr/local/bin/planb-backup.sh
sudo crontab -e
#   30 2 * * * /usr/local/bin/planb-backup.sh >> /var/log/planb-backup.log 2>&1
```

Install the B2 CLI (`pipx install b2`) and authorise it once with an application key limited to that
bucket. **Restore one backup into a scratch database before you trust any of this.**

---

## Part 12 — Smoke tests

```bash
curl -I https://api.<domain>                     # HSTS, nosniff, no X-Powered-By
curl https://api.<domain>/api/v1/student/me      # JSON 401, no stack trace
curl -I https://api.<domain>/storage/            # must not list anything
```

Then by hand:

- Admin login at `https://admin.<domain>` works and **stays** logged in after a refresh.
  (If it bounces to login, `SESSION_DOMAIN` is missing its leading dot.)
- A student sign-in code email arrives within a minute — this proves the queue worker is running.
- Upload a lesson; it goes to Bunny and shows **Processing**, then becomes ready.
- Play a lesson on a phone: fast start, no forward skip, progress saved.
- `/privacy`, `/terms`, `/account-deletion` all load on a phone.
- A playback URL with the token removed is refused.

---

## Every deploy after this one

```bash
cd /var/www/planb && git pull
cd backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache && php artisan route:cache && php artisan view:cache
php artisan queue:restart
```

Then rebuild and upload `web/dist` if the admin panel changed.

**`php artisan migrate --force` is not optional.** Shipping code whose migrations have not run is the
fastest way to break every page at once.

---

## Routine care

| How often | What |
|---|---|
| Weekly | `df -h` (disk), `sudo supervisorctl status` (workers alive) |
| Monthly | `sudo apt update && sudo apt upgrade`, check the Bunny balance |
| Quarterly | Restore a backup into a scratch database and confirm it works |
| Watch for | Disk over 80%, `storage/logs/laravel.log` growing fast |
