# Mobile — Plan B International student app

React Native + Expo. One codebase for Android and iOS. This is the **student** experience; `web/` is
the admin panel. The root `CLAUDE.md` applies in full; this file covers what is specific to `mobile/`.

## 1. Structure

`app/` is `expo-router` — **screens only, and thin**. A screen wires params to a hook and renders.
Every piece of logic lives in `src/`:

```
app/                    routes. (auth)/ · (tabs)/ · lesson/[videoId] · paper/[programmeId]
src/api/                axios client + one *.api.ts per domain. EVERY network call goes through here.
src/features/student/   auth · courses · player · paper · profile — each {components,hooks}
src/components/ui/      our primitive set (see §4)
src/components/shared/  composites built on ui/
src/lib/                secureStore · queryClient · i18n · theme
src/stores/             Zustand. Same shape as web/src/stores/authStore.ts
```

If a pattern is used by more than one feature it belongs in `components/shared/`, not copy-pasted.

## 2. Non-negotiables

- **Auth tokens go in `expo-secure-store`.** Never `AsyncStorage` (that is RN's `localStorage` —
  plaintext on disk), never Zustand `persist`, never a module global. `AsyncStorage` is used for
  exactly two things: TanStack Query cache persistence and the offline progress queue.
- **Never redefine a type or a Zod schema that exists in `@shared`.** The API contract lives in
  `shared/src/` and is consumed by both apps. A local copy silently drifts the first time a backend
  Resource changes.
- **No raw hex in components.** Colours and spacing come from `@shared/theme/tokens` via
  `tailwind.config.js`. One brand change, one file.
- **Radii are the one deliberate fork from the shared tokens**, and they live in
  `mobile/tailwind.config.js` (`mobileRadii`), not in `tokens.json`. The client asked for tighter
  corners on the phone, and the two clients genuinely want different values — the admin panel is
  dense tables and dialogs on a large screen, the student app is full-bleed cards on a 390px one.
  Do NOT "restore consistency" by pointing them back at `radii`; that silently undoes a design
  decision. Changing the admin panel's corners means editing `web/src/index.css` too.
- **The page ground is forked too: white on the phone.** `mobile/tailwind.config.js` points
  `background` at `colors.card` (#ffffff); the shared `background` token stays slate for the admin
  panel. White-on-white only works because every card, input and field draws a `border-border`
  hairline — give any new surface one.
- **`rounded-full` is never part of that scale.** Avatars, pills, the progress ring and the checkbox
  are circles by intent — rescaling radii must leave them alone.
- **The tab bar floats over the tab screens; it does not take space from them.** Every scrolling
  list or `ScrollView` in `app/(tabs)/` ends with `useTabBarClearance()` of bottom padding (from
  `@/components/shared/TabBar`), or its last row sits under the bar with no way to scroll it clear.
  A new tab screen, or a new list on an existing one, must do the same.
- **Every user-facing string goes through `t('key')`.** EN + SI live in `@shared/i18n`, key for key —
  a key missing from `si.json` falls back to English, so a new key is EN-only until it is translated.
  That includes `accessibilityLabel`s: a screen reader reads them aloud like any other copy.
  The chosen language is saved in SecureStore by `lib/i18n.ts` (`setLanguage`), restored by
  `initLanguage()` inside the root layout's startup gate, and picked on `app/language.tsx` — which the
  launch gate shows once, **before the intro**, because the intro greeting is itself translated. Dates
  follow the language automatically (`setDateLocale`); money stays Western digits in both.
- **Server state is TanStack Query. Client state is Zustand.** No `useEffect + fetch`.
- **Forms are React Hook Form + Zod**, schema imported from `@shared/schemas`.
- **Every failed mutation surfaces a toast** (`sonner-native`). Never fail silently.
- **`npx expo install <pkg>`, never `npm install <pkg>`** — Expo pins the SDK-compatible version.

## 3. The no-skip player

The full contract is server-side (`backend/CLAUDE.md` §5); the client's job is to make skipping
*feel* impossible, not to be the enforcement.

- **`nativeControls={false}` is mandatory.** `VideoView`'s native controls include a draggable
  scrubber, and no-skip is impossible with them on. Custom controls only (root §8 already requires this).
- `maxReached` is seeded from the server's `max_position_seconds`, **not from 0**.
- On `timeUpdate`: if `currentTime > maxReached + 1.5s` grace, set `player.currentTime = maxReached`
  and toast. **Rewind is unrestricted.**
- The progress bar renders the locked region with `pointerEvents: 'none'` so it cannot be dragged into
  at all. Clamping is the fallback, not the primary UX.
- Flush progress every 15s while playing, on pause, on `AppState` → background, and on unmount. The
  server's response re-seeds `maxReached`, so a tampered client snaps back.
- **Signed playback URLs expire after 30 minutes and lessons are longer than that** — a timer must
  re-fetch the stream URL 5 minutes before `expires_at`, `player.replaceAsync()`, and restore
  `currentTime`. Handle it reactively on a playback error too, for clock drift.
- **The lesson screen is the one screen in the app that rotates.** It is already full-bleed, so there
  is no separate fullscreen mode to enter — `useRotationUnlocked` (`src/lib/useRotationUnlocked.ts`)
  releases the portrait lock while the route is focused and restores it on the way out, and the video
  fills whatever shape it lands in. `expo-keep-awake` is active and the status bar hides with the
  controls. **`orientation` in `app.config.ts` must stay `'default'`** — set it back to `'portrait'`
  and the native app stops declaring landscape at all, which makes every `ScreenOrientation` call a
  silent no-op. Portrait everywhere else is a JS lock applied in `app/_layout.tsx`.

## 4. UI primitives

There is no shadcn for React Native, so `src/components/ui/` **is** our primitive set. Extend it;
never add an RN component kit (root §13.6). It mirrors `web/src/components/ui/` in name and variant
so patterns transfer between the two codebases.

- **Touch targets ≥ 44×44 are structural, not per-screen discipline.** `Button` and every touchable
  bake in `minHeight: 44`, `minWidth: 44`, and `hitSlop`.
- **Modals are bottom sheets** (root §8). There is no centred-dialog variant on mobile — only `Sheet`.
- **Never name a font family in a component — `Text` resolves it.** Poppins has NO Sinhala glyphs, so
  `Text` swaps to the matching Noto Sans Sinhala face when the language is `si` (`lib/useLanguage.ts`,
  `useFontFamily`). Hardcode `fonts.poppins[...]` and Sinhala falls back to whatever face the OS
  picks, at one weight — headings stop reading as headings. A raw `TextInput` must call
  `useFontFamily()` itself. The only exception is text whose script is fixed regardless of the app's
  language, such as the language names in the picker.
- **Never set `height` on anything containing text — use `minHeight` + `paddingVertical`.** Sinhala
  glyphs carry loops above and below the baseline and clip inside a fixed-height box. Keep
  `lineHeight` ≥ 1.6× the font size, and never set `allowFontScaling={false}`.
- Every icon-only touchable needs an `accessibilityLabel` and an `accessibilityRole` — it is invisible
  to a screen reader otherwise.
- The `--accent` gold (`#c79a3a`) is ~2.5:1 on white and **fails WCAG AA for text**. Fills, borders,
  and indicators only — never body text on a light surface.
- **Icons come from `@/components/icons`, never from `'lucide-react-native'` directly.** Metro does
  not tree-shake, so the package's root barrel drags all ~1,780 icon modules into the graph — it was
  44% of the bundle for the 44 icons we render, and it is why a cold start took minutes. That module
  deep-imports one file per icon; add a line to it when you need a new one.

## 5. Config and builds

- Config comes from `app.config.ts` → `Constants.expoConfig.extra`. Expo has no `import.meta.env`.
- **Nothing secret goes in `extra`** — it ships inside the bundle and is trivially extractable.
- Build profiles: `development` (dev client), `preview` (**APK**, internal testing / direct install),
  `production` (**AAB**, required by Google Play). iOS compiles on EAS macOS workers; no Mac needed.
- OTA (`expo-updates`) ships JS-only fixes. Anything touching a native module needs a store build,
  and **never OTA a change to the auth token format** — half the users would be on the old client.
- Google Sign-In needs a separate OAuth client per platform, and Android needs the **SHA-1 of every
  signing key** (EAS dev, EAS preview, and Play App Signing are three different fingerprints). This
  is the most common cause of a working-in-dev, broken-in-release sign-in.
- **`overrides` in `package.json` pins `expo-linking` and `expo-constants`, and removing them breaks
  the app.** Both are native modules on the startup path — `expo-router` resolves routes through
  `expo-linking` — so their JS must match the native code compiled into the installed dev client.
  Installing anything that depends on a *newer* patch of them makes npm silently upgrade the shared
  top-level copy and nest a second one, and the JS then no longer matches the binary. That is exactly
  what `npx expo install expo-auth-session` did: it wanted `expo-linking@~57.0.9`, npm bumped the
  shared `57.0.8` and nested an `expo-constants@57.0.17` beside the project's `57.0.16`. **The symptom
  was a 100%-loaded bundle and a white screen** — no red box, nothing in the logs, because the failure
  is in route resolution rather than in any of our own code. The `"$expo-linking"` / `"$expo-constants"`
  override syntax means "whatever this project declares", so it keeps itself correct as the SDK moves.
  **Adding a package that wants a newer patch of either is a dev-client rebuild, not an npm install.**
- **Adding a native module makes every installed dev client stale — rebuild it** (`npm run build:dev`,
  or `npx expo run:android`). `npm start` runs `--dev-client`, so the JS reloads but the binary does
  not, and a module the old binary lacks throws from `requireNativeModule(...)` at *module scope*.
  expo-router eagerly requires every file under `app/`, so such a throw lands during bundle evaluation,
  before React mounts and before any error boundary exists — another white screen with nothing to read.
  When a native module is optional (as `expo-crypto` is for Google Sign-In), defer and guard the
  require so the app still starts without it — `src/lib/googleAuth.ts` is the worked example.
