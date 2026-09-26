import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { BadgeCheck, Camera, Loader2, Trash2 } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { deleteProfilePhoto, uploadProfilePhoto } from '@/api/profile.api';
import { useSetProfile } from '@/features/profile/queries';
import { cn } from '@/lib/utils';
import { formatDate, initials } from '@shared/lib/formatters';
import { getValidationErrors } from '@shared/lib/serverErrors';
import type { StudentProfile } from '@shared/types/studentAuth';

/** Mirrors `UploadProfilePhotoRequest`: `mimes:jpeg,jpg,png`, `max:2048` (KB). */
const PHOTO_TYPES = ['image/jpeg', 'image/png'];
const PHOTO_MAX_BYTES = 2048 * 1024;

/**
 * Who this is: photo, name, student ID, email. The photo is changed right here
 * — click the avatar or drop a picture on it — and saves on its own, apart from
 * the form below, so a new photo never waits on (or discards) half-typed edits.
 *
 * Type and size are checked before uploading so nobody waits out a slow upload
 * for a refusal; the server checks both again on the real bytes and re-encodes
 * the image anyway.
 */
export function ProfileIdentityCard({ student }: { student: StudentProfile }) {
  const { t } = useTranslation();
  const setProfile = useSetProfile();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const photo = useMutation({
    mutationFn: (file: File | null) => (file ? uploadProfilePhoto(file) : deleteProfilePhoto()),
    onSuccess: (updated, file) => {
      setProfile(updated);
      toast.success(file ? t('profile.photoUpdated') : t('profile.photoRemoved'));
    },
    onError: (error) => {
      const serverMessage = getValidationErrors(error)?.photo?.[0];
      const status = axios.isAxiosError(error) ? (error.response?.status ?? 0) : 0;

      if (serverMessage) toast.error(serverMessage);
      // 419/429/5xx are toasted by the API client already.
      else if (status !== 419 && status !== 429 && status < 500) toast.error(t('common.genericError'));
    },
  });

  function attach(file: File | undefined) {
    if (!file) return;

    if (!PHOTO_TYPES.includes(file.type)) {
      toast.error(t('site.portal.profile.photoWrongType'));
      return;
    }

    if (file.size > PHOTO_MAX_BYTES) {
      toast.error(t('site.portal.profile.photoTooLarge'));
      return;
    }

    photo.mutate(file);
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(false);
    if (!photo.isPending) attach(event.dataTransfer.files[0]);
  }

  const name = student.full_name ?? student.student_id;

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="flex flex-col items-center text-center">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          disabled={photo.isPending}
          aria-label={t('profile.changePhotoAction')}
          className={cn(
            'group relative rounded-full focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:outline-none',
            dragging && 'ring-2 ring-primary ring-offset-2',
          )}
        >
          <Avatar className="size-24">
            {student.profile_photo_url ? <AvatarImage src={student.profile_photo_url} alt="" /> : null}
            <AvatarFallback className="bg-primary-soft text-2xl font-semibold text-primary">
              {initials(name) || '–'}
            </AvatarFallback>
          </Avatar>

          {/* The badge is what makes the avatar read as clickable. */}
          <span className="absolute -right-0.5 -bottom-0.5 flex size-9 items-center justify-center rounded-full border-2 border-card bg-accent text-accent-foreground transition-transform group-hover:scale-105">
            {photo.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Camera className="size-4" aria-hidden="true" />
            )}
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={PHOTO_TYPES.join(',')}
          className="hidden"
          onChange={(event) => {
            attach(event.target.files?.[0]);
            // Picking the same file again after a refusal must fire `change` again.
            event.target.value = '';
          }}
        />

        <p className="mt-2 text-xs text-muted-foreground">{t('site.portal.profile.photoHint')}</p>

        {student.profile_photo_url ? (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 text-destructive hover:text-destructive"
            disabled={photo.isPending}
            onClick={() => setConfirmRemove(true)}
          >
            <Trash2 aria-hidden="true" />
            {t('profile.removePhoto')}
          </Button>
        ) : null}

        <ConfirmDialog
          open={confirmRemove}
          title={t('profile.removePhotoConfirm')}
          confirmLabel={t('profile.removePhoto')}
          destructive
          onCancel={() => setConfirmRemove(false)}
          onConfirm={() => {
            setConfirmRemove(false);
            photo.mutate(null);
          }}
        />

        <h1 className="mt-3 text-xl font-semibold wrap-break-word text-foreground">{name}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t('profile.studentId')}: <span className="font-medium text-foreground tabular-nums">{student.student_id}</span>
        </p>

        {student.email ? (
          <p className="mt-2 flex max-w-full items-center gap-1.5 text-sm text-muted-foreground">
            <span className="truncate">{student.email}</span>
            {student.email_verified_at ? (
              <BadgeCheck className="size-4 shrink-0 text-success" aria-label={t('profile.verified')} />
            ) : null}
          </p>
        ) : null}

        {student.registered_at ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {t('site.portal.profile.memberSince', { date: formatDate(student.registered_at) })}
          </p>
        ) : null}
      </div>
    </section>
  );
}
