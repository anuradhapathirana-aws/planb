import { router, type Href } from 'expo-router';

/**
 * Navigates to `href` and leaves nothing behind it in the root stack.
 *
 * For crossing the signed-in/signed-out line, where a plain `replace` swaps only
 * the top screen. After signing in, sign-in would still sit under the tabs and
 * Android's back button would return a signed-in student to it; after signing
 * out, the previous student's screens would sit under sign-in.
 */
export function resetTo(href: Href): void {
  if (router.canDismiss()) router.dismissAll();

  router.replace(href);
}
