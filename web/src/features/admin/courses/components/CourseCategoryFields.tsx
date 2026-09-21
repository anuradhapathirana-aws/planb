import { FolderOpen, FolderTree } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FieldError, FieldLabel } from '@/components/shared/FormField';
import { useCategoryCascade } from '@/features/admin/courseCategories/hooks/useCategoryCascade';
import type { CourseCategory } from '@shared/types/course';

interface CourseCategoryFieldsProps {
  tree: CourseCategory[];
  value: number | null;
  onChange: (value: number | null) => void;
  onBlur?: () => void;
  loading?: boolean;
  disabled?: boolean;
  error?: string;
}

// Radix Select reserves '' for its placeholder, so "no sub-category" needs a sentinel.
const DIRECT = '__direct';

/**
 * Radix mirrors a Select inside a <form> into a hidden native <select>. When the
 * edit form loads, the value arrives in the same render as the sub-category
 * options, before the native <select> has them — and it echoes back '' as a
 * "change". Taken at face value that stored category 0 and blanked both
 * dropdowns, so an empty value is never a real choice here.
 */
function isRealChoice(next: string): boolean {
  return next !== '';
}

/**
 * The Course form's Main category + Sub-category pair. Renders two grid cells, so
 * it drops straight into a `FormSection`. The sub-category is optional — a course
 * may sit directly on a main category.
 */
export function CourseCategoryFields({
  tree,
  value,
  onChange,
  onBlur,
  loading,
  disabled,
  error,
}: CourseCategoryFieldsProps) {
  const { parentId, subId, children, selectParent, selectSub } = useCategoryCascade(tree, value, onChange);
  const parentName = tree.find((parent) => parent.id === parentId)?.name;

  return (
    <>
      <div className="space-y-1">
        <FieldLabel htmlFor="course-category" icon={FolderTree} required>
          Main category
        </FieldLabel>
        <Select
          // Empty string, never undefined: Radix reads undefined as uncontrolled, and
          // a select that switches to controlled once the course loads keeps showing
          // the placeholder.
          value={parentId ? String(parentId) : ''}
          onValueChange={(next) => isRealChoice(next) && selectParent(Number(next))}
          onOpenChange={(open) => !open && onBlur?.()}
          disabled={loading || disabled}
        >
          <SelectTrigger id="course-category" size="default" className="w-full" aria-invalid={!!error}>
            <SelectValue placeholder={loading ? 'Loading…' : 'Select a category'} />
          </SelectTrigger>
          <SelectContent>
            {tree.map((parent) => (
              <SelectItem key={parent.id} value={String(parent.id)}>
                {parent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError message={error} />
        {!loading && tree.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No active categories yet — add one under Courses ▸ Categories first.
          </p>
        )}
      </div>

      <div className="space-y-1">
        <FieldLabel htmlFor="course-sub-category" icon={FolderOpen}>
          Sub-category
        </FieldLabel>
        <Select
          value={subId ? String(subId) : DIRECT}
          onValueChange={(next) => isRealChoice(next) && selectSub(next === DIRECT ? null : Number(next))}
          disabled={loading || disabled || parentId === null || children.length === 0}
        >
          <SelectTrigger id="course-sub-category" size="default" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DIRECT}>
              {parentId === null
                ? 'Pick a main category first'
                : children.length === 0
                  ? 'No sub-categories'
                  : `None — directly in ${parentName}`}
            </SelectItem>
            {children.length > 0 && <SelectSeparator />}
            {children.map((child) => (
              <SelectItem key={child.id} value={String(child.id)}>
                {child.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
