import '../global.css';

import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text as RNText, View } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useSegments, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ScreenCapture from 'expo-screen-capture';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
/*
 * Per-weight subpaths, never the package root. Each family's root index
 * `require()`s every face it ships - 18 for Poppins, 9 for Noto Sans Sinhala -
 * and Metro then bundles all of them into the APK. Importing only
 * the faces we load keeps megabytes out of the student's download.
 */
import { useFonts } from 'expo-font';
/*
 * Poppins, the app's typeface — the four weights `fonts.poppins` maps to. Inter
 * used to be loaded here too and was never actually applied to anything, so
 * every screen rendered in the system font; it is gone rather than kept as dead
 * weight in the bundle.
 */
import { Poppins_400Regular } from '@expo-google-fonts/poppins/400Regular';
import { Poppins_500Medium } from '@expo-google-fonts/poppins/500Medium';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';
import { Poppins_700Bold } from '@expo-google-fonts/poppins/700Bold';
/*
 * Noto Sans Sinhala, at the same four weights as Poppins. Poppins draws no
 * Sinhala at all, so in Sinhala `Text` swaps family maps — and a weight with no
 * Sinhala face loaded would fall back to the system font mid-screen.
 */
import { NotoSansSinhala_400Regular } from '@expo-google-fonts/noto-sans-sinhala/400Regular';
import { NotoSansSinhala_500Medium } from '@expo-google-fonts/noto-sans-sinhala/500Medium';
import { NotoSansSinhala_600SemiBold } from '@expo-google-fonts/noto-sans-sinhala/600SemiBold';
import { NotoSansSinhala_700Bold } from '@expo-google-fonts/noto-sans-sinhala/700Bold';

import i18n, { initLanguage } from '@/lib/i18n';
import { registerUnauthenticatedHandler } from '@/api/client';
import { ToastProvider } from '@/components/ui/Toast';
import { queryClient } from '@/lib/queryClient';
import { resetTo } from '@/lib/resetTo';
import { useAuthStore } from '@/stores/authStore';

void SplashScreen.preventAutoHideAsync();

// Earliest signal that our own code ran at all. Silence here means the crash
// was native and happened before the bundle executed. `warn`, not `log`:
// only warnings and errors are forwarded to the Metro terminal.
if (__DEV__) console.warn('[startup] root layout evaluated');

/**
 * A translated string for the two failure screens below, or the English
 * fallback if translation itself is broken.
 *
 * Those screens must render even when the thing that failed is i18n, so this
 * reads the i18next instance directly (no hook, no provider) and treats a
 * throw, an uninitialised instance or a key echoed back as "use the fallback".
 */
function safeT(key: string, fallback: string): string {
  try {
    const value = i18n.t(key);

    return typeof value === 'string' && value !== '' && value !== key ? value : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Shown when the app is still on the splash long after it should have lifted.
 *
 * In development it names the gate that is still closed, because the two have
 * completely different causes: fonts stuck on "pending" means Metro is not
 * serving assets (wrong LAN address, firewall, dev server not running), while a
 * session stuck on "pending" means the SecureStore read never resolved.
 *
 * A release build shows none of that. "Metro" and "SecureStore" mean nothing to
 * a student and describe the app's internals to anyone curious; all a student
 * can usefully do is restart the app.
 *
 * Bare `react-native` primitives and inline styles on purpose — it must not
 * depend on the fonts or NativeWind, since either may be the thing that failed.
 */
function StartupStalled({ fonts, session }: { fonts: string; session: string }) {
  if (!__DEV__) {
    return (
      <View style={{ flex: 1, backgroundColor: '#14224b', justifyContent: 'center', padding: 32 }}>
        <RNText style={{ color: '#ffffff', fontSize: 18, fontWeight: '700', marginBottom: 10 }}>
          {safeT('appError.stalledTitle', 'Taking longer than usual')}
        </RNText>
        <RNText style={{ color: '#c7d2e5', fontSize: 14, lineHeight: 22 }}>
          {safeT(
            'appError.stalledBody',
            'The app is taking longer than usual to start. Please close it and open it again.',
          )}
        </RNText>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#14224b', justifyContent: 'center', padding: 32 }}>
      <RNText style={{ color: '#ffffff', fontSize: 18, fontWeight: '700', marginBottom: 10 }}>
        Still starting up
      </RNText>
      <RNText style={{ color: '#c7d2e5', fontSize: 14, lineHeight: 20, marginBottom: 20 }}>
        The app has been waiting longer than expected. This is what it is waiting for:
      </RNText>

      <View style={{ backgroundColor: '#0b1533', borderRadius: 12, padding: 16 }}>
        <RNText style={{ color: '#8fa3c4', fontSize: 13, lineHeight: 20 }}>
          Fonts: <RNText style={{ color: '#ffffff' }}>{fonts}</RNText>
        </RNText>
        <RNText style={{ color: '#8fa3c4', fontSize: 13, lineHeight: 20 }}>
          Session: <RNText style={{ color: '#ffffff' }}>{session}</RNText>
        </RNText>
      </View>
    </View>
  );
}

/**
 * What the student sees when a screen throws, instead of nothing.
 *
 * expo-router renders this in place of the tree when any descendant throws
 * during render. Without it a render error in a route leaves a plain white
 * screen — the error goes to the Metro terminal, which nobody is looking at on
 * a phone, and the app looks broken rather than broken *for a reason*.
 *
 * Deliberately built from bare `react-native` primitives with inline styles: no
 * NativeWind, no `Text` variant, no fonts, and i18n only through `safeT`.
 * Everything this component touches is a thing that could itself be the
 * failure, and an error screen that can throw is worse than no error screen.
 *
 * **The error itself is shown in development only.** A message or stack in a
 * release build hands a student file paths, API shapes and library names they
 * cannot act on, and tells anyone probing the app exactly what broke. Release
 * builds get a plain apology and Try again; the real error is for crash
 * reporting (Sentry, P3-11), never the screen.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#14224b' }}
      contentContainerStyle={
        __DEV__ ? { padding: 24, paddingTop: 72 } : { flexGrow: 1, justifyContent: 'center', padding: 32 }
      }
    >
      <RNText style={{ color: '#ffffff', fontSize: 20, fontWeight: '700', marginBottom: 8 }}>
        {safeT('appError.title', 'Something went wrong')}
      </RNText>

      {__DEV__ ? (
        <>
          <RNText style={{ color: '#c7d2e5', fontSize: 14, lineHeight: 20, marginBottom: 20 }}>
            The app hit an error it could not recover from. The details below are for the
            development team.
          </RNText>

          <View
            style={{ backgroundColor: '#0b1533', borderRadius: 12, padding: 16, marginBottom: 20 }}
          >
            <RNText style={{ color: '#ff9b9b', fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
              {error.name}: {error.message}
            </RNText>
            {error.stack ? (
              <RNText style={{ color: '#8fa3c4', fontSize: 11, lineHeight: 16 }}>
                {error.stack}
              </RNText>
            ) : null}
          </View>
        </>
      ) : (
        <RNText style={{ color: '#c7d2e5', fontSize: 14, lineHeight: 22, marginBottom: 24 }}>
          {safeT(
            'appError.body',
            'Sorry, the app ran into a problem. Please try again. If it keeps happening, close the app and open it again.',
          )}
        </RNText>
      )}

      <RNText
        onPress={retry}
        accessibilityRole="button"
        style={{
          color: '#14224b',
          backgroundColor: '#ffffff',
          borderRadius: 10,
          fontSize: 15,
          fontWeight: '600',
          overflow: 'hidden',
          paddingHorizontal: 20,
          paddingVertical: 14,
          textAlign: 'center',
        }}
      >
        {safeT('common.retry', 'Try again')}
      </RNText>
    </ScrollView>
  );
}

export default function RootLayout() {
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    NotoSansSinhala_400Regular,
    NotoSansSinhala_500Medium,
    NotoSansSinhala_600SemiBold,
    NotoSansSinhala_700Bold,
  });

  /*
   * The saved language, restored before the first screen renders — applying it
   * later would flash English at a Sinhala student on every cold start. It is a
   * SecureStore read like the session's, so it is gated the same way rather
   * than being allowed to hold the splash on its own.
   */
  const [languageLoaded, setLanguageLoaded] = useState(false);

  useEffect(() => {
    void initLanguage().finally(() => setLanguageLoaded(true));
  }, []);

  /*
   * Course videos are the product, so screenshots and screen recording are
   * blocked by DEFAULT — every screen, unless one opts out. This is not
   * absolute — a second phone pointed at the screen always works — but it stops
   * casual mass-sharing of paid content. On Android it blocks outright; on iOS
   * the OS only permits detection plus blanking, which expo-screen-capture
   * handles.
   *
   * **Home opts out** (`app/(tabs)/index.tsx`), at the client's request: it
   * releases this same default key while it is the screen on show and re-applies
   * it on blur. Anything that lifts the block belongs there, on the screen that
   * wants it — leaving this call as the default means a screen added later is
   * protected without having to remember to ask.
   */
  useEffect(() => {
    void ScreenCapture.preventScreenCaptureAsync();

    return () => {
      void ScreenCapture.allowScreenCaptureAsync();
    };
  }, []);

  /*
   * Portrait is the app's policy, not its manifest. `orientation` in
   * app.config.ts is 'default' so the lesson player can turn (a native app
   * cannot rotate into an orientation it never declared); everything else is
   * held portrait from here, and `useRotationUnlocked` releases it for the one
   * screen that wants it.
   */
  useEffect(() => {
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);

  /* Restore the token from the Keychain/Keystore before the first render. */
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  /*
   * When a token can no longer be refreshed the API client drops it and calls
   * this, which signs the student out properly. Routing lives here rather than in the client so that `src/api` has no
   * dependency on navigation.
   */
  const segments = useSegments();
  // Widened: typed routes omit the empty tuple, but `app/index.tsx` has no segments.
  const segmentsRef = useRef<string[]>(segments);
  segmentsRef.current = segments;

  useEffect(() => {
    registerUnauthenticatedHandler(() => {
      /*
       * A burst of parallel requests all 401 together; the first one's sign-out
       * covers the rest. Also true when the student tapped "sign out" and the
       * screen doing that is already on its way to sign-in.
       */
      const { isSigningOut, signOut } = useAuthStore.getState();

      if (isSigningOut) return;

      /*
       * The launch gate (`app/index.tsx`, no segments) sends a signed-out
       * student to sign-in itself once the intro has played. Redirecting from
       * here would cut the intro off for exactly those students. Read now, not
       * after the await: by then the gate may already have moved on.
       */
      const onLaunchGate = segmentsRef.current.length === 0;

      void (async () => {
        // The whole sign-out, not a copy of its steps: a partial one left the
        // previous student's profile in the store.
        await signOut();

        if (!onLaunchGate) resetTo('/sign-in');
      })();
    });

    return () => registerUnauthenticatedHandler(null);
  }, []);

  /*
   * A font load must not gate the app — and the wait is capped, not merely
   * error-handled.
   *
   * `useFonts` leaves `fontsLoaded` false forever when a face fails to fetch,
   * which happens on any cold start where Metro isn't serving assets. Checking
   * `fontError` covers the case where the fetch *reports* a failure. It does not
   * cover the more common one: when the device cannot reach Metro at all — a
   * firewall with no rule for port 8081, a stale LAN address, a phone on another
   * network — the six requests simply hang. `fontsLoaded` stays false, and
   * `fontError` stays null, for as long as the app is open. `ready` never flips,
   * this component returns `null` indefinitely, and the result is an unexplained
   * white screen: precisely the failure the `fontError` check was added to
   * prevent, arriving by the one route it does not cover.
   *
   * So: five seconds, then render in the system font. Inter and Noto Sans
   * Sinhala are worth waiting for; they are not worth never starting for.
   */
  const [fontWaitElapsed, setFontWaitElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFontWaitElapsed(true), 5_000);

    return () => clearTimeout(timer);
  }, []);

  /*
   * `fontWaitElapsed` covers the language read too: a keystore that never
   * answers must not hold the app on the splash forever. Falling through means
   * starting in the device language, which is the same default a first-time
   * student gets.
   */
  const ready =
    (fontsLoaded || fontError !== null || fontWaitElapsed) &&
    (languageLoaded || fontWaitElapsed) &&
    isInitialized;

  const fontsGate = fontsLoaded
    ? 'loaded'
    : fontError
      ? 'failed (using system font)'
      : fontWaitElapsed
        ? 'timed out — Metro is not serving assets (using system font)'
        : 'pending';
  const sessionGate = isInitialized ? 'restored' : 'pending';

  /*
   * A splash that never lifts is the hardest failure in this app to diagnose:
   * the screen is blank and nothing reaches the logs. Expo Go cannot apply the
   * splash plugin either, so there it is plain white with nothing to suggest
   * the app even started. Name whichever gate is still closed.
   *
   * The report goes **on screen**, not only to the Metro terminal. A white
   * screen is usually discovered on a phone, by someone who has no terminal in
   * front of them and no way to tell "still loading" from "hung forever" — and
   * a diagnostic nobody reads is not a diagnostic.
   */
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    if (ready) {
      setStalled(false);
      return;
    }

    const timer = setTimeout(() => {
      setStalled(true);
      /*
       * The native splash is held until `hideAsync`, and it sits ON TOP of
       * whatever React renders. Without lifting it here, `StartupStalled` is
       * drawn underneath and nobody on a real build ever sees it.
       */
      void SplashScreen.hideAsync();

      if (__DEV__) {
        console.warn(
          `[startup] Still on the splash after 8s — fonts: ${fontsGate}, ` +
            `session: ${sessionGate}.`,
        );
      }
    }, 8_000);

    return () => clearTimeout(timer);
  }, [ready, fontsGate, sessionGate]);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  /*
   * Holding the splash screen avoids a flash of unstyled, unauthenticated UI —
   * but only for as long as the wait is plausibly normal. Past eight seconds
   * something is wrong, and saying so beats an indefinite blank screen.
   */
  if (!ready) return stalled ? <StartupStalled fonts={fontsGate} session={sessionGate} /> : null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            {/*
              Dark glyphs, because nearly every screen is `bg-background` — a
              light cream — behind the clock. This used to be `light`, which is
              right on the navy sign-in screen and nowhere else: it painted the
              system time, battery and signal white on cream everywhere else,
              where they simply vanished. The few screens that really do put
              navy under the status bar call `useStatusBarStyle('light')`.
            */}
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="language" />
              <Stack.Screen name="sign-in" />
              <Stack.Screen name="verify" />
              <Stack.Screen name="(tabs)" />
            </Stack>
          </ToastProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
