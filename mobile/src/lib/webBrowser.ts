import { Linking } from 'react-native';
import { isRunningInExpoGo, requireOptionalNativeModule } from 'expo';
import type * as WebBrowserModule from 'expo-web-browser';

type Module = typeof WebBrowserModule;

/** The name `expo-web-browser` registers its native side under. */
const NATIVE_MODULE = 'ExpoWebBrowser';

/*
 * `undefined` = not tried yet, `null` = tried and the native side isn't there.
 */
let cached: Module | null | undefined;

/**
 * `expo-web-browser`, but only if the installed binary actually contains it.
 *
 * Same problem and same guard as `getImagePicker` in `./imagePicker.ts`: in
 * development the JS bundle is served over the network while the native code is
 * baked into the app that was installed weeks ago, so the two drift the moment a
 * native module is added. `expo-web-browser` resolves its native counterpart at
 * *import* time and throws "Cannot find native module 'ExpoWebBrowser'".
 *
 * Wrapping the `require` in try/catch does not help, and this is the trap: in
 * dev, Metro's own `guardedLoadModule` catches a module's init error first,
 * hands it to `ErrorUtils.reportFatalError` — the full-screen red "Uncaught
 * Error" — and then returns `undefined` rather than rethrowing. So our `catch`
 * never runs, the screen is already dead, and `cached` is left `undefined`,
 * which reads back as "available". Asking the module registry instead is the
 * only way to find out without triggering the import.
 *
 * A store build can never be in this state, so this buys nothing in production.
 * It exists so a stale dev client says "card payment needs a new build" and
 * leaves bank transfer — which needs no native module the app doesn't already
 * have — working.
 */
export function getWebBrowser(): Module | null {
  if (cached !== undefined) return cached;

  cached = requireOptionalNativeModule(NATIVE_MODULE)
    ? // Safe now: the native side answered, so the import cannot throw. A static
      // import would be evaluated on screen load, which is what we are avoiding.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('expo-web-browser') as Module)
    : null;

  /*
   * Says which of the two possible causes it is, because the fix differs: Expo
   * Go means the module isn't in that SDK's client at all, a development build
   * means the installed binary predates the package and needs rebuilding.
   */
  if (__DEV__ && cached === null) {
    const runtime = isRunningInExpoGo() ? 'Expo Go' : 'a development build';
    console.warn(`[webBrowser] Native module '${NATIVE_MODULE}' is missing in ${runtime}.`);
  }

  return cached;
}

export function isWebBrowserAvailable(): boolean {
  return getWebBrowser() !== null;
}

/**
 * Opens a link the student tapped inside the app — a Home banner pointing at a
 * Plan B page, say. NOT the payment hand-off: that one needs
 * `openAuthSessionAsync` and its own redirect handling, and lives in the
 * checkout flow.
 *
 * Falls back to the OS browser when the native module is missing, rather than
 * doing nothing. Unlike card checkout there is nothing here that depends on
 * staying inside the app, so bouncing out is a worse experience but a working
 * one — and the alternative is a tap that silently does nothing.
 */
export async function openExternalUrl(url: string): Promise<void> {
  const browser = getWebBrowser();

  try {
    if (browser) {
      await browser.openBrowserAsync(url);

      return;
    }

    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
  } catch {
    // A dead link is not worth interrupting the student over — they tapped a
    // banner, not a button they were waiting on.
  }
}
