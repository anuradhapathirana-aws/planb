import { useOutletContext } from 'react-router-dom';

/** What `PublicLayout` hands its pages through `<Outlet context>`. */
export interface PublicLayoutContext {
  /**
   * Opens the one sign-in dialog. `returnTo` is where to go afterwards — a
   * course page passes its own path so an "Enrol" click returns there rather
   * than to the portal. It is validated with `safeReturnPath` before use.
   */
  openSignIn: (returnTo?: string) => void;
}

/** For pages inside `PublicLayout` only. */
export function useSignInDialog(): PublicLayoutContext {
  return useOutletContext<PublicLayoutContext>();
}
