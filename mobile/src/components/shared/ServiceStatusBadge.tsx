import { CheckCircle2, Clock, Loader, XCircle } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import type { ServicePurchaseStatus } from '@shared/types/service';
import { Badge } from '@/components/ui/Badge';

/**
 * One delivery status, worded the same everywhere it appears.
 *
 * The labels are the student's words, not the backend's enum — nobody outside
 * this codebase reads `in_progress` and thinks "Plan B is working on it".
 * Mirrors `OrderStatusBadge` next door.
 */
const PRESENTATION: Record<
  ServicePurchaseStatus,
  { key: string; tone: 'neutral' | 'accent' | 'success' | 'danger'; icon: LucideIcon }
> = {
  pending: { key: 'services.statusPending', tone: 'accent', icon: Clock },
  in_progress: { key: 'services.statusInProgress', tone: 'accent', icon: Loader },
  completed: { key: 'services.statusCompleted', tone: 'success', icon: CheckCircle2 },
  cancelled: { key: 'services.statusCancelled', tone: 'danger', icon: XCircle },
};

export function ServiceStatusBadge({
  status,
  className,
}: {
  status: ServicePurchaseStatus;
  className?: string;
}) {
  const { t } = useTranslation();
  const { key, tone, icon } = PRESENTATION[status];

  return <Badge label={t(key)} tone={tone} icon={icon} className={className} />;
}

/**
 * The same wording, for a screen-reader label on a card the badge sits inside.
 *
 * Exported from here rather than rebuilt at each call site: a card announcing
 * "in progress" while the badge next to it reads "In progress" is two sources
 * for one string, and they drift the first time the copy changes.
 */
export function useServiceStatusLabel(): (status: ServicePurchaseStatus) => string {
  const { t } = useTranslation();

  return (status) => t(PRESENTATION[status].key);
}
