import { create } from 'zustand';
import type { AdminUser } from '@/types/auth';

interface AuthState {
  user: AdminUser | null;
  isInitialized: boolean;
  setUser: (user: AdminUser) => void;
  setInitialized: () => void;
  clear: () => void;
  hasRole: (...roles: AdminUser['roles']) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isInitialized: false,
  setUser: (user) => set({ user, isInitialized: true }),
  setInitialized: () => set({ isInitialized: true }),
  clear: () => set({ user: null, isInitialized: true }),
  hasRole: (...roles) => {
    const user = get().user;
    if (!user) return false;
    return roles.some((role) => user.roles.includes(role));
  },
}));
