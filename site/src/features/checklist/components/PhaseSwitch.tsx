import { useState, type CSSProperties } from 'react';

import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { ChecklistPhase } from '@shared/types/checklist';

/**
 * The bubble's two edges travel at different speeds: the leading edge reaches
 * the new tab first and the trailing edge catches up, so the pill stretches out
 * like a drop of liquid and pulls back together — no overshoot, no bounce.
 * Same timings as the mobile app's `PhaseSwitch`.
 */
const LEAD_MS = 170;
const TRAIL_MS = 260;
/** easeOutCubic — the app's `Easing.out(Easing.cubic)`. */
const EASE = 'cubic-bezier(0.33, 1, 0.68, 1)';

interface PhaseSwitchProps {
  value: ChecklistPhase;
  options: { value: ChecklistPhase; label: string }[];
  label: string;
}

/**
 * The checklist phase tabs, drawn as the mobile app's switch: a navy track with
 * a white bubble that flows to the chosen tab.
 *
 * Still Radix `TabsList`/`TabsTrigger` underneath, so arrow keys, focus and the
 * tab roles come for free; must sit inside the page's `<Tabs>`. The bubble is
 * one absolutely placed element whose `left` and `right` are animated with
 * different durations — which edge leads depends on the direction of travel.
 * `motion-reduce` drops the animation, so the bubble simply jumps.
 */
export function PhaseSwitch({ value, options, label }: PhaseSwitchProps) {
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  // Direction of the last move, adjusted during render when `value` changes.
  const [previous, setPrevious] = useState(index);
  const [forward, setForward] = useState(true);
  if (previous !== index) {
    setForward(index > previous);
    setPrevious(index);
  }

  const count = options.length;
  const leftMs = forward ? TRAIL_MS : LEAD_MS;
  const rightMs = forward ? LEAD_MS : TRAIL_MS;

  const bubble: CSSProperties = {
    left: `${(index / count) * 100}%`,
    right: `${((count - 1 - index) / count) * 100}%`,
    transition: `left ${leftMs}ms ${EASE}, right ${rightMs}ms ${EASE}`,
  };

  return (
    <TabsList
      aria-label={label}
      className="relative flex w-full rounded-full bg-primary p-[3px] text-primary-foreground sm:w-auto sm:min-w-md"
    >
      {/* Inset by the track's padding, so percentages divide the inner width evenly. */}
      <span className="pointer-events-none absolute inset-[3px]" aria-hidden="true">
        <span style={bubble} className="absolute inset-y-0 rounded-full bg-card shadow-sm motion-reduce:transition-none!" />
      </span>

      {options.map((option) => (
        <TabsTrigger
          key={option.value}
          value={option.value}
          className={cn(
            // Above the bubble; the active colour lands as the bubble arrives.
            'relative z-10 h-10 min-w-0 rounded-full px-2 text-[13px] leading-tight font-semibold whitespace-normal',
            'text-primary-foreground/70 transition-colors delay-75 duration-200',
            'data-[state=inactive]:hover:text-primary-foreground',
            'data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none',
            'focus-visible:ring-accent sm:px-4 sm:text-sm sm:whitespace-nowrap',
          )}
        >
          {option.label}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
