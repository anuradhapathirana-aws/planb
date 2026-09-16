# Plan B Academy — Security Fixes & Play Store Launch Guide

> **Who this is for:** an AI coding agent (Claude Code) or a developer working through the launch
> checklist **one task at a time**. Every task is self-contained: problem, where, what to do, and
> when it counts as done.
>
> **Source:** full read-only security audit of `backend/`, `mobile/`, `web/`, seeders and git
> history, 15 September 2026, then a second independent re-verification pass the same day (§3).
> Line numbers were correct on that date; re-locate code by the function/class name if they have
> drifted.

---

## 0. How to use this guide (read first, every session)

### Working rules for the agent

1. **Do one task per session/branch.** Pick the first unchecked task in order. Phases are ordered by
   launch priority — Play Store rules first, then high-risk holes.
2. **Before coding, read:** root `CLAUDE.md`, `backend/CLAUDE.md` (for backend tasks),
   `mobile/CLAUDE.md` (for mobile tasks), and the files named in the task. Re-verify that the
   problem still exists — it may already be fixed.
3. **Stop and ask the user before:**
   - creating a new table or column (show the proposed migration first — CLAUDE.md §12.4),
   - installing a package not listed as approved in §1 below,
   - anything the task marks **ASK**.
4. **Never** edit an already-run migration, weaken a test to make it pass, or bypass authorization
   "temporarily".
5. **Every task finishes with:**
   - feature/unit tests for the change (happy path + the attack being closed),
   - `php artisan test` + `./vendor/bin/pint` (backend) / `npx tsc --noEmit` + `npm run lint`
     (mobile, web),
   - `docs/CHANGELOG.md` updated; `docs/api-endpoints.md` / `docs/schema.md` if touched,
   - **no git commit, branch or push by the agent.** The user reviews the changes and commits
     them manually. Leave the work uncommitted, list the changed files, and suggest a
     Conventional Commit message (e.g. `fix(payment): store receipts on private disk`),
   - ticking the task's checkbox in this file and adding the date.
6. User-facing strings go through `t('key')` with EN + SI entries in `shared/src/i18n`.

### Task ID legend

`P1-x` Play Store blockers · `P2-x` High risk · `P3-x` Medium · `P4-x` Low · `D-x` Deployment ·
`G-x` Google Play Console · `R-x` Release

---

## 1. Decisions already made (do not re-ask)

| Topic | Decision |
|---|---|
| Platform | Android only (Google Play). iOS later. |
| Play account | **Personal** → mandatory closed test: ≥12 testers opted in for 14 continuous days before production access. |
| Payments | **Hidden at launch.** Card and bank transfer come in a later update. |
| Account deletion | **Instant anonymise**: delete profile, photo, CV, video, progress, attempts, checklist, wishlist, tokens. Keep order/payment rows (finance) with PII removed. |
| Audience | **18+.** Keep `MIN_AGE_YEARS = 18`. Play target audience 18+. |
| Legal pages | Agent drafts Privacy Policy + Terms from the data inventory (§8); **client approves the text** before launch. Hosted on the backend domain. |
| Play reviewer login | Fixed reviewer email + fixed code from server `.env`; disabled when empty. |
| Paper results | **Score only** until the student has no attempts left or has passed; then per-question feedback + correct answers. |
| Student photos | Private (signed URLs). "Other learners" strip shows **initials only**, no faces. |
| Extra hardening in this release | Server-enforced lesson order · Admin TOTP 2FA · Sentry crash reporting (mobile) |
| Deferred | Laravel 11 → 12 upgrade (11 is out of security support) — first task after launch. |
| Approved new packages | `pragmarx/google2fa` (backend) · `@sentry/react-native` via `npx expo install` (mobile). Anything else: ASK. |

---

## 2. Already verified secure (do not "fix")

- Admin (`User`, cookie session) and student (`Student`, Bearer token) guards are separated;
  actor middleware rejects the wrong actor on both route groups.
- OTP: `random_int` 6 digits, bcrypt-hashed, 10-min expiry, single use, throttled per email and IP,
  identical response whether the email exists or not.
- Google ID token: signature, `aud`, `iss`, `exp`, `email_verified` all checked server-side.
- Paywall checked before existence on stream/progress/paper; free-enrol checks price server-side;
  order amount comes from the server.
- PayHere webhook: `hash_equals` signature, unique event key, row lock, amount/currency match.
- Student IDOR: orders, attempts, progress, checklist, wishlist, profile all scoped to the user.
- Mass assignment: every write uses `validated()` or explicit arrays.
- Mobile: token in SecureStore `WHEN_UNLOCKED_THIS_DEVICE_ONLY`; production refuses non-HTTPS
  (`mobile/src/lib/env.ts`); cleartext off in production; no AsyncStorage, no WebView, no
  debug bypass; sign-out revokes server token and clears cache.
- Web admin: no `dangerouslySetInnerHTML`, no tokens in storage, no source maps, service worker
  does not cache API responses.
- Git history (all 31 commits): no secrets ever committed; real `.env` files never tracked.
- Mobile screenshot/recording block is already global: `mobile/app/_layout.tsx:163-169` calls
  `ScreenCapture.preventScreenCaptureAsync()` on mount; only the Home tab opts out
  (`app/(tabs)/index.tsx:196-211`). Lesson and paper screens inherit the block. Nothing to do.
- Mobile 401 handling already clears the query cache and routes to sign-in
  (`src/api/client.ts:121-125` → `onUnauthenticated` wired in `app/_layout.tsx:197-211`). Only the
  store's `student` field is left stale — see P3-1.

---

## 3. Verification log

**Second pass, 15 September 2026** — every finding below was re-opened and re-read in the current
code (backend and web by the lead agent directly; mobile by a fresh sub-agent). Verdicts:

| Task | Verdict | Current evidence |
|---|---|---|
| P1-1 / P1-3 no account deletion | CONFIRMED | `routes/api_student.php` has only `DELETE profile/photo` and wishlist; `routes/web.php` serves only `welcome` |
| P1-2 / P1-4 no legal/support links in app | CONFIRMED | `shared/src/i18n/en.json` mentions "contact Plan B support" as plain text only; no `Linking`/`openExternalUrl` to any legal page |
| P1-5 permissions / backup | CONFIRMED | `app.config.ts:162-170` no `microphonePermission:false`; `android` block (113-132) has no `blockedPermissions`, no `allowBackup` |
| P1-6 production env missing | CONFIRMED — real crash | `eas.json:28-35` only `APP_VARIANT`; `app.config.ts:34` falls back to `http://localhost:8001`; `env.ts:94-99` throws at module load in production |
| P1-8 raw error UI in prod | CONFIRMED | `_layout.tsx:93-134` renders `error.stack`; `StartupStalled` (58-78) shown unconditionally at line 292 |
| P2-1 seeded admin password | CONFIRMED | `DatabaseSeeder.php:14-20` calls `AdminUserSeeder` + `StudentSeeder` unconditionally; `AdminUserSeeder.php:29` `'Password123!'`; `README.md:18,24` prints logins |
| P2-2 public receipts | CONFIRMED | `Payment.php:75` no `useDisk()`; `PaymentService.php:390-392` client extension + `receipt-{id}` name |
| P2-3 public photos, faces shared | CONFIRMED | `Student.php:144` no `useDisk()`; `StudentManagementService.php:123` `{student_id}.jpg`; `LearnerAvatarResource.php:29` returns public `photo_url` |
| P2-4 sandbox webhook | CONFIRMED | `SandboxGateway.php:59` `! environment('production')`; `PaymentGatewayManager.php:24` always registers it; `routes/api.php:177` accepts any `{gateway}` |
| P2-5 answer-key leak | CONFIRMED (by design — docblock says so) | `CoursePaperAnswerResource.php:42` always sends `is_correct`; only `correct_option_*` is gated by `$reveal` |
| P2-6 trusted proxies | CONFIRMED | `bootstrap/app.php` has no `trustProxies()` |
| P3-1 cross-account data | CONFIRMED (narrowed) | `authStore.ts:62-67` `signIn` never clears query cache; sign-in/verify screens don't redirect a signed-in user. 401 path is fine except `student` store field |
| P3-2 lesson order UI-only | CONFIRMED | `CourseController.php:77-117` `stream`/`recordProgress` check enrolment only (`assertEnrolledInLessonCourse`) |
| P3-3 fake watch progress | CONFIRMED | `StudentCourseService.php:284-285` stamps `last_seen_at` on stream fetch; `CourseProgressService.php:58,99-107` allowance = elapsed×2+5 from that stamp |
| P3-4 refresh abuse | CONFIRMED | `api_student.php:82` no throttle; `StudentAuthService.php:242` re-grants grace to any calling token |
| P3-5 admin login | CONFIRMED | `AdminAuthService.php:25-35` distinct messages + early return before `Hash::check`; `:16,59` 100-year lock; `api.php:31` GET unlock |
| P3-6 no 2FA | CONFIRMED | no `two_factor`/`totp` anywhere in `backend/` or `web/` |
| P3-7 env template | CONFIRMED | `.env.example:2,4,29,31` dev values; no `SESSION_SECURE_COOKIE`; `:86` and `:147` both PayHere secret keys |
| P3-8 no security headers | CONFIRMED | no HSTS/nosniff/frame header anywhere in `app/`, `bootstrap/`, `config/` |
| P3-9 all roles see PII | CONFIRMED | `StudentPolicy.php:19-22` `view` = any role (there is no separate `documentLink` ability; document links authorise via `view`) |
| P4-1 OTP off-by-one | CONFIRMED | `StudentAuthService.php:106` `increment()` then `:110` `attempts + 1` |
| P4-2 google_sub overwrite | CONFIRMED | `StudentAuthService.php:160` `forceFill(google_sub)`; `:219` email fallback |
| P4-5 paper auto-start | CONFIRMED | `app/paper/[id].tsx:43-58` `startAttempt` runs as a `useQuery` on mount |
| P4-6 URL scheme checks | CONFIRMED (low) | `webBrowser.ts:75-90` no scheme check (only caller passes admin banner URLs); `parseHtml.ts:126-133` scheme-less hrefs are inert in practice |
| P4-11 web 401 cache | CONFIRMED | `web/src/api/client.ts:29-30` clears auth store only |
| P4-13 `.expo` tracked | CONFIRMED | `git ls-files mobile/.expo` lists logs, `devices.json`, `router.d.ts` |
| P4-14 console.warn in prod | CONFIRMED | `googleAuth.ts:44-54` ungated (the one at 68-78 is gated) |
| (old) screen-capture unused | **FIXED — removed from list** | see §2 |
| Secrets in tracked files | NONE | only `REDIS_PASSWORD=null`, `MAIL_PASSWORD=null` in `.env.example` |
| Hardcoded test/bypass logins in mobile | NONE | grep for test emails / fixed OTPs / bypass flags: no matches |

New items found in this pass (added below): P1-6 also covers the unpinned `eas.json` `cli.version`
floor; P3-1 also covers the duplicated clear-session logic in `client.ts`.

---

## PHASE 1 — Google Play policy blockers

### [x] P1-1 Account deletion (backend) — done 2026-09-16, branch `feature/account-deletion`

**Built:** `POST /student/account/deletion-code`, `DELETE /student/account` (204) →
`StudentAccountService`; shared `StudentLoginCodeService` (moved out of `StudentAuthService`);
migration `2026_09_16_100000_add_account_deletion_fields`; 11 tests in
`StudentAccountDeletionTest`. Differences from the plan below, decided while building:
- `purpose` is a `string(32)` column + PHP enum `LoginCodePurpose`, not a DB enum
  (backend/CLAUDE.md §7).
- `email`, `google_sub` and `full_name` are set to **null**, not a placeholder like
  `deleted-{id}@invalid.local` / "Deleted student". The unique indexes allow many nulls, and a null
  keeps no fake data. The row is also soft-deleted.
- Receipts and bank reference numbers are **kept** (user decision, 2026-09-16).
- A student with no email on file gets a 422 telling them to contact support (they cannot receive
  a code).
- Rate limits: code request 3 per 10 min per student; delete 6/min per student.

**Problem:** Play requires in-app account deletion for any app that creates accounts. No student
delete endpoint exists (`backend/routes/api_student.php`).

**Do:**
1. **ASK first** — show this migration for approval:
   - `students.anonymised_at` nullable timestamp.
   - `student_login_codes.purpose` (enum `sign_in` | `delete_account`, default `sign_in`) — only if a
     purpose column does not already exist.
2. `POST /api/v1/student/account/deletion-code` → emails a `delete_account` OTP (reuse the existing
   OTP service + throttles; queued notification).
3. `DELETE /api/v1/student/account` with Form Request `DeleteStudentAccountRequest` (`code`
   required) → `app/Services/Student/StudentAccountService::delete(Student $student, string $code)`.
4. Inside one DB transaction:
   - verify the `delete_account` code (same hashing/attempt rules as sign-in),
   - delete all Sanctum tokens for the student,
   - clear Media Library collections: profile photo, CV, profile video,
   - delete lesson progress, paper attempts + answers, checklist ticks, wishlist, login codes,
   - anonymise the row: `email = "deleted-{id}@invalid.local"`, `full_name = "Deleted student"`,
     null DOB/address/phone/bio/visa/qualification/google_sub, `is_blocked = true`,
     `anonymised_at = now()`,
   - keep orders, payments, enrolments rows (finance). Receipts are kept on private storage (P2-2).
5. Return `204`. An anonymised student can never authenticate (blocked + no tokens), and the
   original email can register again as a fresh account.

**Done when:** feature tests prove tokens revoked, PII null, media removed, orders kept, wrong code
→ 422, other student unaffected, sign-in with the old email creates a *new* student.

### [x] P1-2 Account deletion (mobile) — code done 2026-09-16, device test pending

**Built:** red text link under Sign out (`app/(tabs)/profile.tsx`) → `DeleteAccountSheet`
(what's deleted / kept, "Email me a code") → full screen `app/profile/delete-account.tsx` (OTP,
resend timer, destructive confirm) → local sign-out + `queryClient.clear()` → `/sign-in`.
API in `src/api/account.api.ts`; types `DeletionCodeResponse`, `DeleteAccountPayload` in
`shared/src/types/studentAuth.ts`; strings `account.*` in `shared/src/i18n/en.json` (SI pending
from client — falls back to EN). Differences from the plan below, decided with the user:
- The code is entered on a **full screen**, not inside the sheet (a `Modal` sheet doesn't move with
  the keyboard on Android).
- The entry point is a **small red text link**, not a full-width button.
- No server logout call after deleting: the server already revoked every token.

**Still to do before ticking "done when":** run it end-to-end on a device (needs
`php artisan migrate` for P1-1 and a running `queue:work` so the code email is sent).

**Where:** `mobile/app/(tabs)/profile.tsx` (only "Sign out" exists today, ~line 190).

**Do:**
1. Add a "Delete account" row (destructive styling) below Sign out.
2. Opens a `Sheet`: what is deleted, what is kept (payment records for accounting), irreversible.
3. "Send code" → `POST account/deletion-code`, then a 6-digit code input (reuse the OTP input from
   `app/verify.tsx`), then `DELETE account`.
4. On success: reuse the existing sign-out path (`authStore.signOut` → `queryClient.clear()`,
   `clearSession()`), toast "Your account has been deleted", route to sign-in.
5. API function in `mobile/src/api/profile.api.ts` (or new `account.api.ts`); types in `shared/`.
6. Errors surface as toasts via `errorMessage()`.

**Done when:** end-to-end on a device: delete → signed out → sign in again with same email gives an
empty new profile.

### [x] P1-3 Public account-deletion web page — done 2026-09-16

**Built:** `GET /account-deletion` (`routes/web.php`, `resources/views/legal/account-deletion.blade.php`,
shared `resources/views/legal/layout.blade.php` for P1-4), values in `config/legal.php`, logo at
`public/images/planb-logo.png`, 3 tests in `tests/Feature/Legal/AccountDeletionPageTest.php`.
Decisions (user, 2026-09-16): no-app route is **email support** (staff delete by hand, within 30
days), payment records kept **7 years**, hosted on the backend (no Plan B website yet).
**Before launch:** set `MAIL_SUPPORT_ADDRESS` (the page shows "coming soon" without it) and have
the client approve the wording.

**Do:** Blade view at `GET /account-deletion` (`backend/routes/web.php`): app name, steps to delete
in-app (Profile → Delete account), a support email for people who no longer have the app, what is
deleted vs retained and for how long. This URL goes into Play Console → Data safety → "Delete
account URL".

**Done when:** page reachable without login over HTTPS, readable on a phone.

### [x] P1-4 Privacy Policy & Terms pages + in-app links — code done 2026-09-16, client approval pending

**Built:** `/privacy`, `/terms` (`resources/views/legal/`), `legal` block on `GET /student/app-config`,
Profile "Help & legal" card and sign-in consent line (`mobile/src/features/legal/useLegalLinks.ts`),
5 tests. Decisions (user, 2026-09-16): data **shared with UAE employers/agencies only with the
student's agreement**; **no refund once a lesson is opened / service started**; **Sri Lankan law**;
company address and registration number left blank for the client (`LEGAL_COMPANY_ADDRESS`,
`LEGAL_COMPANY_REGISTRATION_NUMBER`).
**Before launch:** client approves both texts; fill company details and `MAIL_SUPPORT_ADDRESS`;
Sinhala strings from the client. **Keep in sync:** P3-11 (Sentry) must add "crash logs" to the
privacy policy; switching payments on must re-check the payment and refund sections; the Data
safety form must mark name/contact/CV/video as **Shared** (employers).

**Do:**
1. Blade views `GET /privacy` and `GET /terms` with a shared minimal layout (Plan B brand, mobile
   readable). Draft text from the Data safety inventory in §8: what is collected, why, retention,
   deletion, third parties (Google Sign-In, Sentry, SendGrid, hosting, later PayHere), contact.
   Mark the draft clearly — **client must approve final wording**.
2. Add to `GET /api/v1/student/app-config` (and its Resource + `shared/` type):
   `privacy_url`, `terms_url`, `support_email`, `account_deletion_url` (from config/env).
3. Mobile Profile: rows "Privacy policy", "Terms of use", "Contact support" (`mailto:`), opened
   with `openExternalUrl` (`mobile/src/lib/webBrowser.ts`).
4. Sign-in screen footer: "By continuing you agree to the Terms and Privacy Policy and confirm you
   are 18 or older." with both links tappable.

**Done when:** all links open from a release build; strings in EN + SI.

### [x] P1-5 Remove unused Android permissions + disable backup — done 2026-09-16

**Built:** `mobile/app.config.ts` — `expo-image-picker` gets `microphonePermission: false`,
`android.allowBackup: false`, and `android.blockedPermissions` for `RECORD_AUDIO`,
`READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO` and `SYSTEM_ALERT_WINDOW`. Verified with
`npx expo config --type introspect`: all four appear as `tools:node="remove"` and the application
tag carries `android:allowBackup="false"`. `microphonePermission: false` also drops
`NSMicrophoneUsageDescription` from the iOS plist.

**Three deviations from the plan below, after reading the libraries' own manifests and Kotlin:**

- **`READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE` are NOT blocked.** `ImagePickerModule.kt`
  (`getMediaLibraryPermissions`) returns an empty array on Android 13+ but asks for these two below
  it, so blocking them denies "Choose photo" on every pre-Android-13 phone — and the camera below
  Android 10 — which the "Done when" here explicitly requires to keep working. Both are already
  capped at `maxSdkVersion="32"`, which is why they do not trigger the Play photo/video declaration.
- **`DETECT_SCREEN_CAPTURE` is NOT blocked** (it was not in the plan, and should not be added):
  `ScreenCaptureModule` calls `registerScreenCaptureCallback` on every launch on Android 14+, which
  throws a `SecurityException` without it. Normal, install-time, auto-granted.
- **`SYSTEM_ALERT_WINDOW` IS blocked, and the reason in the plan is wrong.** It is not merely in
  React Native's debug manifest — Expo's own prebuild template
  (`@expo/config-plugins/build/plugins/withAndroidBaseMods.js`) puts it in the main manifest, so it
  ships in release. `VIBRATE` comes from the same template and is deliberately kept: push
  notifications are planned and a channel's vibration pattern silently dies without it.

`READ_MEDIA_IMAGES` came from `expo-screen-capture` (Android 13 only, for screenshot *detection*).
The app only calls `preventScreenCaptureAsync` / `allowScreenCaptureAsync`, which set `FLAG_SECURE`
and need no permission, so nothing is lost.

**Still to do:** confirm on the next build — `aapt dump permissions` on the AAB, plus "Choose photo"
and "Take photo" on an Android 13+ device and an Android 10 device.

**Where:** `mobile/app.config.ts`.

**Problem:** `expo-image-picker` without `microphonePermission: false` adds `RECORD_AUDIO`;
`expo-screen-capture`/file-system add `READ_MEDIA_IMAGES` and legacy storage permissions.
`READ_MEDIA_IMAGES` forces the Play "Photo and video permissions" declaration, which Google usually
rejects when the system photo picker suffices (it does here).

**Do:**
1. `expo-image-picker` plugin options: add `microphonePermission: false`.
2. `android.blockedPermissions`: `android.permission.RECORD_AUDIO`,
   `android.permission.READ_MEDIA_IMAGES`, `android.permission.READ_MEDIA_VIDEO`,
   `android.permission.READ_EXTERNAL_STORAGE`, `android.permission.WRITE_EXTERNAL_STORAGE`,
   `android.permission.SYSTEM_ALERT_WINDOW`.
3. `android.allowBackup: false`.
4. Comment *why* each is blocked (house style: comments explain why).

**Done when:** `npx expo prebuild --platform android --clean` in a throwaway copy (or `aapt dump
permissions` on the built AAB/APK) shows only `INTERNET`, `CAMERA`, network state, and
Expo-required permissions; camera + photo picking still work on Android 13+ and Android 10.

### [x] P1-6 Production EAS profile — code done 2026-09-17, first build pending

**Built:** `eas.json` production profile reads the EAS **"production" environment**
(`"environment": "production"`) and has `autoIncrement: true`; `submit.production.android` points
at `./play-service-account.json` (gitignored) on the `internal` track; CLI pinned to **24.6.0** in
`eas.json` and in the `build:*` scripts; new `build:prod` / `submit:prod` scripts. Decisions (user,
2026-09-17): domain **theplanbs.com** → API `https://api.theplanbs.com/api/v1` (matches
`docs/deployment.md`); values set by the user on EAS, not committed. One addition to the plan:
`app.config.ts` throws when a production build runs on an EAS worker (`EAS_BUILD=true`) with a
missing or non-https `EXPO_PUBLIC_API_BASE_URL`, so the mistake fails the build instead of shipping
an AAB that crashes on launch. Local `npx expo config` is unaffected.

**Still to do:**
- Create the variable (user):
  `npx eas-cli@24.6.0 env:create --environment production --name EXPO_PUBLIC_API_BASE_URL --value https://api.theplanbs.com/api/v1 --visibility plaintext`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` is **not set yet** — it needs the production Android OAuth
  client from G-2 (the local `.env` id belongs to the development package). Until then the
  production app offers email-code sign-in only. `EXPO_PUBLIC_SENTRY_DSN` comes with P3-11.
- The **first** AAB must be uploaded by hand in Play Console (Google's API cannot create an app's
  first release); `submit:prod` works from the second build on. If Play answers "Only releases with
  status draft may be created on draft app", add `"releaseStatus": "draft"` to the submit profile
  until the app's store listing and content setup are complete.
- "Done when" needs D-1..D-5 (the API live on `api.theplanbs.com`) and a real build.

**Where:** `mobile/eas.json`, `mobile/package.json`.

**Problem:** the production profile has no API URL → app falls back to `http://localhost` → the
HTTPS guard in `env.ts` crashes the app on launch.

**Do:**
1. Production env: `EXPO_PUBLIC_API_BASE_URL=https://api.<domain>/api/v1`,
   `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<id>`, later `EXPO_PUBLIC_SENTRY_DSN`. Prefer **EAS
   environment variables** (expo.dev dashboard, "production" environment) over committing them.
   **ASK** the user for the real domain.
2. `build.production.autoIncrement: true` (versionCode; `appVersionSource` is already `remote`).
3. `submit.production.android: { "serviceAccountKeyPath": "./play-service-account.json",
   "track": "internal" }` and add `play-service-account.json` to `mobile/.gitignore`.
4. Pin the CLI: replace `npx eas-cli@latest` in `package.json` scripts with a fixed version and
   change `eas.json` `cli.version` from the floor `">= 5.0.0"` to an exact version; add
   `build:prod` and `submit:prod` scripts.

**Done when:** `eas build --profile production --platform android` produces an AAB that starts and
reaches the real API.

### [ ] P1-7 Google Play reviewer login

**Problem:** reviewers cannot receive our email OTP; an app they cannot sign in to is rejected.

**Do:**
1. `backend/config/play_review.php`: `email` = `env('PLAY_REVIEW_EMAIL')`, `code` =
   `env('PLAY_REVIEW_CODE')`. Both empty by default ⇒ feature off.
2. In `StudentAuthService` code verification: if both configured, the email matches exactly
   (case-insensitive) and `hash_equals(config code, submitted code)` → sign in as that student
   without sending/consuming an email code. Same throttles apply. Requesting a code for that email
   sends nothing.
3. Add both keys (blank) to `.env.example` with a comment.
4. The reviewer student is a normal account enrolled in one free demo course (create manually in
   production, not via seeder).

**Done when:** tests: disabled when empty; wrong code rejected; only that email accepted; throttle
still applies.

### [ ] P1-8 Hide technical errors in the production crash screen

**Where:** `mobile/app/_layout.tsx` (~lines 58–114: error boundary renders `error.name`,
`error.message`, `error.stack`; "Metro is not serving assets" screen).

**Do:** render those details only when `__DEV__`; in production show a translated friendly message
+ "Try again" button. (Sentry — P3-11 — will capture the real error.)

**Done when:** a thrown error in a production build shows no stack/paths.

### [ ] P1-9 Payments switched off (server-enforced)

**Do:**
1. `config/payments.php` (or existing payments config): `enabled` = `env('PAYMENTS_ENABLED', false)`.
2. Middleware or service guard: order creation, checkout, bank-transfer submit, service purchase
   return `403` with a friendly message while disabled. Free enrolment keeps working. Webhooks
   remain routed (harmless, signature-verified).
3. Expose `payments_enabled` in `app-config`; mobile shows "Coming soon" instead of Buy/Enrol on
   paid courses and services (`mobile/src/features/enrolment/useEnrol.ts`, course & service detail
   screens).

**Done when:** tests prove each paid endpoint 403s when disabled; UI shows no buy button.

---

## PHASE 2 — High-risk security holes

### [ ] P2-1 Seeders create a known Super Admin password in production

**Where:** `backend/database/seeders/AdminUserSeeder.php:29` (`Password123!`),
`DatabaseSeeder.php:16-18` (runs admin + 41 fake students unconditionally), `README.md:18-24`.

**Do:**
1. `DatabaseSeeder`: run `AdminUserSeeder`/`StudentSeeder` only when
   `app()->environment('local', 'testing')`; otherwise throw a clear exception. Reference-data
   seeders (roles, industries) may still run.
2. New command `php artisan admin:create` — prompts name, email, role, password (hidden input),
   validates `Password::min(12)->mixedCase()->numbers()->uncompromised()`.
3. README: remove printed credentials for production; document `admin:create`.

**Done when:** test: `db:seed` in production env throws and creates no admin.

### [ ] P2-2 Bank-transfer receipts are public, guessable, and client-chosen extension

**Where:** `backend/app/Models/Payment.php:75-82` (no `useDisk`, falls back to `public`),
`PaymentService.php:388-393` (filename uses `getClientOriginalExtension()`),
`Resources/PaymentResource.php:34`, `Resources/Student/StudentPaymentResource.php:32`,
`web/src/features/admin/orders/components/OrderDetailSheet.tsx:223`.

**Attack:** `/storage/{mediaId}/receipt-{paymentId}.jpg` enumerable without login; a valid image
uploaded as `x.html`/`x.svg` is served as HTML on the API origin → script runs when an admin opens
it.

**Do:**
1. Receipt collection → private disk (create `payment_receipts` disk like `student_documents`,
   no `url`).
2. Filename: random UUID + extension from `guessExtension()` restricted to `jpg|png|pdf`.
3. Re-encode jpg/png with Intervention Image (strips EXIF/GPS).
4. Serve via a signed, short-lived (≤10 min) route, authorised for the owning student or admins
   with payment permission; response headers `X-Content-Type-Options: nosniff`,
   `Content-Disposition` appropriate, `Cache-Control: no-store`. Copy the pattern from
   `StudentDocumentService` / its controller.
5. Resources return the signed URL, never a public one.
6. Artisan command `payments:migrate-receipts` moving existing files off the public disk.

**Done when:** tests: public `/storage/...receipt` 404; signed URL works; expired/foreign → 403;
`.html` upload stored as `.jpg`/rejected.

### [ ] P2-3 Profile photos public with guessable names; other learners' faces exposed

**Where:** `Student.php:144`, `StudentManagementService.php:123` (`{student_id}.jpg` on public
disk), `LearnerAvatarService`, `Resources/Student/LearnerAvatarResource.php:29`,
`mobile/app/course/[id].tsx:429`.

**Do:**
1. Photo collection → private disk; UUID filename.
2. Signed short-lived photo URL (e.g. 60 min — fine for `expo-image` caching) in
   `StudentProfileResource` and admin student Resources.
3. `LearnerAvatarResource`: return only `initials` (and maybe total learner count) — no URL, no
   student_id.
4. Mobile course page: render initials circles.
5. Command to migrate existing photos.

**Done when:** `/storage/.../PB-*.jpg` 404; learner-avatars response contains no URL or ID.

### [ ] P2-4 Sandbox payment webhook can mark any order paid outside production

**Where:** `backend/app/Services/Payment/Gateways/SandboxGateway.php:57-60`,
`PaymentGatewayManager.php:32`, `routes/api.php:~387`.

**Do:**
1. Register the sandbox driver only when `app()->environment('local', 'testing')`.
2. Webhook controller rejects any `{gateway}` that is not the configured active gateway → 404.
3. Unknown gateway name → 404 instead of the current `InvalidArgumentException` 500.

**Done when:** tests: sandbox webhook in `production` and `staging` envs → 404, order unchanged.

### [ ] P2-5 Paper result leaks the answer key

**Where:** `Resources/Student/CoursePaperAnswerResource.php:42` (always sends `is_correct`),
`CoursePaperAttemptService::mayRevealAnswers()` (~line 209), test
`tests/Feature/Student/StudentPaperTest.php:150`.

**Note:** the Resource's docblock argues this is intentional ("the student is always told whether
their own answer was right"). The client has decided otherwise (§1): with unlimited attempts,
per-answer right/wrong lets a student rebuild the key in N−1 resubmits. Rewrite the docblock too.

**Do:** `is_correct` (per answer) → `null` unless `mayRevealAnswers()` is true, same rule already
applied to `correct_option_*`. Update the test to assert both states. Mobile paper result screen
shows score only when per-question data is null.

**Done when:** tests: attempts remaining + not passed ⇒ no per-answer correctness in JSON.

### [ ] P2-6 Trusted proxies

**Where:** `backend/bootstrap/app.php` (no `trustProxies`).

**Problem:** behind Nginx/Cloudflare every request shares the proxy IP → the per-IP OTP limit
(8/hour) blocks all students at once; HTTPS detection wrong.

**Do:** `$middleware->trustProxies(at: explode(',', env('TRUSTED_PROXIES', '127.0.0.1')))` with
appropriate headers; add `TRUSTED_PROXIES` to `.env.example`. If Cloudflare is used, list its
ranges or use `*` only when the origin firewall allows Cloudflare IPs exclusively (document which).

---

## PHASE 3 — Medium

### [ ] P3-1 Previous account's data visible after signing in as someone else (mobile)

**Where:** `mobile/src/stores/authStore.ts:62-67` (`signIn` doesn't clear cache — `queryClient`
isn't even imported), `app/sign-in.tsx`, `app/verify.tsx` (neither reads `useAuthStore`, so both
are reachable while signed in, also via `planb://verify?email=`), `app/profile/edit.tsx:91-100`
(prefills from cache → could save A's data into B's account).

Already OK: the 401 path (`src/api/client.ts:121-125` → `onUnauthenticated` in
`app/_layout.tsx:197-211`) clears the query cache and routes to sign-in. Its gap is that it
duplicates `clearSession()`/`setAccessToken(null)` instead of calling `authStore.signOut()`, so the
store's `student` field stays populated.

**Do:** `queryClient.clear()` at the start of `signIn`; redirect signed-in users away from
sign-in/verify; `_layout.tsx`'s unauthenticated handler calls `useAuthStore.getState().signOut()`
instead of duplicating its steps; `signOut` also calls `Image.clearDiskCache()` (expo-image).

### [ ] P3-2 Lesson order enforced only in the UI

**Where:** `StudentCourseService.php:224,248` (`is_locked` display only),
`CourseController::stream` / `recordProgress` (~lines 83, 107).

**Do:** extract the lock computation into a service method (e.g.
`StudentCourseService::isLessonUnlocked(Student, Lesson)`) and return 403 from both endpoints when
the previous lesson in programme order is not watched. Keep the paywall/enrolment check first.

### [ ] P3-3 Watch progress can be faked by waiting

**Where:** `CourseProgressService.php:67-99` (allowance `elapsed × 2 + 5s` from `last_seen_at`,
which is set when the stream URL is fetched).

**Attack:** fetch stream URLs for every lesson, idle for half the longest lesson, post full
duration for all → whole course marked watched, paper unlocked.

**Do:** cap each flush's `position`/`watched_delta` at ~2× the time since *that lesson's last
progress flush* (not since stream fetch); allow only one actively progressing lesson per student
at a time. Unit tests with Carbon time travel for the attack above.

### [ ] P3-4 Token refresh can be abused by a stolen token

**Where:** `StudentAuthService.php:236-252`, `routes/api_student.php:82`.

**Do:** a token already in its 60-s grace window cannot refresh (401); `throttle:10,1` on
`auth/refresh`; absolute session lifetime 180 days (store original issue time on the token
name/metadata or a column — **ASK** if a column is needed); schedule `sanctum:prune-expired
--hours=24` and expired-OTP cleanup daily in `routes/console.php`.

### [ ] P3-5 Admin login: lockout abuse, email enumeration, reusable GET unlock link

**Where:** `AdminAuthService.php:23-66`, `routes/api.php:28-31`,
`AdminAccountLockedNotification.php:23`.

**Do:** identical message and timing for unknown/wrong/locked (dummy `Hash::check`); throttle by
email+IP; lock is temporary with growing backoff instead of 100 years **or** keep the lock but make
unlock a POST from a confirmation page with a single-use nonce tied to the lock event (mail
scanners pre-fetch GET links).

### [ ] P3-6 Admin two-factor authentication (TOTP)

**Package:** `pragmarx/google2fa` (approved).

**Do:**
1. **ASK** — show migration: `users.two_factor_secret` (text, `encrypted` cast),
   `users.two_factor_recovery_codes` (text, `encrypted` cast),
   `users.two_factor_confirmed_at` (nullable timestamp).
2. Login becomes two steps when 2FA is confirmed: password OK → session flagged
   `2fa_pending` → `POST admin/auth/two-factor` with code or recovery code → full session. Every
   admin route requires completed 2FA (middleware).
3. Setup page in `web/` (Account settings): show QR (generate SVG server-side — **no new npm
   package**), confirm with a code, show 8 one-time recovery codes once.
4. Enforce for all admins: an admin without 2FA is forced to the setup page after login.
5. `admin:reset-2fa {email}` artisan command for lockouts.

### [ ] P3-7 Production environment template

**Do:** create `backend/.env.production.example` (placeholders only, no secrets):
`APP_ENV=production`, `APP_DEBUG=false`, `LOG_STACK=daily`, `LOG_LEVEL=warning`,
`SESSION_SECURE_COOKIE=true`, `SESSION_ENCRYPT=true`, `SESSION_LIFETIME=120`,
`SESSION_DOMAIN=.<domain>`, `SANCTUM_STATEFUL_DOMAINS=admin.<domain>`,
`FRONTEND_URL=https://admin.<domain>`, `MAIL_MAILER=sendgrid|smtp` (never `log`),
`QUEUE_CONNECTION=redis|database`, `PAYMENTS_ENABLED=false`, `PAYMENT_GATEWAY=payhere`,
`PAYHERE_SANDBOX=false`, `TRUSTED_PROXIES`, `GOOGLE_CLIENT_IDS`, `PLAY_REVIEW_EMAIL`,
`PLAY_REVIEW_CODE`. Remove duplicate `PAYHERE_SECRET` from `.env.example` (only
`PAYHERE_MERCHANT_SECRET` is read).

### [ ] P3-8 Security headers

**Do:** middleware on API + web responses: `Strict-Transport-Security: max-age=31536000;
includeSubDomains` (production only), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(),
geolocation=()`. Remove `X-Powered-By` (php.ini `expose_php=Off`, documented in D-2). For the admin
SPA, set a CSP with `frame-ancestors 'none'` at Nginx (D-3).

### [ ] P3-9 Admin least-privilege for student PII

**Where:** `app/Policies/StudentPolicy.php:19-22` (`view` = `hasAnyRole(RoleName::values())`, i.e.
every role incl. ContentManager and Accountant; the CV/video signed-link endpoint authorises via
this same `view`), `ServicePolicy`/`ServicePurchasePolicy::viewAny` (student emails to every role).

**Do:** restrict `view` (and therefore document links) to SuperAdmin + SupportAgent — or add a
separate `viewDocuments` ability if Accountant still needs the list but not CVs. Hide the matching
UI in `web/` with a `RequireRole`/permission check. **ASK** the user to confirm which roles need
student detail access.

### [ ] P3-10 Payable order safety (before payments are switched on)

**Where:** `OrderService.php:51`, `PaymentService::guardPayable` (~line 368),
`PaymentService.php:292-300`.

**Do:** `guardPayable` rejects when the purchasable is no longer published/purchasable, the price
changed since the order was created (cancel + ask to re-create), or the student already has the
enrolment. A later failed/chargeback callback must not overwrite a succeeded payment's status
(log + flag for admin review instead).

### [ ] P3-11 Sentry crash reporting (mobile)

**Package:** `@sentry/react-native` via `npx expo install` (approved). Requires a Sentry account —
**ASK** the user for the DSN. Rebuild dev client afterwards (native module).

**Do:** init only when `IS_PRODUCTION` and DSN present; `sendDefaultPii: false`; `beforeSend` /
`beforeBreadcrumb` strip `Authorization` headers, emails, query strings containing `signature` or
`token`; wrap the root layout error boundary. DSN via EAS env (`EXPO_PUBLIC_SENTRY_DSN` — a DSN is
not a secret). Update privacy policy + Data safety ("Crash logs", "Diagnostics").

---

## PHASE 4 — Low (quick, same release)

- [ ] **P4-1** OTP attempts off-by-one: `StudentAuthService.php:106-110` burns after 4 wrong tries
  (`increment()` already updates in memory, then `+1` again). Use a `lockForUpdate` read inside a
  transaction. Test exactly 5 attempts allowed.
- [ ] **P4-2** Google sign-in: if the email matches a student whose stored `google_sub` differs
  from the token's `sub`, refuse (don't overwrite) — `StudentAuthService.php:160,219`.
- [ ] **P4-3** Throttle `PUT profile`, `POST profile/photo`, paper attempt start/submit
  (`api_student.php:92-93, 207-208`), e.g. `throttle:20,1`.
- [ ] **P4-4** Paper attempt lookup scoped to the student so foreign and missing IDs both 404
  (`PaperController.php:74,83`); unique-index race on start → 409 not 500.
- [ ] **P4-5** Mobile `app/paper/[id].tsx:382-397`: don't create an attempt on screen open (deep
  link `planb://paper/{id}`); start on explicit tap.
- [ ] **P4-6** `mobile/src/lib/webBrowser.ts:75-90` `openExternalUrl`: allow only `https:`/`http:`
  (plus `mailto:`/`tel:` where intended). Today its only caller is `HomeCarousel.tsx:443` with an
  admin-authored banner URL that the backend already restricts to http/https, so this is
  defence-in-depth, not an open hole. `mobile/src/lib/parseHtml.ts:126-133`: accept only absolute
  `https`/`http`/`mailto`/`tel` hrefs (scheme-less values are inert today but the "relative is
  safe" claim is unenforced).
- [ ] **P4-7** `backend/app/Support/HtmlSanitizer.php:161-165`: reject hrefs containing `\`;
  compare `target` case-insensitively (or always add `rel="noopener noreferrer"` to links).
- [ ] **P4-8** `CourseVideoPlaybackController.php:32-36`: when a student is bound to the signed
  URL, re-check enrolment. Remove the unreachable raw `external_url` branch in
  `CourseVideoService.php:99-101`.
- [ ] **P4-9** `Resources/Student/StudentProfileResource.php:38-39` uses admin
  `IndustryResource`/`ProfessionResource` → switch to a student Resource
  (`StudentReferenceResource`). `UpdateStudentProfileRequest.php:59-60,80-81`: `exists` rules add
  `->where('is_active', true)`; cross-check profession ↔ stored industry when only one is sent.
- [ ] **P4-10** Admin list endpoints cap `per_page` at 100 (`StudentManagementService.php:53`,
  `OrderService.php:122`, `IndustryManagementService.php:34`, `ProfessionManagementService.php:38`,
  `CourseProgrammeService.php:47`, `CourseCategoryService.php:36`) — copy
  `ServicePurchaseService::perPage`. Escape LIKE wildcards with `addcslashes($s, '%_\\')`
  (`OrderService.php:94`, `StudentManagementService.php:28-30`).
- [ ] **P4-11** `web/src/api/client.ts:29-30`: on 401 also `queryClient.clear()`.
- [ ] **P4-12** `StudentManagementService.php:169` CSV import: `array_slice` row to header length
  before `array_combine` (malformed row → 500 today).
- [ ] **P4-13** `git rm -r --cached mobile/.expo` (ignored but committed; contains LAN IPs, logs).
- [ ] **P4-14** Remove the production `console.warn` in `mobile/src/lib/googleAuth.ts:45` (or wrap
  in `__DEV__`).
- [ ] **P4-15** Checkout redirect page (`CheckoutRedirectController`, `PayHereGateway.php:51-54`)
  shows student name/email/phone for 30 min to anyone with the link → shorten TTL to 5 min.
- [ ] **P4-16** Dependency audit: `composer audit` (backend), `npm audit --omit=dev` (web),
  `npm run audit` (mobile). Fix highs/criticals (mobile: only via `npx expo install --fix`).

---

## PHASE D — Production server deployment (Contabo VPS, Ubuntu)

> Write the final, real version of this as `docs/deployment.md` (referenced by CLAUDE.md but
> missing). Never put real secrets in either file.

### [ ] D-1 DNS & accounts
- `api.<domain>` → VPS IP (backend API + legal pages). `admin.<domain>` → VPS (web admin SPA).
- SendGrid: verify the sending domain (SPF, DKIM, DMARC records) — otherwise OTP emails land in spam
  and nobody can sign in.

### [ ] D-2 Server hardening
- Create a non-root sudo user; SSH **key-only** (`PasswordAuthentication no`,
  `PermitRootLogin no`); install `fail2ban`.
- `ufw allow 22,80,443/tcp`; `ufw enable`. MySQL and Redis bind to `127.0.0.1` only; Redis with
  a password.
- Unattended security upgrades on.
- PHP 8.2+ FPM with `expose_php=Off`, `display_errors=Off`, required extensions (gd/imagick,
  intl, mbstring, bcmath, redis, pdo_mysql, zip).
- MySQL: dedicated DB user with privileges on the app DB only.

### [ ] D-3 Nginx + TLS
- One server block per host; `root /var/www/planb/backend/public` for API, `web/dist` for admin
  (SPA fallback to `index.html`).
- `certbot --nginx` for both hosts; HTTP → HTTPS redirect; auto-renew timer active.
- `client_max_body_size` ≥ largest allowed upload (course videos for admin host).
- Deny dotfiles (`location ~ /\. { deny all; }`); `server_tokens off`.
- Admin host headers: CSP (incl. `frame-ancestors 'none'`), HSTS.

### [ ] D-4 Deploy backend
```bash
git clone … /var/www/planb && cd /var/www/planb/backend
composer install --no-dev --optimize-autoloader
cp .env.production.example .env   # fill real values, chmod 600, owned by deploy user
php artisan key:generate
php artisan migrate --force        # NEVER --seed in production
php artisan db:seed --class=RolesSeeder --force   # reference data only, if such seeder exists
php artisan storage:link
php artisan config:cache && php artisan route:cache && php artisan view:cache
php artisan admin:create           # real Super Admin (P2-1), then enable 2FA
```
- Permissions: `storage/` and `bootstrap/cache/` writable by `www-data` only; code not writable.
- Migrate existing media if copying data from dev: `payments:migrate-receipts`, photo migration
  command (P2-2, P2-3).

### [ ] D-5 Background processes
- **Supervisor** program for `php artisan queue:work --tries=3 --timeout=120` (2 processes). Without
  it no sign-in emails are sent. `php artisan queue:restart` on every deploy.
- Cron: `* * * * * cd /var/www/planb/backend && php artisan schedule:run >> /dev/null 2>&1`.

### [ ] D-6 Deploy web admin
- `cd web && npm ci && npm run build` with production `VITE_API_*` values; serve `dist/`.

### [ ] D-7 Backups & monitoring
- Nightly `mysqldump` + `storage/app` (private disks) → Backblaze B2, encrypted, 30-day retention;
  test one restore.
- Uptime check on `https://api.<domain>/up`; log rotation (`LOG_STACK=daily`, `LOG_DAILY_DAYS=14`).

### [ ] D-8 Post-deploy smoke test
- `curl -I https://api.<domain>` → HSTS, nosniff, frame headers, no `X-Powered-By`.
- `curl https://api.<domain>/api/v1/student/me` → JSON 401, no stack trace.
- A real OTP email arrives within a minute.
- `/storage/…/receipt-*.jpg` and `/storage/…/PB-*.jpg` → 404.
- `/privacy`, `/terms`, `/account-deletion` load on a phone.

### Every later deploy
```bash
git pull && composer install --no-dev -o && php artisan migrate --force \
  && php artisan config:cache && php artisan route:cache && php artisan view:cache \
  && php artisan queue:restart
```

---

## PHASE G — Google setup (Play Console + Google Cloud)

- [ ] **G-1** Play Console → Create app: name **Plan B Academy**, default language English, App,
  Free. Package is fixed forever at first upload: `lk.planbinternational.academy`.
- [ ] **G-2** Google Cloud (same project as existing OAuth clients) → Android OAuth client:
  package name + **SHA-1 of the Play App Signing key** (Play Console → Test and release → App
  integrity) **and** the EAS upload key SHA-1 (`eas credentials`). Put the client id in the EAS
  production env and in the backend `GOOGLE_CLIENT_IDS`. Also publish the OAuth consent screen
  (app name, logo, privacy URL) or external users get "unverified app".
- [ ] **G-3** Store listing: short description (≤80 chars), full description (≤4000), app icon
  512×512 PNG, feature graphic 1024×500, ≥2 phone screenshots (ideally 4–8, 1080×1920+), support
  email, privacy policy URL, category Education.
- [ ] **G-4** App content:
  - Privacy policy URL → `https://api.<domain>/privacy`
  - App access → "Restricted": reviewer email + code (P1-7) with instructions
  - Ads → No
  - Content rating questionnaire (Education, no user-generated public content)
  - Target audience → **18 and over**
  - Data safety → answers from §8
  - Account deletion URL → `https://api.<domain>/account-deletion`
  - Government apps → No; Financial features → none at launch (update when payments go live)
- [ ] **G-5** Play Console → Setup → API access → service account with release permission →
  JSON key saved as `mobile/play-service-account.json` (gitignored) for `eas submit`.

---

## PHASE R — Build, test, release (Personal account rules)

- [ ] **R-1** All Phase 1 + Phase 2 tasks done and deployed to the production server.
- [ ] **R-2** `eas build --profile production --platform android` → `eas submit --profile
  production` (internal track). Install from Play on real phones (Android 10 and 14 at least).
- [ ] **R-3** Release smoke test (R8 shrinking can break things only in release):
  OTP sign-in · Google sign-in · home/courses/services load · lesson playback, rotation, lesson lock
  · paper start/submit shows score only · checklist ticks · profile edit + photo (camera and
  gallery) · privacy/terms/support links · delete account end to end · sign out, sign in as a
  second user shows none of the first user's data · reviewer login · no paid buy buttons.
- [ ] **R-4** **Closed testing** track: create an email list/Google Group of **15–20 testers**
  (≥12 must stay opted in for **14 continuous days**). Share the opt-in link; ask testers to open the
  app regularly. Ship Phase 3/4 fixes as updates during the test.
- [ ] **R-5** After 14 days: Dashboard → **Apply for production** (questionnaire about the test and
  the app). Expect up to ~7 days.
- [ ] **R-6** Production release: staged rollout 20% → 50% → 100% over a few days, watching
  Android vitals (crash/ANR) and Sentry.
- [ ] **R-7** Pre-launch report (Play Console, automatic) has no crashes/security warnings.

### Expected timeline (Personal account)

| Step | Duration |
|---|---|
| Phase 1 (Play blockers) | 3–4 days |
| Phase 2 (high risk) | 2–3 days |
| Phase D + G (server, Google setup) | 2–3 days, in parallel |
| Internal testing + fixes | 1–2 days |
| **Closed test (12 testers × 14 days)** | **14 days, fixed by Google** |
| Phase 3 + 4 | 4–5 days, shipped as updates during the closed test |
| Production access review + app review | ~2–14 days |
| **Total to public** | **≈ 4–6 weeks** |

---

## 8. Data safety inventory (for Play form + privacy policy)

Keep this in sync whenever the app starts collecting something new.

| Data type (Play category) | What exactly | Purpose | Optional? |
|---|---|---|---|
| Personal info → Email | sign-in email | Account, sign-in codes | Required |
| Personal info → Name | full name (also from Google) | Account, certificates/services | Required |
| Personal info → Address | address | Career/migration services | Optional |
| Personal info → Other | date of birth, visa status, highest qualification, bio, industry, profession | Career services | Optional |
| Photos and videos → Photos | profile photo; (later) bank slip images | Profile; payment verification | Optional |
| Files and docs | CV, profile video (if uploaded via admin/app) | Job services | Optional |
| App activity → In-app actions | lesson progress, paper answers, checklist ticks, wishlist | Course progress | Required for learning |
| App activity → In-app search | course search terms | Search function (not stored long-term — verify) | — |
| Device or other IDs | device model name on the auth token | Session management | Required |
| App info and performance → Crash logs, Diagnostics | Sentry (P3-11) | Stability | Required |
| Financial info → Purchase history, Payment info | orders, bank reference, slips | **Only once payments are enabled — update form then** | — |

- Data encrypted in transit: **Yes** (HTTPS only).
- Data shared with third parties: **No** (processors — Google Sign-In, SendGrid, Sentry, hosting —
  are "service providers", not sharing, under Play's definition).
- Users can request deletion: **Yes** (in-app + `/account-deletion`).
- Retained after deletion: order/payment records for accounting (state period in privacy policy —
  **ASK client**, commonly 7 years in Sri Lanka for tax records).

---

## 9. After launch (backlog)

- Laravel 11 → 12 upgrade (security support ended March 2026).
- Before switching `PAYMENTS_ENABLED=true`: re-verify P3-10, P2-2, PayHere live merchant +
  webhook URL, update Data safety financial section, financial features declaration, privacy
  policy.
- Consider moving to an **Organization** Play developer account (D-U-N-S) and transferring the app,
  so the listing shows the company instead of a person.
- iOS App Store release (Apple Developer account, App Privacy labels, Sign in with Apple is required
  if Google Sign-In is offered on iOS).
