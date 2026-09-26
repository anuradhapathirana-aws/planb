import { useTranslation } from 'react-i18next';
import { CheckCircle2, Clock, Loader, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ServicePurchaseStatus } from '@shared/types/service';

/*
 * The student's words, not the enum — nobody reads `in_progress` and thinks
 * "Plan B is working on it". Same keys and tones as the mobile app's badge.
 * Soft tints rather than solid fills: gold text is only legible on a light
 * surface as `accent-strong`.
 */
const PRESENTATION: Record<ServicePurchaseStatus, { key: string; className: string; icon: LucideIcon }> = {
  pending: { key: 'services.statusPending', className: 'bg-accent-soft text-accent-strong', icon: Clock },
  in_progress: { key: 'services.statusInProgress', className: 'bg-accent-soft text-accent-strong', icon: Loader },
  completed: { key: 'services.statusCompleted', className: 'bg-success/10 text-success', icon: CheckCircle2 },
  cancelled: { key: 'services.statusCancelled', className: 'bg-destructive/10 text-destructive', icon: XCircle },
};

export function ServiceStatusBadge({ status, className }: { status: ServicePurchaseStatus; className?: string }) {
  const { t } = useTranslation();
  const { key, className: tone, icon: Icon } = PRESENTATION[status];

  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap',
        tone,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {t(key)}
    </span>
  );
}
