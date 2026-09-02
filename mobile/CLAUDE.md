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
- **`rounded-full` is never part of that scale.** Avatars, pills, the progress ring and the checkbox
  are circles by intent — rescaling radii must leave them alone.
- **Every user-facing string goes through `t('key')`.** EN + SI live in `@shared/i18n`.
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
- Fullscreen: `expo-screen-orientation` → landscape, status bar hidden, `expo-keep-awake` active.

## 4. UI primitives

There is no shadcn for React Native, so `src/components/ui/` **is** our primitive set. Extend it;
never add an RN component kit (root §13.6). It mirrors `web/src/components/ui/` in name and variant
so patterns transfer between the two codebases.

- **Touch targets ≥ 44×44 are structural, not per-screen discipline.** `Button` and every touchable
  bake in `minHeight: 44`, `minWidth: 44`, and `hitSlop`.
- **Modals are bottom sheets** (root §8). There is no centred-dialog variant on mobile — only `Sheet`.
- **Never set `height` on anything containing text — use `minHeight` + `paddingVertical`.** Sinhala
  glyphs carry loops above and below the baseline and clip inside a fixed-height box. Keep
  `lineHeight` ≥ 1.6× the font size, and never set `allowFontScaling={false}`.
- Every icon-only touchable needs an `accessibilityLabel` and an `accessibilityRole` — it is invisible
  to a screen reader otherwise.
- The `--accent` gold (`#c79a3a`) is ~2.5:1 on white and **fails WCAG AA for text**. Fills, borders,
  and indicators only — never body text on a light surface.

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
