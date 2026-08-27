import type * as ImagePickerModule from 'expo-image-picker';

export type ImagePickerOptions = ImagePickerModule.ImagePickerOptions;

type Module = typeof ImagePickerModule;

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
 * 'ExponentImagePicker'" — which, from a static import, takes the entire screen
 * down before it renders.
 *
 * A store build can never be in that state, so this guard buys nothing in
 * production. It exists so a stale dev client degrades to "photo needs a new
 * build" and leaves the rest of the form usable, instead of crashing.
 */
export function getImagePicker(): Module | null {
  if (cached !== undefined) return cached;

  try {
    // A static import would be hoisted and evaluated on screen load, which is
    // precisely what this function exists to avoid.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-image-picker') as Module;
  } catch {
    cached = null;
  }

  return cached;
}

export function isImagePickerAvailable(): boolean {
  return getImagePicker() !== null;
}
