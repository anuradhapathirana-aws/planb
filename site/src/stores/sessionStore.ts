import { create } from 'zustand';
import type { StudentProfile } from '@shared/types/studentAuth';

/**
 * Who is signed in, for the header and the portal's route guards.
 *
 * **There is no token in here and there must never be one.** The session is an
 * httpOnly Sanctum cookie that JavaScript cannot read; this store holds only the
 * student record the server sent back, so the UI knows whose name to draw.
 * Nothing here authorises anything — the API re-checks the cookie on every
 * request, and the route guards below it are UX only (root CLAUDE.md §7.12).
 *
 * Not `persist`ed, for the same reason: persisting it would put a student's name
 * and email in `localStorage`, readable by any script on the origin, and would
 * leave a signed-out visitor's browser claiming they are signed in until the
 * first 401 corrected it.
 */
interface SessionState {
  student: StudentProfile | null;
  /** False until `/student/me` has answered once, so guards can wait instead of bouncing. */
  isResolved: boolean;
  setStudent: (student: StudentProfile) => void;
  setResolved: () => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  student: null,
  isResolved: false,
  setStudent: (student) => set({ student, isResolved: true }),
  setResolved: () => set({ isResolved: true }),
  clear: () => set({ student: null, isResolved: true }),
}));
