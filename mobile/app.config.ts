import type { ExpoConfig } from 'expo/config';

/*
 * Why this is a .ts file and not app.json: the config has to read process.env at
 * evaluation time so dev, preview and production can be built from one source
 * with different API hosts and different security postures.
 */

type Variant = 'development' | 'preview' | 'production';

const variant = (process.env.APP_VARIANT as Variant | undefined) ?? 'development';
const isProduction = variant === 'production';

/*
 * Distinct bundle ids per variant so dev, staging and production install side by
 * side on one phone. Worth the five minutes the first time you need to compare
 * a bug against the live build.
 */
const idSuffix = isProduction ? '' : `.${variant}`;

/*
 * The app's own identifiers, hoisted because they are also URL schemes below.
 * Android strips the dot (a package segment may not start with one); iOS keeps
 * it.
 */
const androidPackage = `lk.planbinternational.academy${idSuffix.replace(/\./g, '')}`;
const iosBundleId = `lk.planbinternational.academy${idSuffix}`;

/*
 * Read at runtime through expo-constants. NOTHING SECRET GOES HERE — `extra`
 * ships inside the app bundle and is trivially extractable with a zip tool
 * (mobile/CLAUDE.md §5). The API base URL is not a secret; an API key would be.
 */
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8001/api/v1';

/*
 * Google Sign-In OAuth clients — one per platform, all under the same Google
 * Cloud project, which is what lets the API accept any of them as an audience.
 *
 * These are public by design: an OAuth *client id* identifies the app, it does
 * not authorise anything, and Google publishes it in the authorisation URL
 * regardless. There is no client secret here and there must never be one — a
 * mobile app cannot keep it (mobile/CLAUDE.md §5), which is exactly why the
 * flow below is PKCE and why the ID token is verified on our own server.
 *
 * Android additionally matches on the signing certificate's SHA-1, and EAS dev,
 * EAS preview and Play App Signing are three different fingerprints. Every one
 * of them needs registering, or sign-in works in development and fails in
 * release (mobile/CLAUDE.md §5).
 */
const googleClientIds = {
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
};

const config: ExpoConfig = {
  name: isProduction ? 'Plan B Academy' : `Plan B (${variant})`,
  slug: 'planb-academy',
  /*
   * `planb` is the app's own deep-link scheme (payment returns, notifications).
   *
   * The other two are Google Sign-In's, and are not optional. expo-auth-session
   * builds its redirect as `<applicationId>:/oauthredirect`, and Google's
   * Android OAuth client only accepts a custom scheme matching the package name
   * (or the reverse client id) — `planb://` would be rejected as a redirect_uri
   * mismatch. If the scheme is not declared here, Google redirects at the end of
   * sign-in to a URL no activity handles, and the student is left in a browser
   * tab that never returns to the app.
   *
   * Both platforms' ids are listed so a single build config serves either.
   */
  scheme: ['planb', androidPackage, iosBundleId],
  version: '1.0.0',
  /*
   * 'default', not 'portrait' — and the app is still portrait everywhere but the
   * player. A native app can only rotate into orientations its manifest/plist
   * declares, so pinning portrait here makes `ScreenOrientation` a no-op at
   * runtime and the lesson video can never go landscape. The declaration is
   * widened here and the lock is applied in JS instead: `app/_layout.tsx` locks
   * portrait on startup and `useRotationUnlocked` releases it for the one screen
   * that wants it (`expo-screen-orientation`'s `initialOrientation` below covers
   * the moment before the bundle runs).
   */
  orientation: 'default',
  icon: './assets/icon.png',
  // Light-only for v1. The brand is a light navy-on-cream identity, and dark
  // mode doubles the design and QA surface for no student-facing requirement.
  userInterfaceStyle: 'light',

  /*
   * No `newArchEnabled` flag: React Native 0.86 ships only the New Architecture
   * (Fabric + TurboModules), so the option was removed from the config type.
   * The splash screen is configured through its plugin below rather than a
   * top-level `splash` key.
   */

  ios: {
    bundleIdentifier: iosBundleId,
    supportsTablet: true,
    infoPlist: {
      /*
       * App Transport Security. Cleartext HTTP is allowed ONLY in the dev
       * variant, so a developer can reach the Laragon server over the LAN.
       * Production refuses any non-HTTPS request outright.
       */
      NSAppTransportSecurity: isProduction
        ? { NSAllowsArbitraryLoads: false }
        : { NSAllowsLocalNetworking: true, NSAllowsArbitraryLoads: true },
    },
  },

  android: {
    package: androidPackage,
    adaptiveIcon: {
      backgroundColor: '#14224b',
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    /*
     * No `usesCleartextTraffic` key here, and none is needed: Android has
     * defaulted it to false since API 28, so a release build already refuses
     * plaintext. Development works because the dev client permits cleartext
     * for the dev server. A standalone preview APK that must reach an HTTP LAN
     * backend would need `usesCleartextTraffic` set through the
     * `expo-build-properties` plugin below - non-production variants only.
     *
     * `src/lib/env.ts` also refuses to start a production build configured with
     * a non-HTTPS API URL, so this is belt and braces.
     */
    predictiveBackGestureEnabled: false,
  },

  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-video',
    'expo-localization',
    'expo-font',
    /*
     * Card checkout opens the gateway's own hosted page in a Custom Tab
     * (Android) / SFSafariViewController (iOS). That is what keeps card details
     * out of this app entirely — see the PaymentGateway contract.
     */
    'expo-web-browser',
    /*
     * `initialOrientation` is what the app launches in, before any JS has run.
     * Without it a phone held sideways would open the splash and the sign-in
     * screen in landscape, since the plist now permits it.
     */
    [
      'expo-screen-orientation',
      {
        initialOrientation: 'PORTRAIT',
      },
    ],
    /*
     * Declared so the permission prompts carry Plan B's own wording. Apple
     * rejects a build whose usage strings are the library defaults, and Android
     * needs CAMERA declared in the manifest for "take a photo" to work at all.
     */
    [
      'expo-image-picker',
      {
        photosPermission:
          'Plan B uses your photos so you can set a profile picture and attach a bank transfer slip.',
        cameraPermission:
          'Plan B uses your camera so you can take a profile picture or photograph a bank transfer slip.',
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#14224b',
      },
    ],
    /*
     * Release-only size work. R8 strips unreachable classes and the resource
     * shrinker drops drawables and strings nothing references; together they
     * take roughly a fifth off the download. Debug builds are untouched, so
     * development is not slowed down by it.
     *
     * R8 works from reachability, and anything reached only by reflection can
     * look unused to it. React Native and Expo ship their own keep rules, but
     * a release build still has to be smoke-tested rather than assumed - a
     * class stripped in error fails at runtime, not at build time.
     */
    [
      'expo-build-properties',
      {
        android: {
          enableProguardInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          /*
           * Plaintext HTTP, for non-production builds only.
           *
           * Android has defaulted `usesCleartextTraffic` to false since API 28,
           * so a standalone APK silently refuses every request to the Laragon
           * backend over `http://<lan-ip>:8001`. A dev client gets an exception
           * for the dev server but not for arbitrary hosts, so the API calls
           * fail there too. Production stays false and is additionally held to
           * HTTPS by `src/lib/env.ts`, which refuses to start otherwise.
           */
          usesCleartextTraffic: !isProduction,
        },
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
  },

  // The EAS account that owns builds and updates for this app.
  owner: 'luminusn',

  extra: {
    apiBaseUrl,
    variant,
    googleClientIds,

    /*
     * Links this project to EAS. Written by hand because `eas init` cannot
     * modify a dynamic (app.config.ts) config — it only edits app.json.
     * Not a secret: it identifies the project, it does not authorise anything.
     */
    eas: {
      projectId: '56873e09-fd56-469c-9d8c-47245da0eb79',
    },
  },
};

export default config;
