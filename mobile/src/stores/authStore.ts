import { Image } from 'expo-image';
import { create } from 'zustand';

import type { StudentProfile } from '@shared/types/studentAuth';
import { queryClient } from '@/lib/queryClient';
import { clearSession, loadSession, saveSession } from '@/lib/secureStore';
import { setAccessToken } from '@/api/client';

/**
 * Session state.
 *
 * Same shape as `web/src/stores/authStore.ts` so the two apps reason alike —
 * with one hard difference: **no `persist` middleware**. Zustand's persist
 * writes to AsyncStorage, which would put the bearer token in plaintext on
 * disk. The token lives only in SecureStore; this store holds it in memory for
 * the life of the process (root CLAUDE.md §13.12).
 */

interface AuthState {
  /**
   * Set only once the server has vouched for the session — by signing in, or
   * by the launch gate's `/me` call. A token restored from the Keystore does
   * not set it, so a revoked or suspended token never counts as signed in.
   */
  student: StudentProfile | null;
  /**
   * Whether a token is held at all. The launch gate asks the server about a
   * session only when there is one: a `/me` with no token is a guaranteed 401,
   * and that 401 runs the full sign-out — which wipes the query cache and the
   * image cache the launch intro and sign-in screen had just filled.
   */
  hasSession: boolean;
  /**
   * False until the first SecureStore read finishes. This is what stops the
   * app flashing the sign-in screen for a moment on every cold start before
   * discovering there is a valid token.
   */
  isInitialized: boolean;
  isSigningOut: boolean;

  bootstrap: () => Promise<void>;
  signIn: (token: string, expiresAt: string | null, student: StudentProfile) => Promise<void>;
  setStudent: (student: StudentProfile) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  student: null,
  hasSession: false,
  isInitialized: false,
  isSigningOut: false,

  /** Restores a token from SecureStore into memory. Called once, at launch. */
  bootstrap: async () => {
    /*
     * `isInitialized` gates the entire UI, so it must be set on every path.
     * A throw here — a Keystore entry the OS can no longer decrypt after a
     * restore or a security-patch change is the realistic one — would otherwise
     * leave the app rendering nothing at all, with no error and no way out.
     * Failing to a signed-out state is recoverable; a white screen is not.
     */
    let hasSession = false;

    try {
      const stored = await loadSession();

      if (stored) {
        setAccessToken(stored.token);
        hasSession = true;
      }
    } catch {
      setAccessToken(null);
    }

    // The profile is fetched separately by a query, so a revoked token is
    // discovered by the API rejecting it rather than by trusting local state.
    set({ hasSession, isInitialized: true });
  },

  signIn: async (token, expiresAt, student) => {
    /*
     * Wiped before the new token exists, not after. Every query key is
     * account-blind (`['auth', 'me']`, `['courses']`), so anything still cached
     * from a previous student would be served to this one as their own — and
     * the edit-profile form prefills from `['auth', 'me']`, so saving it would
     * write that other student's details into this account.
     */
    queryClient.clear();

    await saveSession(token, expiresAt);
    setAccessToken(token);

    set({ student, hasSession: true, isInitialized: true });
  },

  setStudent: (student) => set({ student }),

  signOut: async () => {
    set({ isSigningOut: true });

    // Dropped from memory first, so no new request goes out with it while the
    // Keystore delete is pending.
    setAccessToken(null);

    // The local wipe happens whether or not the network call succeeded: a
    // student tapping "sign out" on a train with no signal must still end up
    // signed out on the device.
    await clearSession();

    queryClient.clear();

    /*
     * Profile photos are signed URLs, so the next student can't request the
     * last one's — but expo-image keeps the decoded bitmap in memory and the
     * file on disk regardless. Memory is awaited because the next screen could
     * paint from it; the disk sweep can take a moment and must not hold up
     * sign-out. A failure here is not worth a stuck sign-out either.
     */
    await Image.clearMemoryCache().catch(() => false);
    void Image.clearDiskCache().catch(() => false);

    set({ student: null, hasSession: false, isSigningOut: false });
  },
}));
