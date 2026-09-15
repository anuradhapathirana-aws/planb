import { requireOptionalNativeModule } from 'expo';
import type * as DocumentPickerModule from 'expo-document-picker';

type Module = typeof DocumentPickerModule;

/** The name `expo-document-picker` registers its native side under. */
const NATIVE_MODULE = 'ExpoDocumentPicker';

/*
 * `undefined` = not tried yet, `null` = tried and the native side isn't there.
 */
let cached: Module | null | undefined;

/**
 * `expo-document-picker`, but only if the installed binary actually contains it.
 *
 * Same guard as `./imagePicker.ts`, for the same reason: a dev client built
 * before this module was added throws at import time, and Metro red-screens
 * rather than letting a try/catch see it. Probing the registry first lets that
 * client fall back to "PDF needs a new build" while photos keep working.
 */
export function getDocumentPicker(): Module | null {
  if (cached !== undefined) return cached;

  cached = requireOptionalNativeModule(NATIVE_MODULE)
    ? // Safe now: the native side answered, so the import cannot throw.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('expo-document-picker') as Module)
    : null;

  return cached;
}

export function isDocumentPickerAvailable(): boolean {
  return getDocumentPicker() !== null;
}
