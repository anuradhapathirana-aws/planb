import { CheckCircle2, Clock, Hourglass, RotateCcw, XCircle } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import type { OrderStatus } from '@shared/types/order';
import { Badge } from '@/components/ui/Badge';

/**
 * One order status, worded the same everywhere it appears.
 *
 * The labels are the student's words, not the backend's enum: nobody outside
 * this codebase knows what `awaiting_verification` means, but everyone
 * understands "being checked".
 */
const PRESENTATION: Record<
  OrderStatus,
  { key: string; tone: 'neutral' | 'accent' | 'success' | 'danger'; icon: LucideIcon }
> = {
  pending: { key: 'payment.statusPending', tone: 'accent', icon: Clock },
  awaiting_verification: { key: 'payment.statusAwaitingVerification', tone: 'accent', icon: Hourglass },
  paid: { key: 'payment.statusPaid', tone: 'success', icon: CheckCircle2 },
  cancelled: { key: 'payment.statusCancelled', tone: 'neutral', icon: XCircle },
  failed: { key: 'payment.statusFailed', tone: 'danger', icon: XCircle },
  refunded: { key: 'payment.statusRefunded', tone: 'neutral', icon: RotateCcw },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useTranslation();
  const { key, tone, icon } = PRESENTATION[status];

  return <Badge label={t(key)} tone={tone} icon={icon} />;
}
