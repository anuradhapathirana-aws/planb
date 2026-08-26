import * as SecureStore from 'expo-secure-store';

/**
 * The student's Sanctum bearer token.
 *
 * This is the ONLY place the token is read or written. It lives in the iOS
 * Keychain / Android Keystore — never `AsyncStorage`, which is React Native's
 * `localStorage`: unencrypted JSON on disk that any process with filesystem
 * access on a rooted device can read (root CLAUDE.md §13.12).
 *
 * It is also never put in Zustand's `persist`, a module-level `let`, a log line,
 * or the clipboard.
 */

const TOKEN_KEY = 'planb.student.token';
const TOKEN_EXPIRY_KEY = 'planb.student.token_expires_at';

/**
 * `WHEN_UNLOCKED_THIS_DEVICE_ONLY` matters on iOS: without it the token syncs to
 * the user's iCloud Keychain and lands in encrypted device backups, which means
 * a credential for Plan B's API ends up in Apple's storage and on every other
 * device they own. `THIS_DEVICE_ONLY` keeps it on the handset it was issued to.
 */
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export interface StoredSession {
  token: string;
  expiresAt: string | null;
}

export async function saveSession(token: string, expiresAt: string | null): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token, OPTIONS);

  if (expiresAt) {
    await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, expiresAt, OPTIONS);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY, OPTIONS);
  }
}

/**
 * Returns null rather than throwing when the store is unavailable — an emulator
 * without a lock screen, or a device where the keystore is in a bad state. The
 * caller treats that as "signed out", which is the safe reading.
 */
export async function loadSession(): Promise<StoredSession | null> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY, OPTIONS);

    if (!token) return null;

    return {
      token,
      expiresAt: await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY, OPTIONS),
    };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  // Both keys are cleared even if one throws, so a partial wipe can't leave a
  // token behind with no expiry (which would then look valid forever).
  await Promise.allSettled([
    SecureStore.deleteItemAsync(TOKEN_KEY, OPTIONS),
    SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY, OPTIONS),
  ]);
}

/** True when the token is within `days` of expiring — the cue to rotate it. */
export function expiresWithin(expiresAt: string | null, days: number): boolean {
  if (!expiresAt) return false;

  const expiry = new Date(expiresAt).getTime();

  if (Number.isNaN(expiry)) return false;

  return expiry - Date.now() < days * 24 * 60 * 60 * 1000;
}
