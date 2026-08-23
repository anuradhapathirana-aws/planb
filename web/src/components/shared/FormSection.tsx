import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Grouped, bordered block used to organize a multi-field admin form into
 * scannable sections — e.g. "Photo", "Basic information", "Contact details".
 * See CLAUDE.md §8 "Sectioned Admin Forms" (established on the Student form).
 */
export function FormSection({
  icon: Icon,
  title,
  columns = 2,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  /** Fields per row on >=sm. Use 3 only for short/narrow fields. Always 1 on mobile. */
  columns?: 2 | 3;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Icon className="size-3.5" />
        </span>
        <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{title}</span>
      </div>
      <div className={cn('grid grid-cols-1 gap-x-3 gap-y-2.5', columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
        {children}
      </div>
    </div>
  );
}
