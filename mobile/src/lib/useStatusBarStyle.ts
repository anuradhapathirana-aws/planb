import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle, type StatusBarStyle } from 'expo-status-bar';

/**
 * What `app/_layout.tsx` renders, and what a screen hands back when it loses
 * focus. Almost every screen in the app is `bg-background`, so dark glyphs is
 * the honest default — the exceptions are the handful with a navy panel behind
 * the clock.
 */
const DEFAULT_STYLE: StatusBarStyle = 'dark';

/**
 * Sets the status bar style for as long as this screen is focused.
 *
 * Use this on any screen whose top strip is dark (`bg-surface`, a navy header
 * that bleeds under the clock) and would otherwise render the system time,
 * battery and signal in the app-wide dark colour, on navy.
 *
 * **Why a focus effect and not `<StatusBar style="light" />` on the screen.**
 * React Native's `StatusBar` component keeps a stack of every mounted instance
 * and the last one mounted wins. That works for a screen that unmounts when you
 * leave it, but a tab screen stays mounted for the life of the app once
 * visited — so a `<StatusBar>` inside the Profile tab would keep forcing white
 * glyphs after the student switched back to Home. Focus is the thing that
 * actually tracks "which screen is the student looking at".
 *
 * The root layout still renders `<StatusBar style="dark" />` as the baseline,
 * which is deliberately the same value this hook restores on blur: the two can
 * never disagree, whichever of them applies last.
 */
export function useStatusBarStyle(style: StatusBarStyle): void {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(style);

      return () => setStatusBarStyle(DEFAULT_STYLE);
    }, [style]),
  );
}
