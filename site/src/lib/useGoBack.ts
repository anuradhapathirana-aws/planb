import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * A back arrow's action: the previous page, as the app's back arrow does — or
 * `fallback` when this page was opened directly (a shared link, a refresh in a
 * new tab), where "back" would leave the site. The router marks a first entry
 * with the location key 'default'.
 */
export function useGoBack(fallback: string): () => void {
  const navigate = useNavigate();
  const { key } = useLocation();

  return useCallback(() => {
    if (key === 'default') navigate(fallback);
    else navigate(-1);
  }, [key, navigate, fallback]);
}
