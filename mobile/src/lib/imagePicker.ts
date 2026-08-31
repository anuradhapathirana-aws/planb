import { requireOptionalNativeModule } from 'expo';
import type * as ImagePickerModule from 'expo-image-picker';

export type ImagePickerOptions = ImagePickerModule.ImagePickerOptions;

type Module = typeof ImagePickerModule;

/** The name `expo-image-picker` registers its native side under. */
const NATIVE_MODULE = 'ExponentImagePicker';

/*
 * `undefined` = not tried yet, `null` = tried and the native side isn't there.
 */
let cached: Module | null | undefined;

/**
 * `expo-image-picker`, but only if the installed binary actually contains it.
 *
 * In development the JS bundle is served over the network while the native code
 * is baked into the app that was installed weeks ago, so the two drift the
 * moment a native module is added. `expo-image-picker` resolves its native
 * counterpart at *import* time and throws "Cannot find native module
 * 'ExponentImagePicker'".
 *
 * A try/catch around the `require` cannot see that throw — see the long note in
 * `./webBrowser.ts` for why Metro swallows it and red-screens instead. Probing
 * the module registry is the only check that does not trigger the import.
 *
 * A store build can never be in this state, so this guard buys nothing in
 * production. It exists so a stale dev client degrades to "photo needs a new
 * build" and leaves the rest of the form usable, instead of crashing.
 */
export function getImagePicker(): Module | null {
  if (cached !== undefined) return cached;

  cached = requireOptionalNativeModule(NATIVE_MODULE)
    ? // Safe now: the native side answered, so the import cannot throw.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('expo-image-picker') as Module)
    : null;

  return cached;
}

export function isImagePickerAvailable(): boolean {
  return getImagePicker() !== null;
}
