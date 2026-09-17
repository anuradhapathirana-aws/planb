# Google Play Launch — Step-by-Step Guide

> **For:** Anuradha, doing the Play Console and Google Cloud steps by hand.
> **Goes with:** `SECURITY_AND_LAUNCH_GUIDE.md` (the code tasks) and `docs/deployment.md` (the server).
> **Written:** 17 September 2026. Google renames Play Console menus now and then — if a menu name
> below doesn't match, type it into the search bar at the top of Play Console.

---

## 0. The one rule that sets the timeline

Your Play developer account is a **new Personal account**. For these accounts Google requires:

1. A **closed test** with **at least 12 testers opted in for 14 days in a row**, and only then
2. **Apply for production** (Google reviews the application — up to about 7 days), and only then
3. The app can be **public** in the Play Store.

The 14 days only start once Google has approved the closed-test release and testers have joined.
There is no legitimate way around this with a Personal account.

### What you can tell the client

| Date (estimate) | Milestone |
|---|---|
| **by 28 Sep** | App is **on Google Play** for invited testers; the 14-day test is running |
| ~12 Oct | 14 days complete → apply for production |
| **~mid to late Oct** | App **public** for everyone (depends on Google's review) |

**One option to ask the client about today:** if Plan B International already has a **D-U-N-S
number**, a Play account registered as an **Organization** does not need the 14-day test, and the
store listing shows the company's name instead of yours. Getting a new D-U-N-S number can take
weeks, so this only helps if they already have one. (Organization accounts also cost $25 and need
their own verification — a few days.)

**Do not use paid "12 testers" services.** Google asks detailed questions about your testers'
engagement when you apply for production and rejects applications that look fake. It can also
put your developer account at risk.

---

## 1. Day-by-day plan (17 → 28 September)

| Days | You (Play / Google / client) | Code / server |
|---|---|---|
| **17–19 Sep** | Part A (account checks) · Part C (store listing) · Part D (app content) · send Privacy Policy + Terms to client for approval · collect 15–20 tester Gmail addresses | P3-1, P3-7, P3-8 · deploy server (`docs/deployment.md`) |
| **19–20 Sep** | Part B (Google Sign-In) · reviewer account ready | Part E: first production build · install via internal testing · smoke test |
| **20–21 Sep** | Part F: closed test release → **Send for review** | Fix anything the smoke test finds |
| **21–28 Sep** | Google reviews the closed test (1–7 days) · send testers the join link the moment it's approved | P3-2, P3-3, P3-4, P3-11 as updates |
| **+14 days** | Part G: apply for production | Phase 4 as updates |

**The critical path is: server live → build → closed test submitted.** Everything in Parts C and D
can be done in parallel while the server is being set up.

---

## Part A — Check your developer account (15 min)

In [Play Console](https://play.google.com/console):

1. **Identity verified?** Home page shows a banner if not. Finish it first — nothing publishes until
   it's done.
2. **Android device verified?** New personal accounts must install the **Play Console app** on a
   real Android phone and sign in once. Also verify your **contact phone number**.
3. **Create the app** (skip if already created) — *Home → Create app*:
   - App name: **Plan B Academy**
   - Default language: **English (United States)** or **English (United Kingdom)**
   - App or game: **App** · Free or paid: **Free**
   - Tick both declarations → **Create app**

> **Free cannot become Paid later.** That's fine — Plan B earns through purchases, not a download
> price.

After this the app's **Dashboard** shows a "Set up your app" checklist. Parts C and D below walk
through every item on it.

---

## Part B — Google Sign-In for the Play version (30 min, after the first upload)

Google Sign-In in the Play version only works once Google Cloud knows the **SHA-1 fingerprint of
the key Google signs your app with**. That key exists only after your first upload (Part E), so do
this part right after Part E step 4.

1. Play Console → *Test and release → Setup → App integrity → App signing* → copy the **SHA-1
   certificate fingerprint** under **App signing key certificate**.
2. [Google Cloud Console](https://console.cloud.google.com) → **the same project** that holds your
   existing OAuth clients → *APIs & Services → Credentials → Create credentials → OAuth client ID*:
   - Application type: **Android**
   - Name: `Plan B Academy — Play`
   - Package name: `lk.planbinternational.academy`
   - SHA-1: paste from step 1 → **Create**
   - If the client shows *Advanced settings → Enable custom URI scheme*, turn it **on** (the app
     returns from Google through `lk.planbinternational.academy:/oauthredirect`).
3. Copy the new **Client ID** and put it in **two** places:
   - EAS (from `mobile/`):
     `npx eas-cli@24.6.0 env:create --environment production --name EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID --value <client-id> --visibility plaintext`
   - Server `.env` → add it to `GOOGLE_CLIENT_IDS` (comma-separated with any existing ids) →
     `php artisan config:cache`.
4. *APIs & Services → OAuth consent screen* (may be called **Google Auth Platform → Branding /
   Audience**): app name **Plan B Academy**, support email, logo, privacy policy URL
   `https://api.theplanbs.com/privacy`. Under **Audience**, publishing status must be
   **In production**, not *Testing* — in Testing only listed test users can sign in.
5. Build again (Part E) so the app contains the Android client id.

> Until this is done the Play version still works with **email code sign-in**. Google Sign-In can
> arrive in the second build — it does not block the closed test.

---

## Part C — Store listing (1–2 hours, mostly preparing images)

*Grow users → Store presence → Main store listing*

| Field | Limit | Notes |
|---|---|---|
| App name | 30 chars | `Plan B Academy` |
| Short description | 80 chars | e.g. "Courses and career help to prepare for study and work in the UAE." |
| Full description | 4000 chars | What students get: courses with video lessons, papers, checklists, career services. Plain English. **No** "#1", "best", emojis in the title, or mentions of other apps. |
| App icon | 512×512 PNG, ≤1 MB | Same artwork as `mobile/assets/icon.png`, exported at 512 |
| Feature graphic | 1024×500 PNG/JPG, no transparency | Logo + one line of text on the brand navy `#14224b` |
| Phone screenshots | 2–8, 9:16, at least 1080×1920 | Take them on a real phone from the production build: Home, Courses, a course detail, a lesson, Checklist, Profile |

**Screenshot tip:** the app blocks screenshots on most screens (to protect lesson videos). Take
them from a **development or preview build** pointed at the real server, or ask me to add a
temporary screenshot switch for a preview build only.

*Grow users → Store presence → Store settings*

- Category: **Education**
- Tags: pick up to 5 (e.g. Education, Online courses, Career)
- Contact details: **email** (required — use the Plan B support address), phone and website
  optional

---

## Part D — App content (1 hour)

*Policy and programs → App content* (or the Dashboard checklist). Answer each one:

| Section | Answer |
|---|---|
| **Privacy policy** | `https://api.theplanbs.com/privacy` (server must be live; client must have approved the text) |
| **App access** | *All or some functionality is restricted* → **Add instructions**: name "Reviewer login", username = your `PLAY_REVIEW_EMAIL`, password = your `PLAY_REVIEW_CODE`, instructions: "Enter the email on the sign-in screen, tap Continue, then enter the 6-digit code as the verification code. No email is sent." |
| **Ads** | No, my app does not contain ads |
| **Content rating** | Start questionnaire → email → category **Reference, News, or Educational** → answer **No** to violence, sexual content, language, drugs, gambling; users interact with each other: **No**; shares location: **No**; digital purchases: **No** (payments are off — update this when they go on) |
| **Target audience** | **18 and over** only · "Could your store listing unintentionally appeal to children?" → **No** |
| **News apps** | No |
| **Data safety** | See below |
| **Government apps** | No |
| **Financial features** | My app doesn't provide any financial features |
| **Health apps** | None |
| **Advertising ID** | No |

### Data safety

Use `SECURITY_AND_LAUNCH_GUIDE.md` §8, with these corrections:

- **Does your app collect or share data?** Yes.
- **Encrypted in transit?** Yes. **Can users request deletion?** Yes.
- **Account deletion URL:** `https://api.theplanbs.com/account-deletion`
- **Shared:** per the decision in P1-4, name, email, CV and profile video can be passed to UAE
  employers/agencies (with the student's agreement), so mark those as **Shared** as well as
  Collected. (§8 still says "shared: No" — P1-4 is the later decision.)
- **Crash logs / Diagnostics:** only tick these once Sentry (P3-11) is in the build you upload.
  If Sentry arrives in a later update, update the Data safety form **before** that update goes out.
- **Financial info:** don't tick anything while payments are switched off.

---

## Part E — Build, first upload, test on your phone (2–3 hours, mostly waiting)

**Before building, the server must be live** and these must be set on it (`docs/deployment.md`
Part 6): `PLAY_REVIEW_EMAIL`, `PLAY_REVIEW_CODE`, `MAIL_SUPPORT_ADDRESS`,
`LEGAL_COMPANY_ADDRESS`, `LEGAL_COMPANY_REGISTRATION_NUMBER`, `PAYMENTS_ENABLED=false`. Sign in
once as the reviewer from a preview build and enrol that account in the free demo course.

1. **Check the EAS variable exists** (from `mobile/`):
   `npx eas-cli@24.6.0 env:list --environment production`
   → must show `EXPO_PUBLIC_API_BASE_URL = https://api.theplanbs.com/api/v1`. If not, create it
   (command in `SECURITY_AND_LAUNCH_GUIDE.md` P1-6).
2. **Build:** `npm run build:prod`
   - First time only: EAS asks to **generate a new Android keystore** → **Yes**. EAS stores it
     for you. This is your *upload key*; never delete it from EAS.
   - Takes 15–40 min. When finished, open the build page on expo.dev and **download the `.aab`**.
3. **First upload is by hand** (Google's API can't create an app's first release):
   Play Console → *Test and release → Testing → Internal testing* → **Testers** tab → create an
   email list with **your own Gmail** → Save → **Create new release** →
   - "Play App Signing" → **Use Google-generated key** (default) → continue
   - Upload the `.aab`
   - Release name: leave the default · Release notes: "First test release."
   - **Next → Save and publish**. Internal testing needs **no review** and is ready in minutes.
4. Now do **Part B** (Google Sign-In) — the signing key SHA-1 exists now.
5. On the Internal testing **Testers** tab, copy the **join link**, open it on your Android phone
   (signed into the same Gmail), accept, and install from the Play Store.
6. **Smoke test** on the Play-installed app — `SECURITY_AND_LAUNCH_GUIDE.md` R-3. If possible,
   test on one older phone (Android 10–12) and one newer (Android 13+). The most important:
   - Email code sign-in and the reviewer login both work
   - A lesson plays, and rotating the phone works
   - Profile photo from camera **and** gallery
   - Privacy / Terms / Support links open
   - Delete account works end to end
   - Sign out, sign in as a different person → none of the first person's data shows
   - No buy buttons on paid courses

**From the second build on**, uploads can be automatic: set up the service account
(`SECURITY_AND_LAUNCH_GUIDE.md` G-5), then `npm run build:prod` followed by `npm run submit:prod`.

---

## Part F — Closed test (the 14-day clock)

1. **Make sure the Dashboard checklist is fully green** (Parts C and D). A closed test can't be sent
   for review with anything missing.
2. *Test and release → Testing → Closed testing* → the default track (often "Closed testing -
   Alpha") → **Manage track**.
3. **Countries/regions** tab → add **Sri Lanka** (and the **United Arab Emirates** if any testers
   live there).
4. **Testers** tab:
   - **Create email list** → name "Plan B testers" → paste the **15–20 Gmail addresses**,
     comma-separated → Save. Aim above 12 so a few dropping out doesn't restart anything.
   - **Feedback URL or email**: the Plan B support email.
   - Save.
5. **Releases** tab → **Promote release** from Internal testing (the same tested build), or
   **Create new release** and pick it from the library. Release notes: "Closed test — please try
   the courses and send us feedback."
6. Top right: *Publishing overview* → **Send changes for review**.
7. **Wait for approval** (usually 1–3 days for a new account, can be up to 7). You get an email.
8. **As soon as it's approved:** Testers tab → copy the **Join on the web** link → send it to every
   tester with these instructions:

   > 1. On your **Android phone**, open this link while signed in with the Gmail address you gave
   >    me: `<link>`
   > 2. Tap **Become a tester**.
   > 3. Tap the Google Play link on that page and **install Plan B Academy**.
   > 4. **Keep it installed for at least 2 weeks**, and open it a few times a week — look at a
   >    course, watch a bit of a lesson, tick a checklist item.
   > 5. Send me anything that looks wrong or confusing.

9. **During the 14 days:**
   - Play Console Dashboard shows how many testers have opted in and how many days are complete.
     Check it every couple of days; chase anyone who hasn't joined.
   - Testers must **not leave the test**. If the count drops below 12, the requirement isn't met.
   - **Keep a simple log of tester feedback and what you changed.** The production application
     asks for exactly this.
   - **Ship at least one update** during the test (Phase 3 fixes). Build → upload to **Closed
     testing** directly. Each update needs a short review but does **not** reset the 14 days.

---

## Part G — Apply for production, then go public

1. After 14 days with 12+ testers, the Dashboard shows **Apply for production**.
2. The form asks roughly three groups of questions — answer honestly, in your own words:
   - **About the closed test:** how you recruited testers, how they used the app, what feedback
     you got (use your log).
   - **About the app:** who it's for (adults in Sri Lanka preparing for study/work in the UAE),
     what value it gives, how many installs you expect in the first year.
   - **Production readiness:** what you changed because of the test, and why you think it's ready.
3. Google replies within about 7 days. If refused, the email says why — usually "testers weren't
   engaged enough" → run the closed test longer and re-apply.
4. Once approved: *Test and release → Production* → **Countries/regions** → add Sri Lanka (plus
   any others the client wants) → **Create new release** → promote the latest closed-test build →
   **Staged rollout 20%** → Send for review.
5. After a few quiet days (check *Monitor and improve → Android vitals* for crashes), increase to
   50%, then 100%.

---

## Part H — Things that will bite later (read before switching payments on)

- **Google Play's Payments policy.** Apps on Google Play that sell **digital content used inside
  the app** — which includes video courses — are generally required to use **Google Play Billing**,
  not an outside gateway like PayHere. Real-world services (e.g. career or visa help delivered by
  people) are usually allowed to use outside payment. Before `PAYMENTS_ENABLED=true` in a Play
  build, check the current policy for course sales in Sri Lanka and decide with the client — this
  could change pricing (Google takes a fee) and needs its own build work.
- **Target API level.** Google raises the minimum Android version apps must target every August.
  If Play Console shows a target API warning on upload, tell me — it's an Expo SDK update.
- **The upload key lives in EAS.** Don't delete the EAS project or its Android credentials. If it's
  lost, Google can reset it, but it takes days.
- **Keep your account in good standing.** Missing one of Google's policy emails can get the app
  removed. Make sure the Play developer email is one you read.
