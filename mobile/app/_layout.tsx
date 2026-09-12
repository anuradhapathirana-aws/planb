import '../global.css';

import { useEffect, useState } from 'react';
import { ScrollView, Text as RNText, View } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, router, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ScreenCapture from 'expo-screen-capture';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
/*
 * Per-weight subpaths, never the package root. Each family's root index
 * `require()`s every face it ships - 18 for Inter, 9 for Noto Sans Sinhala - and
 * Metro then bundles all of them into the APK. Importing only the six we load
 * keeps about 6 MB out of the student's download.
 */
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { NotoSansSinhala_400Regular } from '@expo-google-fonts/noto-sans-sinhala/400Regular';
import { NotoSansSinhala_600SemiBold } from '@expo-google-fonts/noto-sans-sinhala/600SemiBold';

import '@/lib/i18n';
import { registerUnauthenticatedHandler } from '@/api/client';
import { ToastProvider } from '@/components/ui/Toast';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';

void SplashScreen.preventAutoHideAsync();

// Earliest signal that our own code ran at all. Silence here means the crash
// was native and happened before the bundle executed. `warn`, not `log`:
// only warnings and errors are forwarded to the Metro terminal.
if (__DEV__) console.warn('[startup] root layout evaluated');

/**
 * Shown when the app is still on the splash long after it should have lifted.
 *
 * Names the gate that is still closed, because the two have completely
 * different causes: fonts stuck on "pending" means Metro is not serving assets
 * (wrong LAN address, firewall, dev server not running), while a session stuck
 * on "pending" means the SecureStore read never resolved.
 *
 * Bare `react-native` primitives and inline styles on purpose — it must not
 * depend on the fonts, NativeWind or i18n, since any of those may be the thing
 * that failed.
 */
function StartupStalled({ fonts, session }: { fonts: string; session: string }) {
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
 * NativeWind, no `Text` variant, no i18n, no fonts. Everything this component
 * touches is a thing that could itself be the failure, and an error screen that
 * can throw is worse than no error screen at all.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#14224b' }}
      contentContainerStyle={{ padding: 24, paddingTop: 72 }}
    >
      <RNText style={{ color: '#ffffff', fontSize: 20, fontWeight: '700', marginBottom: 8 }}>
        Something went wrong
      </RNText>
      <RNText style={{ color: '#c7d2e5', fontSize: 14, lineHeight: 20, marginBottom: 20 }}>
        The app hit an error it could not recover from. The details below are for the development
        team.
      </RNText>

      <View style={{ backgroundColor: '#0b1533', borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <RNText style={{ color: '#ff9b9b', fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
          {error.name}: {error.message}
        </RNText>
        {error.stack ? (
          <RNText style={{ color: '#8fa3c4', fontSize: 11, lineHeight: 16 }}>{error.stack}</RNText>
        ) : null}
      </View>

      <RNText
        onPress={retry}
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
        Try again
      </RNText>
    </ScrollView>
  );
}

export default function RootLayout() {
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    NotoSansSinhala_400Regular,
    NotoSansSinhala_600SemiBold,
  });

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
   * When a token can no longer be refreshed the API client clears it and calls
   * this. Routing lives here rather than in the client so that `src/api` has no
   * dependency on navigation.
   */
  useEffect(() => {
    registerUnauthenticatedHandler(() => {
      queryClient.clear();
      router.replace('/sign-in');
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

  const ready = (fontsLoaded || fontError !== null || fontWaitElapsed) && isInitialized;

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
