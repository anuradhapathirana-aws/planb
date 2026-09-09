import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';

/**
 * Lets the screen follow the phone while this route is focused, then pins the
 * app back to portrait when the student leaves it.
 *
 * The app is portrait everywhere except the lesson player: a course card grid,
 * a checklist and a profile form all read worse in landscape, and none of them
 * were designed for it. A video is the one thing on a phone that genuinely
 * wants the long edge, so it is the one screen that unlocks.
 *
 * **Why a JS lock rather than `orientation: 'portrait'` in app.config.ts.** That
 * key writes the plist mask (iOS) and the activity's `screenOrientation`
 * (Android), and neither can be widened at runtime — with it set, every call
 * here silently does nothing and the video never turns. So the *declaration* is
 * 'default' and the *policy* lives here, applied on startup in
 * `app/_layout.tsx` and released for one screen.
 *
 * `DEFAULT` rather than `ALL`: it follows the sensor into portrait and both
 * landscapes but not upside-down, which is what a phone video player should do.
 * The system rotation lock still wins over all of this — a student who has
 * turned auto-rotate off in their settings stays in portrait, exactly as they
 * asked their phone to.
 *
 * Focus, not mount: the player route stays mounted underneath a pushed screen,
 * and rotating there would turn a portrait-only screen sideways.
 */
export function useRotationUnlocked(): void {
  useFocusEffect(
    useCallback(() => {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);

      return () => {
        void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      };
    }, []),
  );
}
