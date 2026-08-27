import { create } from 'zustand';

import type { StudentProfile } from '@shared/types/studentAuth';
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
  student: StudentProfile | null;
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
    try {
      const stored = await loadSession();

      if (stored) {
        setAccessToken(stored.token);
      }
    } catch {
      setAccessToken(null);
    }

    // The profile is fetched separately by a query, so a revoked token is
    // discovered by the API rejecting it rather than by trusting local state.
    set({ isInitialized: true });
  },

  signIn: async (token, expiresAt, student) => {
    await saveSession(token, expiresAt);
    setAccessToken(token);

    set({ student, isInitialized: true });
  },

  setStudent: (student) => set({ student }),

  signOut: async () => {
    set({ isSigningOut: true });

    // The local wipe happens whether or not the network call succeeded: a
    // student tapping "sign out" on a train with no signal must still end up
    // signed out on the device.
    await clearSession();
    setAccessToken(null);

    set({ student: null, isSigningOut: false });
  },
}));
