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
 * Read at runtime through expo-constants. NOTHING SECRET GOES HERE — `extra`
 * ships inside the app bundle and is trivially extractable with a zip tool
 * (mobile/CLAUDE.md §5). The API base URL is not a secret; an API key would be.
 */
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8001/api/v1';

const config: ExpoConfig = {
  name: isProduction ? 'Plan B Academy' : `Plan B (${variant})`,
  slug: 'planb-academy',
  scheme: 'planb',
  version: '1.0.0',
  orientation: 'portrait',
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
    bundleIdentifier: `lk.planbinternational.academy${idSuffix}`,
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
    package: `lk.planbinternational.academy${idSuffix.replace(/\./g, '')}`,
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
