import '../global.css';

import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ScreenCapture from 'expo-screen-capture';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import {
  NotoSansSinhala_400Regular,
  NotoSansSinhala_600SemiBold,
} from '@expo-google-fonts/noto-sans-sinhala';

import '@/lib/i18n';
import { registerUnauthenticatedHandler } from '@/api/client';
import { ToastProvider } from '@/components/ui/Toast';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';

void SplashScreen.preventAutoHideAsync();

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
   * blocked app-wide. This is not absolute — a second phone pointed at the
   * screen always works — but it stops casual mass-sharing of paid content.
   * On Android it blocks outright; on iOS the OS only permits detection plus
   * blanking, which expo-screen-capture handles.
   */
  useEffect(() => {
    void ScreenCapture.preventScreenCaptureAsync();

    return () => {
      void ScreenCapture.allowScreenCaptureAsync();
    };
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
   * A failed font load must not gate the app.
   *
   * `useFonts` leaves `fontsLoaded` false forever when a face fails to fetch —
   * which happens on every cold start in development if Metro isn't serving the
   * assets. Ignoring the error meant the app rendered `null` indefinitely: a
   * white screen, no message, nothing in the logs to point at. Inter and Noto
   * Sans Sinhala are worth waiting for, not worth blocking on; the system font
   * is a fine fallback for the seconds before a reload.
   */
  const ready = (fontsLoaded || fontError !== null) && isInitialized;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // Holding the splash screen avoids a flash of unstyled, unauthenticated UI.
  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <StatusBar style="light" />
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
