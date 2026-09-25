import { useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ImageDropzone } from '@/components/shared/ImageDropzone';
import { TeamMemberFormDialog } from '@/features/admin/website/components/TeamMemberFormDialog';
import {
  useDeleteTeamMember,
  useDeleteTeamMemberPhoto,
  useReorderTeamMembers,
  useTeamMembers,
  useUploadTeamMemberPhoto,
} from '@/features/admin/website/hooks/useTeamMembers';
import type { TeamMember } from '@shared/types/siteContent';

/**
 * Website Configuration > The Team.
 *
 * A gallery of portrait cards in the shape the website draws them, not a
 * `DataTable`: what an admin is checking here is whether a photograph is
 * cropped well and whether the row of faces reads as a team. A 40px avatar in a
 * table cell answers neither.
 *
 * **Name and job title are edited in a dialog; the photograph is uploaded on
 * the card.** The wording is two short fields, which is exactly what a dialog is
 * for (CLAUDE.md §8) — and keeping the upload on the card means it goes up
 * immediately against a record that already exists, so the admin never has to
 * think about save order.
 */
export function TeamPage() {
  const { data: members, isLoading } = useTeamMembers();

  const reorder = useReorderTeamMembers();
  const remove = useDeleteTeamMember();
  const uploadPhoto = useUploadTeamMemberPhoto();
  const deletePhoto = useDeleteTeamMemberPhoto();

  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<TeamMember | null>(null);

  const list = members ?? [];
  const liveCount = list.filter((member) => member.is_live).length;

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= list.length) return;

    const ids = list.map((member) => member.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(target, 0, moved);

    reorder.mutate(ids);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">The team</h1>
          <p className="text-sm text-muted-foreground">
            The people on the “The Team” carousel on the Plan B website. Visitors scroll through them
            in this order.
          </p>
        </div>

        <Button size="sm" onClick={() => setIsAdding(true)}>
          <Plus className="size-4" />
          Add person
        </Button>
      </div>

      {/*
        The website's carousel shows five and a half cards on a laptop, so with
        fewer than six there is almost nothing to scroll and the half-card "there
        is more" affordance tells the visitor a lie. Worth saying once here rather
        than leaving the client to discover it on the live page.
      */}
      {liveCount > 0 && liveCount < 6 && (
        <div className="flex items-start gap-2 rounded-lg border border-dashed p-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            {liveCount} {liveCount === 1 ? 'person is' : 'people are'} showing on the website. The
            carousel fits five and a half cards across on a laptop, so it looks best with six or
            more.
          </p>
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No team members yet"
          description="The Team section is hidden on the website until you add someone here."
          action={
            <Button size="sm" onClick={() => setIsAdding(true)}>
              <Plus className="size-4" />
              Add person
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((member, index) => (
            <MemberCard
              key={member.id}
              member={member}
              position={index}
              total={list.length}
              busy={reorder.isPending}
              photoBusy={
                (uploadPhoto.isPending && uploadPhoto.variables?.id === member.id) ||
                (deletePhoto.isPending && deletePhoto.variables === member.id)
              }
              onMoveUp={() => move(index, -1)}
              onMoveDown={() => move(index, 1)}
              onEdit={() => setEditing(member)}
              onDelete={() => setConfirmDelete(member)}
              onPhotoSelect={(file) => uploadPhoto.mutate({ id: member.id, file })}
              onPhotoRemove={() => deletePhoto.mutate(member.id)}
            />
          ))}
        </div>
      )}

      <TeamMemberFormDialog
        open={isAdding || editing !== null}
        member={editing}
        onOpenChange={(open) => {
          if (open) return;
          setIsAdding(false);
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title={`Remove ${confirmDelete?.name ?? 'this person'}?`}
        description="They are removed from the website immediately, and their photograph is deleted from the server. This cannot be undone."
        confirmLabel="Remove person"
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

interface MemberCardProps {
  member: TeamMember;
  position: number;
  total: number;
  busy: boolean;
  photoBusy: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPhotoSelect: (file: File) => void;
  onPhotoRemove: () => void;
}

function MemberCard({
  member,
  position,
  total,
  busy,
  photoBusy,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
  onPhotoSelect,
  onPhotoRemove,
}: MemberCardProps) {
  /*
   * Switched on but with no photograph. The website drops them rather than
   * drawing a grey rectangle among faces, so this is the one thing an admin
   * most needs to see at a glance on this page.
   */
  const needsPhoto = member.is_visible && member.photo_url === null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex size-6 items-center justify-center rounded-md bg-secondary text-xs font-semibold">
          {position + 1}
        </span>
        <StatusBadge
          label={member.is_visible ? 'Showing' : 'Hidden'}
          variant={member.is_visible ? 'default' : 'secondary'}
        />
      </div>

      {/* 4:5 — the shape the website's card reserves and uploads are cropped to,
          anchored to the top so a head-and-shoulders photo keeps the head. */}
      <ImageDropzone
        label={`Photo of ${member.name}`}
        url={member.photo_url}
        aspect="portrait"
        busy={photoBusy}
        hint="Upload at 800×1000"
        maxBytes={5 * 1024 * 1024}
        onSelect={onPhotoSelect}
        onRemove={onPhotoRemove}
      />

      <div className="min-h-9">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <UserRound className="size-3.5 shrink-0 text-muted-foreground" />
          {member.name}
        </p>
        {member.role && <p className="line-clamp-1 text-xs text-muted-foreground">{member.role}</p>}
      </div>

      {needsPhoto && (
        <div className="flex items-start gap-1.5 rounded-md bg-destructive/5 p-2">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
          <p className="text-xs text-muted-foreground">
            Switched on but has no photo, so the website leaves them out.
          </p>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-1 pt-1">
        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Move ${member.name} earlier`}
            disabled={position === 0 || busy}
            onClick={onMoveUp}
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Move ${member.name} later`}
            disabled={position === total - 1 || busy}
            onClick={onMoveDown}
          >
            <ArrowDown className="size-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Edit ${member.name}`}
            onClick={onEdit}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Remove ${member.name}`}
            onClick={onDelete}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
}
