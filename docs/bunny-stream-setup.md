# Bunny Stream — account setup and go-live

How to create the Bunny account, wire it to the API, move the existing lesson files across, and
check it actually works. Written to be followed top to bottom, once.

The code is already in place and **off by default** (`BUNNY_STREAM_ENABLED=false`). Nothing here
changes local development: with Bunny disabled, lessons are stored on the private `course_videos`
disk and played through the signed route, exactly as before.

---

## Why we moved

Serving video from the app server put every playing student on a PHP worker for the length of the
lesson. At roughly 30 concurrent viewers the workers ran out and the **whole API** stopped — sign-in,
admin panel, everything — not just video. A plain MP4 also sends one fixed quality to everybody, so a
student on weak mobile data buffers no matter how big the server is.

Bunny fixes both: unlimited concurrent viewers, and adaptive quality that steps down per student
instead of stalling.

---

## Part 1 — Create the account

### 1.1 Sign up

1. Register at [bunny.net](https://bunny.net) with a **company email**, not a personal one — this
   account owns every lesson video Plan B has.
2. The trial is **14 days with $20 of credit and no card required**, which is far more than testing
   needs at this library size.
3. Verify the email, sign in.

### 1.2 Two-factor authentication — before anything else

Account → Security. Whoever holds this login can delete every lesson in one click, and there is no
undo. Store the recovery codes somewhere other than the same laptop.

### 1.3 Billing details and payment method

Billing → Recharge Account. Adding billing information unlocks **$30 more trial credit ($50 total)**,
so it is worth doing even during testing.

- Accepted: Visa, Mastercard, Amex, Discover, JCB, Diners, **PayPal**, Apple Pay, Bitcoin. Bank
  transfer on request. Card details go to their processor, never to Bunny.
- Top-ups start at **$10**; a **$5** deposit at signup ends the trial immediately if you would rather
  start properly.
- **From Sri Lanka:** confirm with the bank that the card is enabled for foreign online payments —
  that is the usual reason a first attempt is declined. PayPal is the reliable fallback.
- Expect a **$1 minimum monthly charge** once a library exists, however little is used.

### 1.4 Create the video library

1. Go to **Stream → Add Video Library**.
2. **Name:** `planb-lessons`.
3. **Main storage region:** choose the one nearest Sri Lanka offered at the time — typically
   **Singapore** or an Indian region. This is where masters are stored; delivery is global regardless.
4. **Replication regions:** leave off for now. Each one multiplies storage cost, and delivery already
   comes from the edge.
5. Create it.

### 1.5 Choose the encoding qualities

In the library → **Encoding**:

- Enable **240p, 360p, 480p, 720p**. Disable 1080p and above.
- Leave **"Keep original files"** OFF — we keep our own masters on the server, so paying Bunny to
  store a second copy is waste.

> Transcoding itself is free; what costs is **storing** each rung, which is why 1080p is off. 720p is
> plenty on a phone. Keep 240p and 360p — those are what let a student on poor mobile data carry on
> watching instead of buffering.

### 1.6 Lock the videos down (do not skip)

Without this step anyone who learns a video id can watch or download it, and the signed URLs the API
builds become decoration.

In the library → **Security**:

1. Turn **Token Authentication ON**.
2. Copy the **Token Authentication Key** — this is `BUNNY_STREAM_TOKEN_KEY`.
3. Turn **Block direct URL file access ON**.
4. Optionally set **Allowed referrers** to the admin domain once it exists. Leave blank while the
   mobile app is the only consumer — a native player sends no referrer.

### 1.7 Cost alarms (also do not skip)

The two risks worth guarding are an empty balance and a runaway bill. The first is worse than it
sounds: if the balance goes negative and stays there for **60 days, Bunny disables the account and
deletes the stored videos**. Our server masters are the reason that is survivable — which is also why
`--prune` (Part 3) waits.

1. **Account → Billing:** turn on **auto-recharge** and a **low-balance email alert**.
2. **Stream → library → Limits:** set a **monthly bandwidth limit** somewhat above expected use, plus
   the alert at ~80%. This caps the damage if a link is shared widely or something hotlinks the videos.
3. Add a second person's email to billing alerts, so a failed card is not a single point of failure.

### 1.8 Collect the four values

| `.env` key | Where in the dashboard |
|---|---|
| `BUNNY_STREAM_LIBRARY_ID` | Stream → library → **API** (the numeric Library ID) |
| `BUNNY_STREAM_API_KEY` | Stream → library → **API** (the library API key) |
| `BUNNY_STREAM_CDN_HOSTNAME` | Stream → library → **API** or Overview — looks like `vz-xxxxxxxx-xxx.b-cdn.net` (no `https://`, no trailing slash) |
| `BUNNY_STREAM_TOKEN_KEY` | Stream → library → **Security** (step 1.4) |

**The API key can delete the whole library.** It belongs in `.env` on the server (`chmod 600`) and
nowhere else — never in the repo, never in the web app, never in a chat message.

---

## Part 2 — Configure the API

On the server, in `backend/.env`:

```env
BUNNY_STREAM_ENABLED=true
BUNNY_STREAM_LIBRARY_ID=123456
BUNNY_STREAM_API_KEY=xxxxxxxx-xxxx-xxxx-xxxxxxxxxxxx
BUNNY_STREAM_CDN_HOSTNAME=vz-xxxxxxxx-xxx.b-cdn.net
BUNNY_STREAM_TOKEN_KEY=xxxxxxxx-xxxx-xxxx-xxxxxxxxxxxx
BUNNY_STREAM_RESOLUTIONS=240p,360p,480p,720p
```

Then:

```bash
php artisan migrate --force        # adds external_id + processing_status
php artisan config:cache
```

**Leave `BUNNY_STREAM_ENABLED=false` in local `.env` files.** Local development and the test suite
must keep using the disk path — there are no credentials on a laptop, and tests never touch the network.

### Tell Bunny where to report encoding

Stream → library → **Webhook URL**:

```
https://api.<domain>/api/v1/videos/bunny/webhook
```

This is what flips a lesson from "Processing" to ready without the admin refreshing. It is safe to
expose: the handler takes only *which* video to look at from the request and reads the real status
back from Bunny's API with our own key, because Bunny does not sign webhooks.

---

## Part 3 — Move the existing videos

The files already on the server are uploaded from the server itself. Roughly **100 GB will take many
hours**, so run it overnight, in batches, inside `screen` or `tmux` so an SSH drop doesn't kill it.

```bash
# Try one lesson first and watch it play before doing the rest.
php artisan videos:migrate-to-bunny --limit=1

# Then work through the library in batches.
php artisan videos:migrate-to-bunny --limit=20
```

The command is safe to stop and re-run — anything already carrying a Bunny id is skipped.

**Local files are deliberately kept.** They are the master copies and the way back if Bunny is ever
dropped. Only once every lesson has been seen playing — days or weeks later, not the same night:

```bash
php artisan videos:migrate-to-bunny --prune   # asks before deleting, reports GB freed
```

---

## Part 4 — Check it works

1. **Admin upload:** add a lesson in the admin panel. While it uploads, watch the server — `storage/`
   should not grow, because the file goes browser → Bunny directly. The row then shows **Processing**.
2. **Encoding finishes:** within a few minutes the row becomes ready and **Preview** enables. If it
   stays "Processing", the webhook URL is wrong — the status also refreshes when the page reloads.
3. **Play on a phone** through the app: the lesson starts quickly, forward-skip is still blocked,
   rewind works, and progress records as before.
4. **Adaptive quality:** throttle the connection (Chrome DevTools → Network → Slow 4G) and confirm the
   picture softens instead of freezing. This is the whole point of the change.
5. **Token authentication is really on:** take a playback URL, strip the `bcdn_token=...` part, and
   open it. It must be refused. If it plays, revisit step 1.4 — everything else is cosmetic without it.
6. **Expiry:** a student playback link stops working after 30 minutes. Copy one, wait, retry.
7. **Publishing guard:** a course with a still-encoding lesson refuses to publish and names it.

---

## Running it day to day

- **Watch the balance.** This is the single most likely cause of an outage: prepaid credit runs out,
  videos stop, and 60 days negative deletes the library. Auto-recharge plus alerts (1.7) is the whole
  defence.
- **Costs:** transcoding is free. Storage is from $0.01/GB — roughly **$2–3/month** here, counting
  every encoded quality. Delivery is the variable part, from $0.005/GB and higher for Asian zones:
  expect roughly **$30–100/month** at ~100 regular concurrent viewers, with the first real invoice
  being the number to trust. Bill it on as a pass-through line, since it rises with student numbers.
- **Deleting a lesson** in the admin panel deletes it at Bunny too, so storage stops being billed.
- **Privacy:** students' IP addresses reach Bunny as a service provider. Name Bunny in the privacy
  policy before launch.
- **Going back** is a config change: set `BUNNY_STREAM_ENABLED=false` and the app serves the local
  masters again — which is exactly why `--prune` should wait.

---

## If something breaks

| Symptom | Cause |
|---|---|
| Player shows nothing, network tab 403 on `playlist.m3u8` | `BUNNY_STREAM_TOKEN_KEY` doesn't match the library, or the link expired |
| Video plays *without* a token | Token authentication is off (1.4) — fix immediately |
| Upload fails instantly | Ticket expired, or library/API key wrong. Check `BUNNY_STREAM_LIBRARY_ID` |
| Lesson stuck on "Processing" | Webhook URL wrong or unreachable; reload the page to poll instead |
| Everything falls back to the old player | `BUNNY_STREAM_ENABLED` is false, or `config:cache` wasn't re-run |
