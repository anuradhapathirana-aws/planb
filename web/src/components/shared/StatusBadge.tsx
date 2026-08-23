import { Badge, badgeVariants } from '@/components/ui/badge';
import type { VariantProps } from 'class-variance-authority';

interface StatusBadgeProps {
  label: string;
  variant?: VariantProps<typeof badgeVariants>['variant'];
}

export function StatusBadge({ label, variant = 'secondary' }: StatusBadgeProps) {
  return <Badge variant={variant}>{label}</Badge>;
}
