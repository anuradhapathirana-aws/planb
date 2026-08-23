import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  isLoading?: boolean;
  accent?: 'primary' | 'accent' | 'success' | 'destructive';
}

const accentClasses: Record<NonNullable<StatCardProps['accent']>, string> = {
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-accent/15 text-accent-foreground',
  success: 'bg-success/10 text-success',
  destructive: 'bg-destructive/10 text-destructive',
};

export function StatCard({ icon: Icon, label, value, isLoading, accent = 'primary' }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-lg', accentClasses[accent])}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          {isLoading ? <Skeleton className="mt-1 h-7 w-16" /> : <p className="text-2xl font-semibold">{value}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
