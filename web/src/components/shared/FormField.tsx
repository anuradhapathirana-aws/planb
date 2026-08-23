import type { ComponentType, ReactNode } from 'react';
import { Label } from '@/components/ui/label';

/**
 * Field label with a small leading icon and an optional red required-marker.
 * Pair with `FieldError` below the input. See CLAUDE.md §8 "Sectioned Admin Forms".
 */
export function FieldLabel({
  htmlFor,
  icon: Icon,
  required,
  children,
}: {
  htmlFor?: string;
  icon: ComponentType<{ className?: string }>;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <Label htmlFor={htmlFor} className="text-xs">
      <Icon className="size-3.5 text-muted-foreground" />
      {children}
      {required && (
        <span className="text-destructive" aria-hidden="true">
          *
        </span>
      )}
    </Label>
  );
}

/** Error text shown under a field once react-hook-form has a message for it. */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}
