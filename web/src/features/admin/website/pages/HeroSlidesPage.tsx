import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Image as ImageIcon,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SITE_HERO_ICON_GLYPHS } from '@/features/admin/website/heroIcons';
import {
  useDeleteSiteHeroSlide,
  useReorderSiteHeroSlides,
  useSiteHeroSlides,
} from '@/features/admin/website/hooks/useSiteHeroSlides';
import { SITE_LINK_TARGETS } from '@/features/admin/website/websiteSchema';
import { plainHeading } from '@/features/admin/website/highlight';
import { paths } from '@/routes/paths';
import type { SiteHeroSlide } from '@shared/types/siteContent';

/**
 * Website Configuration > Hero Slider.
 *
 * A gallery, not a `DataTable` — the same call `HomeBannersPage` makes, for the
 * same reason: what an admin is judging here is artwork and a headline sitting
 * on it, and a 40px thumbnail in a table cell answers neither question. The
 * compact-table rules in CLAUDE.md §8 are for dense text.
 *
 * Order is explicit up/down buttons rather than drag-and-drop, matching the rest
 * of the panel: drag is unusable by keyboard, fiddly on a trackpad, and needs a
 * library.
 */
export function HeroSlidesPage() {
  const navigate = useNavigate();

  const { data: slides, isLoading } = useSiteHeroSlides();
  const reorder = useReorderSiteHeroSlides();
  const remove = useDeleteSiteHeroSlide();

  const [confirmDelete, setConfirmDelete] = useState<SiteHeroSlide | null>(null);

  const list = slides ?? [];

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= list.length) return;

    const ids = list.map((slide) => slide.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(target, 0, moved);

    reorder.mutate(ids);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Hero slider</h1>
          <p className="text-sm text-muted-foreground">
            The rotating banner at the top of the Plan B website. Visitors see these in this order.
          </p>
        </div>

        <Button size="sm" onClick={() => navigate(paths.admin.heroSlideNew)}>
          <Plus className="size-4" />
          Add slide
        </Button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No slides yet"
          description="The website shows Plan B’s built-in slides until you add one here."
          action={
            <Button size="sm" onClick={() => navigate(paths.admin.heroSlideNew)}>
              <Plus className="size-4" />
              Add slide
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((slide, index) => (
            <SlideCard
              key={slide.id}
              slide={slide}
              position={index}
              total={list.length}
              busy={reorder.isPending}
              onMoveUp={() => move(index, -1)}
              onMoveDown={() => move(index, 1)}
              onEdit={() => navigate(paths.admin.heroSlideEdit(slide.id))}
              onDelete={() => setConfirmDelete(slide)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Delete this slide?"
        description="It is removed from the website immediately, along with its image. This cannot be undone."
        confirmLabel="Delete slide"
        variant="destructive"
        isLoading={remove.isPending}
        onConfirm={() => {
          if (confirmDelete) remove.mutate(confirmDelete.id);
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}

interface SlideCardProps {
  slide: SiteHeroSlide;
  position: number;
  total: number;
  busy: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function SlideCard({
  slide,
  position,
  total,
  busy,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
}: SlideCardProps) {
  const FallbackIcon = SITE_HERO_ICON_GLYPHS[slide.icon];
  const primaryLabel = SITE_LINK_TARGETS.find(
    (option) => option.value === slide.primary_cta_target,
  )?.label;

  /*
   * Switched on but visitors see nothing. Worth calling out on the card rather
   * than only in the form: the point of this page is spotting at a glance which
   * slides are actually live.
   */
  const liveButEmpty = slide.is_visible && !slide.is_live;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border">
      {/* 4:3 — the shape the website reserves and the shape uploads are cropped
          to. A preview in a different ratio would show a crop the visitor never
          gets. */}
      <div className="relative aspect-4/3 bg-secondary">
        {slide.image_url ? (
          <img
            src={slide.image_url}
            alt={plainHeading(slide.heading) || 'Hero slide'}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
            <FallbackIcon className="size-7" />
            <p className="px-3 text-center text-xs">No image — shows the designed panel</p>
          </div>
        )}

        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <span className="flex size-6 items-center justify-center rounded-md bg-background/90 text-xs font-semibold">
            {position + 1}
          </span>
          <StatusBadge
            label={slide.is_visible ? 'Showing' : 'Hidden'}
            variant={slide.is_visible ? 'default' : 'secondary'}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="min-h-9">
          {slide.eyebrow && (
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              {slide.eyebrow}
            </p>
          )}
          <p className="line-clamp-2 text-sm font-medium">
            {plainHeading(slide.heading) || <span className="text-muted-foreground">Untitled</span>}
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          First button: <span className="font-medium text-foreground">{primaryLabel ?? 'None'}</span>
          {slide.primary_cta_target === 'course' &&
            slide.primary_cta_course_name &&
            ` — ${slide.primary_cta_course_name}`}
        </p>

        {liveButEmpty && (
          <div className="flex items-start gap-1.5 rounded-md bg-destructive/5 p-2">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
            <p className="text-xs text-muted-foreground">
              Switched on but has no headline, so visitors never see it.
            </p>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-1 pt-1">
          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Move earlier in the slider"
              disabled={position === 0 || busy}
              onClick={onMoveUp}
            >
              <ArrowUp className="size-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Move later in the slider"
              disabled={position === total - 1 || busy}
              onClick={onMoveDown}
            >
              <ArrowDown className="size-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button size="icon-sm" variant="ghost" aria-label="Edit slide" onClick={onEdit}>
              <Pencil className="size-4" />
            </Button>
            <Button size="icon-sm" variant="ghost" aria-label="Delete slide" onClick={onDelete}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
