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
import {
  useDeleteHomeBanner,
  useHomeBanners,
  useReorderHomeBanners,
} from '@/features/admin/homeBanner/hooks/useHomeBanner';
import { HOME_BANNER_LINKS } from '@/features/admin/homeBanner/homeBannerSchema';
import { paths } from '@/routes/paths';
import type { HomeBanner } from '@shared/types/homeBanner';

/**
 * Mobile configuration > Home banners.
 *
 * A gallery, not a `DataTable`: the thing an admin is judging here is artwork,
 * and a 40px thumbnail in a table cell answers none of the questions they
 * actually have. The compact-table rules in CLAUDE.md §8 exist to keep dense
 * text scannable; this list is four or five image cards.
 *
 * Order is explicit up/down buttons rather than drag-and-drop — the same choice
 * the Course form's repeatable rows make, and for the same reasons: drag is
 * unusable by keyboard, fiddly on a laptop trackpad, and needs a library.
 */
export function HomeBannersPage() {
  const navigate = useNavigate();

  const { data: banners, isLoading } = useHomeBanners();
  const reorder = useReorderHomeBanners();
  const remove = useDeleteHomeBanner();

  const [confirmDelete, setConfirmDelete] = useState<HomeBanner | null>(null);

  const list = banners ?? [];

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= list.length) return;

    const ids = list.map((banner) => banner.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(target, 0, moved);

    reorder.mutate(ids);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Home banners</h1>
          <p className="text-sm text-muted-foreground">
            The carousel across the top of the student app’s Home screen. Students swipe through
            them in this order.
          </p>
        </div>

        <Button size="sm" onClick={() => navigate(paths.admin.homeBannerNew)}>
          <Plus className="size-4" />
          Add banner
        </Button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No banners yet"
          description="Students see Plan B’s built-in slides until you add one here."
          action={
            <Button size="sm" onClick={() => navigate(paths.admin.homeBannerNew)}>
              <Plus className="size-4" />
              Add banner
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((banner, index) => (
            <BannerCard
              key={banner.id}
              banner={banner}
              position={index}
              total={list.length}
              busy={reorder.isPending}
              onMoveUp={() => move(index, -1)}
              onMoveDown={() => move(index, 1)}
              onEdit={() => navigate(paths.admin.homeBannerEdit(banner.id))}
              onDelete={() => setConfirmDelete(banner)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Delete this banner?"
        description="It is removed from the carousel immediately, along with its image. This cannot be undone."
        confirmLabel="Delete banner"
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

interface BannerCardProps {
  banner: HomeBanner;
  position: number;
  total: number;
  busy: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function BannerCard({
  banner,
  position,
  total,
  busy,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
}: BannerCardProps) {
  const linkLabel = HOME_BANNER_LINKS.find((option) => option.value === banner.link_type)?.label;

  /*
   * Switched on but students see nothing. Worth calling out on the card rather
   * than only in the form: the whole point of this page is spotting at a glance
   * which slides are actually live.
   */
  const liveButEmpty = banner.is_active && !banner.is_live;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border">
      {/* The app renders slides at 16:9, so the card previews them that way —
          an admin judging a crop needs the shape the student will see. */}
      <div className="relative aspect-video bg-secondary">
        {banner.image_url ? (
          <img
            src={banner.image_url}
            alt={banner.title ?? 'Home banner'}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
            <ImageIcon className="size-6" />
            <p className="text-xs">No image — shows as a plain Plan B slide</p>
          </div>
        )}

        <div className="absolute left-2 top-2 flex items-center gap-1.5">
          <span className="flex size-6 items-center justify-center rounded-md bg-background/90 text-xs font-semibold">
            {position + 1}
          </span>
          <StatusBadge
            label={banner.is_active ? 'Showing' : 'Hidden'}
            variant={banner.is_active ? 'default' : 'secondary'}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="min-h-9">
          <p className="text-sm font-medium">{banner.title || <span className="text-muted-foreground">Untitled</span>}</p>
          {banner.subtitle && (
            <p className="line-clamp-1 text-xs text-muted-foreground">{banner.subtitle}</p>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Opens: <span className="font-medium text-foreground">{linkLabel ?? 'Nothing'}</span>
          {banner.link_type === 'course' && banner.link_course_name && ` — ${banner.link_course_name}`}
        </p>

        {liveButEmpty && (
          <div className="flex items-start gap-1.5 rounded-md bg-destructive/5 p-2">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
            <p className="text-xs text-muted-foreground">
              Switched on but empty, so students never see it. Add an image or a headline.
            </p>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-1 pt-1">
          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Move earlier in the carousel"
              disabled={position === 0 || busy}
              onClick={onMoveUp}
            >
              <ArrowUp className="size-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Move later in the carousel"
              disabled={position === total - 1 || busy}
              onClick={onMoveDown}
            >
              <ArrowDown className="size-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button size="icon-sm" variant="ghost" aria-label="Edit banner" onClick={onEdit}>
              <Pencil className="size-4" />
            </Button>
            <Button size="icon-sm" variant="ghost" aria-label="Delete banner" onClick={onDelete}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
