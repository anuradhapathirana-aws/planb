import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Image as ImageIcon,
  Link2,
  Loader2,
  MousePointerClick,
  Save,
  Smartphone,
  Trash2,
  Type,
  UploadCloud,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { FormSection } from '@/components/shared/FormSection';
import { FieldError, FieldLabel } from '@/components/shared/FormField';
import { SegmentedToggle } from '@/components/shared/SegmentedToggle';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { applyServerValidationErrors } from '@shared/lib/serverErrors';
import { useCourseProgrammes } from '@/features/admin/courses/hooks/useCourses';
import {
  useDeleteHomeBannerImage,
  useHomeBanner,
  useSaveHomeBanner,
  useUploadHomeBannerImage,
} from '@/features/admin/homeBanner/hooks/useHomeBanner';
import {
  HOME_BANNER_LINKS,
  homeBannerFormSchema,
  type HomeBannerFormSchema,
} from '@/features/admin/homeBanner/homeBannerSchema';
import { cn } from '@/lib/utils';
import type { SaveHomeBannerPayload } from '@shared/types/homeBanner';

const FIELD_NAMES = ['title', 'subtitle', 'link_type', 'link_course_programme_id', 'link_url', 'is_active'];

/**
 * Settings > Home banner.
 *
 * A singleton form, so no list page and no breadcrumbs — the sidebar already
 * says where you are. Two columns: the form on the left, a live phone-shaped
 * preview on the right, because a banner is the one piece of admin content
 * whose whole job is how it looks on a 390px screen. Editing wording and
 * guessing at the crop from a desktop form is how you ship a headline sitting
 * on top of somebody's face.
 */
export function HomeBannerPage() {
  const { data: banner, isLoading } = useHomeBanner();

  const save = useSaveHomeBanner();
  const uploadImage = useUploadHomeBannerImage();
  const deleteImage = useDeleteHomeBannerImage();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [confirmRemoveImage, setConfirmRemoveImage] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isDirty },
  } = useForm<HomeBannerFormSchema>({
    resolver: zodResolver(homeBannerFormSchema),
    // Never mid-keystroke (CLAUDE.md §8 "Sectioned Admin Forms").
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: {
      title: '',
      subtitle: '',
      link_type: 'none',
      link_course_programme_id: '',
      link_url: '',
      is_active: false,
    },
  });

  // Seeds the form once the singleton arrives, and re-seeds after every save.
  useEffect(() => {
    if (!banner) return;

    reset({
      title: banner.title ?? '',
      subtitle: banner.subtitle ?? '',
      link_type: banner.link_type,
      link_course_programme_id: banner.link_course_programme_id?.toString() ?? '',
      link_url: banner.link_url ?? '',
      is_active: banner.is_active,
    });
  }, [banner, reset]);

  const linkType = watch('link_type');
  const isActive = watch('is_active');
  const title = watch('title');
  const subtitle = watch('subtitle');

  /*
   * Only published courses can be linked — the backend rejects a draft, since a
   * student tapping through would hit a 404. Fetching only what is selectable
   * keeps the admin from picking something that will be refused on save.
   */
  const { data: courses } = useCourseProgrammes({ status: 'published', per_page: 100 });

  const onImageChosen = (file: File | undefined) => {
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Upload a JPG or PNG image.');
      return;
    }

    uploadImage.mutate(file);
  };

  const submit = handleSubmit((values) => {
    const payload: SaveHomeBannerPayload = {
      title: values.title.trim() || null,
      subtitle: values.subtitle.trim() || null,
      link_type: values.link_type,
      link_course_programme_id:
        values.link_type === 'course' && values.link_course_programme_id !== ''
          ? Number(values.link_course_programme_id)
          : null,
      link_url: values.link_type === 'url' ? values.link_url.trim() : null,
      is_active: values.is_active,
    };

    save.mutate(payload, {
      onError: (error) => {
        const { applied, unmatched } = applyServerValidationErrors(error, setError, FIELD_NAMES);
        if (unmatched.length > 0) toast.error(unmatched[0]);
        else if (applied > 0) toast.error('Check the highlighted fields and try again.');
      },
    });
  });

  const linkHint = HOME_BANNER_LINKS.find((option) => option.value === linkType)?.hint;

  /*
   * Switched on but invisible. Worth calling out loudly: the banner looks saved
   * and live from every angle except the one that matters.
   */
  const liveButImageless = isActive && !banner?.image_url;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Home banner</h1>
          <p className="text-sm text-muted-foreground">
            The promotion across the top of the student app’s Home screen.
          </p>
        </div>

        <Button size="sm" onClick={submit} disabled={save.isPending || !isDirty}>
          {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save changes
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form onSubmit={submit} className="space-y-3">
          <FormSection icon={ImageIcon} title="Image" columns={2}>
            <div className="sm:col-span-2 space-y-2">
              {banner?.image_url ? (
                <div className="relative overflow-hidden rounded-lg border">
                  <img
                    src={banner.image_url}
                    alt="Current home banner"
                    className="aspect-[2/1] w-full object-cover"
                  />

                  <div className="absolute right-2 top-2 flex gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadImage.isPending}
                    >
                      {uploadImage.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <UploadCloud className="size-4" />
                      )}
                      Replace
                    </Button>

                    <Button
                      type="button"
                      size="icon-sm"
                      variant="secondary"
                      aria-label="Remove banner image"
                      onClick={() => setConfirmRemoveImage(true)}
                      disabled={deleteImage.isPending}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                    onImageChosen(event.dataTransfer.files[0]);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click();
                  }}
                  className={cn(
                    'flex aspect-[2/1] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors',
                    isDragging ? 'border-primary bg-secondary' : 'border-input hover:bg-secondary/50',
                  )}
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {uploadImage.isPending ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <UploadCloud className="size-5" />
                    )}
                  </span>
                  <p className="text-sm">
                    <span className="font-medium text-primary">Click to upload</span>{' '}
                    <span className="text-muted-foreground">or drag and drop</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG or JPG. Best at 1200&times;600 — anything else is cropped to 2:1.
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={(event) => {
                  onImageChosen(event.target.files?.[0]);
                  // Lets the same file be re-picked after a failed upload.
                  event.target.value = '';
                }}
              />
            </div>
          </FormSection>

          <FormSection icon={Type} title="Wording" columns={2}>
            <div className="sm:col-span-2 space-y-1">
              <FieldLabel htmlFor="title" icon={Type}>
                Headline
              </FieldLabel>
              <Input
                id="title"
                placeholder="e.g. Your UAE journey starts here"
                aria-invalid={!!errors.title}
                {...register('title')}
              />
              <FieldError message={errors.title?.message} />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <FieldLabel htmlFor="subtitle" icon={Type}>
                Supporting line
              </FieldLabel>
              <Input
                id="subtitle"
                placeholder="e.g. New intake open — apply before 30 September"
                aria-invalid={!!errors.subtitle}
                {...register('subtitle')}
              />
              <FieldError message={errors.subtitle?.message} />
              {/* Both are optional: an image on its own is a perfectly good
                  banner, and overlaid text is what most often fights artwork. */}
              <p className="text-xs text-muted-foreground">
                Both are optional. Leave them blank to show the image on its own.
              </p>
            </div>
          </FormSection>

          <FormSection icon={MousePointerClick} title="When a student taps it" columns={2}>
            <div className="sm:col-span-2 space-y-1">
              <FieldLabel icon={Link2}>Opens</FieldLabel>
              <Select
                value={linkType}
                onValueChange={(value) =>
                  setValue('link_type', value as HomeBannerFormSchema['link_type'], {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOME_BANNER_LINKS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {linkHint && <p className="text-xs text-muted-foreground">{linkHint}</p>}
            </div>

            {linkType === 'course' && (
              <div className="sm:col-span-2 space-y-1">
                <FieldLabel icon={Link2} required>
                  Course
                </FieldLabel>
                <Select
                  value={watch('link_course_programme_id')}
                  onValueChange={(value) =>
                    setValue('link_course_programme_id', value, { shouldDirty: true })
                  }
                >
                  <SelectTrigger aria-invalid={!!errors.link_course_programme_id}>
                    <SelectValue placeholder="Choose a published course" />
                  </SelectTrigger>
                  <SelectContent>
                    {(courses?.data ?? []).map((course) => (
                      <SelectItem key={course.id} value={String(course.id)}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.link_course_programme_id?.message} />
              </div>
            )}

            {linkType === 'url' && (
              <div className="sm:col-span-2 space-y-1">
                <FieldLabel htmlFor="link_url" icon={Link2} required>
                  Web address
                </FieldLabel>
                <Input
                  id="link_url"
                  placeholder="https://planbinternational.lk/intake"
                  aria-invalid={!!errors.link_url}
                  {...register('link_url')}
                />
                <FieldError message={errors.link_url?.message} />
              </div>
            )}
          </FormSection>

          <FormSection icon={Smartphone} title="Visibility" columns={2}>
            <div className="sm:col-span-2 space-y-1">
              <FieldLabel icon={Smartphone}>Show on Home</FieldLabel>
              <SegmentedToggle
                label="Show the banner on the student app's Home screen"
                value={isActive ? 'on' : 'off'}
                onChange={(value) => setValue('is_active', value === 'on', { shouldDirty: true })}
                options={[
                  { value: 'off', label: 'Hidden' },
                  { value: 'on', label: 'Showing' },
                ]}
              />
              <p className="text-xs text-muted-foreground">
                Hiding it keeps the image and wording, so the same promotion can come back without
                re-uploading.
              </p>
            </div>
          </FormSection>
        </form>

        <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Smartphone className="size-3.5" />
              </span>
              <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                How students see it
              </span>
            </div>

            {/* Deliberately the app's own colours, not the admin palette — the
                point of the preview is what the student's screen looks like. */}
            <div className="overflow-hidden rounded-2xl border bg-[#f8fafc] p-3">
              <div className="relative aspect-[2/1] overflow-hidden rounded-xl bg-[#0f1e45]">
                {banner?.image_url && (
                  <img src={banner.image_url} alt="" className="size-full object-cover" />
                )}

                {(title.trim() !== '' || subtitle.trim() !== '') && (
                  <>
                    {/* The scrim is what keeps overlaid text legible on a light
                        photo, so the preview has to show it too. */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 space-y-0.5 p-3">
                      {title.trim() !== '' && (
                        <p className="text-sm leading-tight font-semibold text-white">{title}</p>
                      )}
                      {subtitle.trim() !== '' && (
                        <p className="text-[11px] leading-snug text-white/80">{subtitle}</p>
                      )}
                    </div>
                  </>
                )}

                {!banner?.image_url && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="px-4 text-center text-[11px] text-white/60">
                      No image yet — students see the Plan B fallback hero.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {liveButImageless && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/5 p-2.5">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                <p className="text-xs text-muted-foreground">
                  This is switched on but has no image, so students see Plan B’s built-in hero
                  instead. Upload an image to make it live.
                </p>
              </div>
            )}

            {!isActive && (
              <p className="text-xs text-muted-foreground">
                Hidden — students currently see Plan B’s built-in hero.
              </p>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmRemoveImage}
        onOpenChange={setConfirmRemoveImage}
        title="Remove the banner image?"
        description="Students will see Plan B’s built-in hero until you upload a new one."
        confirmLabel="Remove image"
        variant="destructive"
        isLoading={deleteImage.isPending}
        onConfirm={() => {
          deleteImage.mutate();
          setConfirmRemoveImage(false);
        }}
      />
    </div>
  );
}
