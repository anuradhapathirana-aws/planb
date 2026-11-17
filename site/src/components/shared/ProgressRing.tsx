import { cn } from '@/lib/utils';

interface ProgressRingProps {
  percent: number;
  /** Diameter in px. */
  size?: number;
  strokeWidth?: number;
  /** Gold by default — progress is the app's signature gold; `primary` for chrome. */
  tone?: 'accent' | 'primary';
  /** Draw the percentage inside the ring. */
  showValue?: boolean;
  /** Spoken name, e.g. the course it measures. */
  label?: string;
  className?: string;
}

/**
 * A circular progress meter — the web twin of the app's `ProgressRing`, same
 * defaults, so a course's ring looks the same in both. The number is sized
 * from the ring (24% of its diameter), so one component serves every size.
 */
export function ProgressRing({
  percent,
  size = 72,
  strokeWidth = 7,
  tone = 'accent',
  showValue = true,
  label,
  className,
}: ProgressRingProps) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <span
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-label={label}
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-border" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
          className={cn('transition-[stroke-dashoffset] duration-500', tone === 'primary' ? 'stroke-primary' : 'stroke-accent')}
        />
      </svg>

      {showValue ? (
        <span aria-hidden="true" className="relative font-bold text-primary" style={{ fontSize: size * 0.24, lineHeight: 1 }}>
          {value}%
        </span>
      ) : null}
    </span>
  );
}
