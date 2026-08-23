import { MoreHorizontal, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface RowAction {
  /** Shown in the tooltip, the overflow menu, and as the button's aria-label. */
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
  /** Convenience so callers can build the array without filtering it themselves. */
  hidden?: boolean;
}

interface RowActionsProps {
  actions: RowAction[];
  /** Actions beyond this count collapse into an overflow menu. */
  maxInline?: number;
  className?: string;
}

/**
 * Standard trailing cell for admin data tables: each action is its own icon button with a
 * tooltip label, so the common ones are one click away instead of hidden behind a menu.
 * Rare extras still collapse into an overflow menu to keep the column width predictable.
 */
export function RowActions({ actions, maxInline = 3, className }: RowActionsProps) {
  const visible = actions.filter((action) => !action.hidden);
  if (visible.length === 0) return null;

  const inline = visible.length > maxInline ? visible.slice(0, maxInline) : visible;
  const overflow = visible.length > maxInline ? visible.slice(maxInline) : [];

  return (
    // Row actions must never trigger the row's own click handler (e.g. navigate to detail).
    <div
      className={cn('flex items-center justify-end gap-0.5', className)}
      onClick={(e) => e.stopPropagation()}
    >
      {inline.map((action) => {
        const Icon = action.icon;
        return (
          <Tooltip key={action.label}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={action.label}
                disabled={action.disabled}
                onClick={action.onClick}
                className={cn(
                  action.variant === 'destructive' &&
                    'text-destructive hover:bg-destructive/10 hover:text-destructive',
                )}
              >
                <Icon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{action.label}</TooltipContent>
          </Tooltip>
        );
      })}

      {overflow.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="More actions">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {overflow.map((action) => {
              const Icon = action.icon;
              return (
                <DropdownMenuItem
                  key={action.label}
                  variant={action.variant}
                  disabled={action.disabled}
                  onClick={action.onClick}
                >
                  <Icon /> {action.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
