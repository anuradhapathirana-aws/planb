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
uploads. If Bunny is ever disabled, raise both to `550M` to match `COURSE_MAX_VIDEO_UPLOAD_MB`.

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
cp .env.example .env
chmod 600 .env
nano .env
```

The values that must change from the example:

```env
APP_NAME="Plan B International"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.<domain>
FRONTEND_URL=https://admin.<domain>

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_DATABASE=planb
DB_USERNAME=planb
DB_PASSWORD=a-long-random-password

# Admin login is a cookie shared between api. and admin. — the leading dot matters.
SESSION_DRIVER=database
SESSION_DOMAIN=.<domain>
SESSION_SECURE_COOKIE=true
SANCTUM_STATEFUL_DOMAINS=admin.<domain>

QUEUE_CONNECTION=database
CACHE_STORE=database
LOG_STACK=daily
LOG_LEVEL=warning

# Brevo — Part 8
MAIL_MAILER=smtp
MAIL_HOST=smtp-relay.brevo.com
MAIL_PORT=587
MAIL_SCHEME=smtp
MAIL_USERNAME=<brevo-login>
MAIL_PASSWORD=<brevo-smtp-key>
MAIL_FROM_ADDRESS="no-reply@<domain>"
MAIL_SUPPORT_ADDRESS="support@<domain>"

# Google Play reviewer sign-in (blank = off). A Plan B address and a random 6-digit
# code, given only to Google in Play Console > App content > App access.
PLAY_REVIEW_EMAIL=play-review@<domain>
PLAY_REVIEW_CODE=<random-6-digits>

# Payments stay OFF at launch — see SECURITY_AND_LAUNCH_GUIDE.md §9 before enabling.
PAYMENTS_ENABLED=false

# Bunny Stream — bunny-stream-setup.md
BUNNY_STREAM_ENABLED=true
BUNNY_STREAM_LIBRARY_ID=
BUNNY_STREAM_API_KEY=
BUNNY_STREAM_CDN_HOSTNAME=
BUNNY_STREAM_TOKEN_KEY=
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
php artisan admin:create                           # your real Super Admin, password typed at the prompt
```

**Never run `php artisan db:seed` without `--class`.** The full seeder includes `AdminUserSeeder`,
which creates four accounts with a published password.

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

    location ~ /\. { deny all; }
}
```

### Admin panel host

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

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Content-Security-Policy "frame-ancestors 'none'" always;

    # A single-page app: every unknown path is handled by the app, not the server.
    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|woff2|png|svg|jpg|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location ~ /\. { deny all; }
}
```

Enable both and get certificates:

```bash
sudo ln -s /etc/nginx/sites-available/api.<domain> /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/admin.<domain> /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d api.<domain> -d admin.<domain> --redirect
sudo systemctl status certbot.timer        # auto-renewal must be active
```

Certbot rewrites both files to listen on 443 and redirect HTTP. Afterwards add HSTS to each server
block and reload:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

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
