import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The one horizontal rhythm for the whole site.
 *
 * `px-4` is the 16px side gutter a phone needs; `max-w-7xl` stops content
 * stretching edge to edge on an ultra-wide monitor (UI_UX_GUIDELINES.md §3).
 * Set here rather than per section, so a new section cannot quietly use a
 * different gutter and knock the page out of alignment.
 */
export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>;
}
