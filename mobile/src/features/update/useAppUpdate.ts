import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';

import type { StudentAppConfig } from '@shared/types/companySettings';
import { useAppConfig } from '@/features/intro/useAppConfig';

export type AppUpdateStatus = 'required' | 'available' | 'current';

export interface AppUpdate {
  status: AppUpdateStatus;
  storeUrl: string | null;
}

/**
 * The installed build's version — `version` in app.config.ts, the number shown
 * on the store listing. Read from the embedded config rather than the native
 * binary so no native module is needed; the two only diverge once OTA updates
 * exist, and this must then move to `expo-application`.
 */
export function installedVersion(): string | null {
  return Constants.expoConfig?.version ?? null;
}

/**
 * -1, 0 or 1 like a comparator, or null when either side is not a dotted number.
 * Missing parts count as 0, so "1.2" equals "1.2.0".
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 | null {
  const parse = (value: string) => {
    const parts = value.trim().split('.');

    return parts.every((part) => /^\d+$/.test(part)) ? parts.map(Number) : null;
  };

  const left = parse(a);
  const right = parse(b);

  if (!left || !right) return null;

  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);

    if (diff !== 0) return diff < 0 ? -1 : 1;
  }

  return 0;
}

/** True only when both versions parse and `installed` is strictly older. */
function isOlder(installed: string, target: string | null): boolean {
  return target !== null && compareVersions(installed, target) === -1;
}

export function resolveAppUpdate(config: StudentAppConfig | undefined): AppUpdate {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const target = config?.app_version?.[platform];
  const installed = installedVersion();
  const storeUrl = target?.store_url ?? null;

  /*
   * Every doubt resolves to "current". This is a nudge, not a control — no
   * endpoint refuses an old app — so a config that failed to load, a server
   * older than this build, or a typo in .env must never lock a student out.
   * No store URL means nowhere to send them, so no prompt either.
   */
  if (!target || !installed || !storeUrl) return { status: 'current', storeUrl };

  if (isOlder(installed, target.min_version)) return { status: 'required', storeUrl };
  if (isOlder(installed, target.latest_version)) return { status: 'available', storeUrl };

  return { status: 'current', storeUrl };
}

/** Where this build stands against the versions the server announced. */
export function useAppUpdate(): AppUpdate {
  return resolveAppUpdate(useAppConfig().data);
}

/**
 * The store listing. On Android the Play URL opens the Play Store app itself
 * rather than a browser tab, because Play registers for that host.
 */
export function openStoreListing(storeUrl: string): Promise<void> {
  return Linking.openURL(storeUrl);
}
