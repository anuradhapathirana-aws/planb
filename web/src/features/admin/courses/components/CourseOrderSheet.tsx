import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ListOrdered, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { ImagePlaceholder } from '@/components/shared/ImageDropzone';
import { useCategoryCourseOrder, useSaveCourseOrder } from '@/features/admin/courses/hooks/useCourses';
import { useCategoryCascade } from '@/features/admin/courseCategories/hooks/useCategoryCascade';
import type { CourseCategory, CourseProgramme } from '@shared/types/course';

interface CourseOrderSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Every category, inactive ones too — the list page's own tree. */
  categoryTree: CourseCategory[];
  /** The category the list is filtered by, to open on. */
  initialCategoryId: number | null;
}

/**
 * Arranges one category's courses into the order students should take them —
 * "Course 1, Course 2…" on the app.
 *
 * One category at a time, and only the courses sitting directly in it: a
 * sub-category is its own path and numbers from 1, so a main category's list
 * never mixes in its sub-categories' courses. The whole list is saved at once;
 * position in it is the order, so there is no number to type.
 *
 * A panel from the right rather than a mode on the table: the table is
 * paginated and shows a main category's whole branch, neither of which fits
 * arranging one category's full list.
 */
export function CourseOrderSheet({ open, onOpenChange, categoryTree, initialCategoryId }: CourseOrderSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-lg">
        {/* Remounted per opening, so it starts on the list's current filter with no stale edits. */}
        {open && (
          <CourseOrderEditor
            categoryTree={categoryTree}
            initialCategoryId={initialCategoryId}
            onDone={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function CourseOrderEditor({
  categoryTree,
  initialCategoryId,
  onDone,
}: {
  categoryTree: CourseCategory[];
  initialCategoryId: number | null;
  onDone: () => void;
}) {
  const [categoryId, setCategoryId] = useState<number | null>(initialCategoryId);
  // The admin's unsaved arrangement; null means "as saved".
  const [draft, setDraft] = useState<number[] | null>(null);

  const cascade = useCategoryCascade(categoryTree, categoryId, (value) => {
    setCategoryId(value);
    setDraft(null);
  });

  const { data, isLoading } = useCategoryCourseOrder(categoryId);
  const save = useSaveCourseOrder();

  const rows = useMemo<CourseProgramme[]>(() => {
    const saved = data ?? [];
    if (draft === null) return saved;

    const byId = new Map(saved.map((programme) => [programme.id, programme]));
    return draft.flatMap((id) => byId.get(id) ?? []);
  }, [data, draft]);

  const selected = categoryTree
    .flatMap((category) => [category, ...(category.children ?? [])])
    .find((category) => category.id === categoryId);
  const hasChildren = cascade.subId === null && cascade.children.length > 0;

  const move = (index: number, offset: -1 | 1) => {
    const ids = rows.map((programme) => programme.id);
    const target = index + offset;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setDraft(ids);
  };

  const submit = () => {
    if (categoryId === null || draft === null) return;

    save.mutate({ categoryId, programmeIds: draft }, { onSuccess: onDone });
  };

  return (
    <>
      <SheetHeader className="border-b">
        <SheetTitle className="flex items-center gap-2 text-base">
          <ListOrdered className="size-4 text-muted-foreground" aria-hidden="true" /> Course order
        </SheetTitle>
        <SheetDescription>
          Set the order students should take a category&apos;s courses in. The app shows it as Course 1, Course 2…
        </SheetDescription>
      </SheetHeader>

      <div className="grid gap-3 border-b p-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Category</Label>
          <Select
            value={cascade.parentId ? String(cascade.parentId) : ''}
            onValueChange={(v) => v !== '' && cascade.selectParent(Number(v))}
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categoryTree.map((category) => (
                <SelectItem key={category.id} value={String(category.id)}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Sub-category</Label>
          <Select
            value={cascade.subId ? String(cascade.subId) : 'none'}
            onValueChange={(v) => v !== '' && cascade.selectSub(v === 'none' ? null : Number(v))}
            disabled={cascade.children.length === 0}
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue placeholder="No sub-category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None — the main category&apos;s own courses</SelectItem>
              {cascade.children.map((child) => (
                <SelectItem key={child.id} value={String(child.id)}>
                  {child.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {categoryId === null && (
          <p className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
            Pick a category to arrange its courses.
          </p>
        )}

        {categoryId !== null && isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        )}

        {categoryId !== null && !isLoading && (
          <>
            {hasChildren && (
              <p className="text-xs text-muted-foreground">
                Only courses placed directly in {selected?.name}. Each sub-category has its own order, starting
                from Course 1 — pick one above to arrange it.
              </p>
            )}

            {rows.length === 0 ? (
              <p className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                No courses in this category yet.
              </p>
            ) : (
              <ol className="divide-y rounded-lg border">
                {rows.map((programme, index) => (
                  <li key={programme.id} className="flex items-center gap-2.5 px-3 py-2">
                    <Badge className="w-[4.5rem] shrink-0 justify-center tabular-nums">Course {index + 1}</Badge>
                    {programme.thumbnail_url ? (
                      <img
                        src={programme.thumbnail_url}
                        alt=""
                        className="h-8 w-14 shrink-0 rounded object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <ImagePlaceholder className="h-8 w-14 shrink-0" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium" title={programme.name}>
                      {programme.name}
                    </span>
                    {programme.status !== 'published' && <Badge variant="secondary">Draft</Badge>}
                    <div className="flex shrink-0">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Move ${programme.name} up`}
                        disabled={index === 0 || save.isPending}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Move ${programme.name} down`}
                        disabled={index === rows.length - 1 || save.isPending}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            {rows.some((programme) => programme.status !== 'published') && (
              <p className="text-xs text-muted-foreground">
                Drafts keep their place here. Students only see published courses, numbered without gaps.
              </p>
            )}
          </>
        )}
      </div>

      <SheetFooter className="flex-row justify-end border-t">
        <Button size="sm" variant="outline" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button size="sm" onClick={submit} disabled={draft === null || save.isPending}>
          {save.isPending && <Loader2 className="size-3.5 animate-spin" />}
          Save order
        </Button>
      </SheetFooter>
    </>
  );
}
