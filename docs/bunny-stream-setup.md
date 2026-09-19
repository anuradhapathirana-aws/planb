# Bunny Stream — buying it, setting it up, going live

How to buy Bunny Stream, create the video library, connect it to the API, move the existing lessons
across, and check that it works. Follow it top to bottom, once.

The code is already done and **off by default** (`BUNNY_STREAM_ENABLED=false`). Nothing here changes
local development: with Bunny off, lessons are stored on the private `course_videos` disk and played
through the signed route, as before.

> **Who does what.** Parts 1–2 happen in the Bunny website and need no developer. Parts 3–5 happen on
> the server and are for the developer.

---

## Why we moved

Serving video from the app server holds one PHP worker per playing student for the whole lesson. At
roughly 30 viewers at once the workers ran out and the **whole API** stopped: sign-in, admin panel,
everything, not just video. A plain MP4 also sends one fixed quality to everyone, so a student on weak
mobile data buffers however big the server is.

Bunny fixes both: no practical limit on viewers, and adaptive quality that steps down (720p → 240p)
for a student on a weak connection instead of freezing.

## What it costs

Bunny is **prepaid**: you add credit, and usage is deducted from it. Pricing as of September 2026
([bunny.net/pricing/stream](https://bunny.net/pricing/stream/)):

| Item | Price |
|---|---|
| Encoding into 240p–720p | Free |
| Storage | $0.01 per GB per month (Frankfurt; the price for other regions is shown on the create screen) |
| Delivery, **Volume** tier (recommended) | $0.005 per GB, anywhere |
| Delivery, Standard tier | $0.03 per GB in Asia, $0.06 per GB in the Middle East |
| Minimum | $1 per month for the whole account |

Every play is billed, including a student rewatching a lesson. One hour watched on a phone is about
1 GB. For **50–70 hours of lessons (~100 GB) and 50 students**, on the Volume tier:

| Each student watches per month | Data | Delivery | Storage | **Total per month** |
|---|---|---|---|---|
| 10 hours | ~0.5 TB | ~$2.50 | ~$3–5 | **~$6–8** |
| 20 hours, with rewatching | ~1 TB | ~$5 | ~$3–5 | **~$8–10** |
| 40 hours, heavy | ~2 TB | ~$10 | ~$3–5 | **~$13–15** |

On the Standard tier the delivery column is about 6× higher (~$15–60). At 100 students, double the
delivery column. The first real invoice is the number to trust.

---

## Part 1 — Buy Bunny (account and payment)

### 1.1 Create the account

1. Go to [bunny.net](https://bunny.net) → **Sign up**.
2. Use a **company email that Plan B controls**, not a personal one. This account owns every lesson
   video. If the person leaves, the company must still be able to get in.
3. Verify the email and sign in. The dashboard is at [dash.bunny.net](https://dash.bunny.net).

### 1.2 Turn on two-factor authentication, first

**Account → Security → Two-Factor Authentication.** Whoever has this login can delete every lesson in
one click, and there is no undo. Save the recovery codes somewhere other than the same laptop.

### 1.3 The free trial

- **14 days**, no card needed, with **$20** of trial credit. Adding a card raises it to **$50**, and
  the card is **not charged** during the trial (a $0–$1 check that is reversed).
- Trial credit **disappears when the trial ends**. It does not carry over.
- $20 is far more than testing needs, so use the trial to do Parts 2–5 and check everything works.

### 1.4 Billing details

**Account → Billing details:** enter the **company name, address and business registration**, so
invoices are in Plan B's name for the accounts.

### 1.5 Add funds (the actual purchase)

**Account → Billing → Recharge Account**, then choose an amount: $10, $25, $50, $100, or a custom
amount. **$25 is a good start**, about 2–3 months at launch usage.

Payment methods: **Visa, Mastercard, Amex, PayPal**, and a few others. There are no extra fees. Card
details go to Braintree (their payment processor), never to Bunny.

**Paying from Sri Lanka:**

- Use a **normal company credit or debit card**. Bunny **refuses prepaid cards, gift cards and some
  virtual cards.**
- Ask the bank to **enable the card for foreign online (USD) payments** first. This is the most
  common reason a first payment is declined.
- If the card keeps failing, **PayPal** is the reliable fallback.
- Payments are generally **non-refundable** (prepaid model), so top up in small amounts.

### 1.6 Auto-recharge — do not skip

**Account → Billing → Enable Auto-Recharge**, amount **$25**, using the saved card or PayPal (a
payment method has to be used once manually before it can be picked here).

When the balance drops to 20% of that amount ($5), Bunny charges the card again. This matters because
of what happens when the balance runs out:

| Balance | What happens |
|---|---|
| Goes below $0 | Daily warning emails |
| **Negative for ~4 days** | **Account disabled — every lesson stops playing** |
| Disabled for 60 days | All videos **permanently deleted** |

Auto-recharge only retries a failing card 5 times, so also add **a second person's email** to billing
alerts, and check the balance once a month.

### 1.7 Give the developer access without sharing the password

**Account → Team → Add team member**, permission **Manage zones** only. The developer gets their own
login, and billing stays with the owner.

---

## Part 2 — Create and configure the video library

### 2.1 Create the library

1. **Stream → Add Video Library.**
2. **Name:** `planb-lessons`.
3. **Main storage region:** the one nearest Sri Lanka at the same price (e.g. Singapore). If the
   nearer regions cost more, Frankfurt is fine: students are served from Bunny's edge either way, and
   storage is the small part of the bill.
4. **Replication regions: leave OFF.** Each one adds storage cost, and **once enabled it cannot be
   removed.**
5. Create it.

### 2.2 Delivery tier

Library → **Delivery** → choose the **Volume / High Volume** tier. It is 6× cheaper than Standard,
and for recorded lessons (the player loads a few seconds ahead) the fewer locations make no
noticeable difference.

### 2.3 Encoding — set before the first upload

Library → **Encoding**. These settings apply **only to videos uploaded after they are set**, so set
them now.

| Setting | Value | Why |
|---|---|---|
| Enabled resolutions | **240p, 360p, 480p, 720p** (1080p and above OFF) | 240p/360p keep a student on weak data watching; 720p is plenty on a phone |
| **Keep original files** | **ON** | Bunny keeps the full-quality original. New uploads go browser → Bunny and never touch our server, so without this there is no master copy anywhere. ~$1–2/month |
| Early-Play | **OFF** | Plays the original file before encoding, and makes it **publicly downloadable** |
| MP4 fallback | **OFF** | Extra storage we don't use, and a downloadable file |
| Watermark | Optional | Burned into every video uploaded afterwards |

### 2.4 Security — exactly these settings

Our apps play the video URL directly, in our own no-skip player, **not** Bunny's embedded player.
That decides every setting below. The wrong setting here either lets anyone watch the videos or stops
them playing for everyone.

**Library → Security:**

| Setting | Value | Why |
|---|---|---|
| **Block Direct URL File Access** | **OFF** | It blocks any request without a website referer. **The mobile app never sends one**, so ON = every lesson fails with 403 in the app |
| Allowed domains | **Empty** | Same reason: a native app has no domain |
| Embed view token authentication | OFF | Protects Bunny's embed player, which we don't use |
| MediaCage DRM | OFF | Only works with Bunny's embed player. Enterprise DRM is $99/month |
| **CDN token authentication** | **ON** (if the toggle is shown here) | This is what protects our videos. See the next step |

**The CDN token key lives on the pull zone, not on the library.** Go to **Stream → library → API →
Pull Zone → Manage**, then **Security → Token Authentication**:

1. Turn **Token Authentication ON**.
2. Leave **Token IP Validation OFF**. Our links are not locked to an IP, and turning it on makes every
   link fail.
3. Copy the **URL Token Authentication Key**. This is `BUNNY_STREAM_TOKEN_KEY`.

> ⚠️ Do **not** use the key from the library's *embed view* token section. It is a different key, and
> every lesson would return 403.

### 2.5 Spending cap

On the same pull zone (**Manage → Limits**) set a **monthly bandwidth limit** of about **3 TB**,
roughly 3× expected use. If a link is ever shared widely, the bill stops there instead of growing.
Raise it as student numbers grow.

### 2.6 Collect the five values

| `.env` key | Where in the dashboard |
|---|---|
| `BUNNY_STREAM_LIBRARY_ID` | Stream → library → **API** → Video Library ID (a number) |
| `BUNNY_STREAM_API_KEY` | Stream → library → **API** → API Key (the full read-write key) |
| `BUNNY_STREAM_WEBHOOK_KEY` | Stream → library → **API** → **Read-Only** API Key |
| `BUNNY_STREAM_CDN_HOSTNAME` | Stream → library → **API** → CDN Hostname, like `vz-xxxxxxxx-xxx.b-cdn.net` (no `https://`, no `/`) |
| `BUNNY_STREAM_TOKEN_KEY` | Pull zone → Security → Token Authentication → URL Token Authentication Key (step 2.4) |

**The API key can delete the whole library.** It goes into `.env` on the server (`chmod 600`) and
nowhere else: never the repo, never the web app, never an email or chat message. Send the values to
the developer through a password manager, or have them read the values in the dashboard with their
own team login (1.7).

---

## Part 3 — Connect the API (developer)

On the server, in `backend/.env`:

```env
BUNNY_STREAM_ENABLED=true
BUNNY_STREAM_LIBRARY_ID=123456
BUNNY_STREAM_API_KEY=xxxxxxxx-xxxx-xxxx-xxxxxxxxxxxx
BUNNY_STREAM_WEBHOOK_KEY=xxxxxxxx-xxxx-xxxx-xxxxxxxxxxxx
BUNNY_STREAM_CDN_HOSTNAME=vz-xxxxxxxx-xxx.b-cdn.net
BUNNY_STREAM_TOKEN_KEY=xxxxxxxx-xxxx-xxxx-xxxxxxxxxxxx
BUNNY_STREAM_RESOLUTIONS=240p,360p,480p,720p
```

Then:

```bash
php artisan migrate --force        # adds external_id + processing_status if not yet run
php artisan config:cache
```

**Leave `BUNNY_STREAM_ENABLED=false` in local `.env` files.** Local development and the test suite
use the disk path: there are no credentials on a laptop, and tests never touch the network.

### Webhook

Stream → library → **API → Webhook URL**:

```
https://api.<domain>/api/v1/videos/bunny/webhook
```

This flips a lesson from "Processing" to ready without the admin reloading. Bunny signs each call with
the Read-Only key and the handler checks it. Even a genuine call is only used as a prompt: the handler
reads the real status back from Bunny with our own key. If the webhook never arrives, two things
still catch it: the admin page checks every 10 seconds while it is open, and a scheduled job checks
every minute (it needs the scheduler cron and queue worker from `docs/deployment.md`, which the server
already runs).

**Testing on a laptop:** the webhook cannot reach you. Keep the course page open until the lesson is
ready, or run `php artisan schedule:work` and `php artisan queue:work` in two terminals.

---

## Part 4 — Move the existing lessons (developer)

The ~100 GB already on the server is uploaded from the server itself. Run it overnight, in batches,
inside `screen` or `tmux` so an SSH drop doesn't stop it.

```bash
# One lesson first. Watch it reach "ready" and play before doing the rest.
php artisan videos:migrate-to-bunny --limit=1

# Then the rest, in batches.
php artisan videos:migrate-to-bunny --limit=20
```

- **Students are not affected while this runs.** A moved lesson keeps playing from the server's copy
  until Bunny finishes encoding it, then switches to Bunny by itself.
- Bunny's free encoding is a shared queue. For a whole library it can take **hours, occasionally
  days**, which is why the server copy keeps serving in the meantime.
- Safe to stop and re-run: anything that already has a Bunny id is skipped.

**Keep the local files** until every lesson has been seen playing from Bunny, days or weeks later, not
the same night. Only then:

```bash
php artisan videos:migrate-to-bunny --prune   # asks first, reports GB freed; only removes lessons ready on Bunny
```

---

## Part 5 — Check it works

1. **Admin upload:** add a lesson in the admin panel. While it uploads, `storage/` on the server does
   not grow, because the file goes browser → Bunny. The row then shows **Processing**.
2. **Encoding finishes:** within minutes the row becomes ready and **Preview** is enabled. If it stays
   on Processing, check the webhook URL. The page also keeps checking by itself.
3. **Play on a phone** in the app: the lesson starts quickly, skipping forward is still blocked,
   rewinding works, and progress saves as before.
4. **Adaptive quality:** in Chrome DevTools → Network → Slow 4G, play a lesson in the admin Preview.
   The picture softens instead of freezing.
5. **Token protection is really on:** copy a playback URL, change one character of the `bcdn_token=`
   value, and open it. It **must be refused (403)**. If it plays, Token Authentication (2.4) is off.
   Fix that before launch.
6. **The app is not blocked:** if lessons play in the admin Preview but **not in the mobile app**,
   Block Direct URL File Access is ON. Turn it off (2.4).
7. **Expiry:** a student's link stops working after 30 minutes. The app refreshes it by itself
   during a lesson.
8. **Publishing guard:** a course with a lesson that exists only on Bunny and is still encoding
   refuses to publish, and names the lesson.

---

## Running it day to day

- **Watch the balance.** An empty balance is the most likely cause of an outage: about 4 days
  negative and every lesson stops. Auto-recharge plus alerts (1.6) prevent it.
- **Check the monthly invoice** (Account → Billing → history) against the estimate above. If it grows,
  raise the bandwidth cap (2.5) on purpose; don't just remove it.
- **Deleting a lesson** in the admin panel deletes it at Bunny too, so its storage stops being billed.
- **Replacing a lesson's video** in a published course: the old video is removed when the new upload
  starts, so students see "not ready" for that lesson until the new one finishes encoding (usually a
  few minutes). Replace videos outside busy hours.
- **Privacy:** students' IP addresses reach Bunny as a service provider. Name Bunny in the privacy
  policy before launch.
- **Going back to our own server** is a config change (`BUNNY_STREAM_ENABLED=false`), but it only
  helps lessons that still have a server copy. Lessons uploaded after go-live exist only at Bunny;
  "Keep original files" (2.3) lets you download their originals from the dashboard if you ever leave.

---

## If something breaks

| Symptom | Cause |
|---|---|
| Plays in admin Preview, **not in the app** | Block Direct URL File Access is ON (2.4) |
| 403 on `playlist.m3u8` everywhere | Wrong `BUNNY_STREAM_TOKEN_KEY` (the embed key instead of the pull zone key?), Token IP Validation ON, or the link expired |
| Video plays **without** a valid token | Token Authentication is off on the pull zone (2.4). Fix immediately |
| Upload fails straight away | Library ID or API key wrong, or the upload ticket expired |
| Lesson stuck on "Processing" / app says "not ready" | Encoding queue is slow (wait), or nothing re-checked it: webhook URL wrong **and** scheduler/queue worker not running. Reloading the course page re-checks |
| Webhook log says "signature missing or invalid" | `BUNNY_STREAM_WEBHOOK_KEY` isn't the library's Read-Only key. Status still updates through the page's own checks |
| Everything uses the old player | `BUNNY_STREAM_ENABLED` is false, or `config:cache` wasn't re-run |
| All lessons suddenly stop | Account disabled for negative balance. Top up and it comes back immediately (1.6) |
