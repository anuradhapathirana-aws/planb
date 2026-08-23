import axios from 'axios';
import { toast } from 'sonner';
import { API_BASE_URL, API_URL } from '@/lib/constants';
import { useAuthStore } from '@/stores/authStore';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
  },
});

/**
 * Sanctum's SPA auth requires a fresh CSRF cookie before any state-changing
 * request (login, and — since sessions can expire — periodically after).
 */
export async function ensureCsrfCookie(): Promise<void> {
  await axios.get(`${API_URL}/sanctum/csrf-cookie`, { withCredentials: true });
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (status === 401) {
        useAuthStore.getState().clear();
      } else if (status === 419) {
        toast.error('Your session expired. Please try again.');
      } else if (status && status >= 500) {
        toast.error('Something went wrong. Please try again.');
      }
    }

    return Promise.reject(error);
  },
);
