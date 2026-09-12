import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  Type,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { FieldError, FieldLabel } from '@/components/shared/FormField';
import { FormSection } from '@/components/shared/FormSection';
import { ImageDropzone } from '@/components/shared/ImageDropzone';
import { PageLoader } from '@/components/shared/PageLoader';
import { SegmentedToggle } from '@/components/shared/SegmentedToggle';
import { applyServerValidationErrors } from '@shared/lib/serverErrors';
import { useCourseProgrammes } from '@/features/admin/courses/hooks/useCourses';
import {
  useCreateHomeBanner,
  useDeleteHomeBannerImage,
  useHomeBannerDetail,
  useUpdateHomeBanner,
  useUploadHomeBannerImage,
} from '@/features/admin/homeBanner/hooks/useHomeBanner';
import {
  HOME_BANNER_LINKS,
  homeBannerFormSchema,
  type HomeBannerFormSchema,
} from '@/features/admin/homeBanner/homeBannerSchema';
import { paths } from '@/routes/paths';
import type { SaveHomeBannerPayload } from '@shared/types/homeBanner';

const FIELD_NAMES = [
  'title',
  'subtitle',
  'link_type',
  'link_course_programme_id',
  'link_url',
  'is_active',
];

/**
 * Add / edit one Home carousel slide.
 *
 * A full page rather than a dialog: four logical groups plus an image and a
 * live preview is past what a dialog carries well (CLAUDE.md §8).
 *
 * Two columns — the form on the left, a phone-shaped preview on the right —
 * because a banner is the one piece of admin content whose entire job is how it
 * looks on a 390px screen. Editing wording and guessing at the crop from a
 * desktop form is how you ship a headline sitting on top of somebody's face.
 *
 * **Creating stages the image; editing uploads it immediately.** Media Library
 * needs a saved record with an id to attach a file to, so a new slide is saved
 * first and the staged file goes up against the id that comes back — the same
 * order the Course form uses for its lesson videos.
 */
export function HomeBannerFormPage() {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();

  const bannerId = params.id ? Number(params.id) : null;
  const isEditing = bannerId !== null;

  const { data: banner, isLoading } = useHomeBannerDetail(bannerId);

  const create = useCreateHomeBanner();
  const update = useUpdateHomeBanner(bannerId ?? 0);
  const uploadImage = useUploadHomeBannerImage();
  const deleteImage = useDeleteHomeBannerImage();

  /*
   * Only set while creating. An object URL so the dropzone can show the picked
   * file before there is a record to attach it to; revoked on unmount so the
   * blob is not held for the life of the tab.
   */
  const [stagedImage, setStagedImage] = useState<File | null>(null);
  const [stagedPreview, setStagedPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!stagedImage) {
      setStagedPreview(null);
      return;
    }

    const url = URL.createObjectURL(stagedImage);
    setStagedPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [stagedImage]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors },
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
      is_active: true,
    },
  });

  // Seeds the form once the slide arrives, and re-seeds after every save.
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

  const imageUrl = isEditing ? (banner?.image_url ?? null) : stagedPreview;
  const saving = create.isPending || update.isPending || uploadImage.isPending;

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

    const onError = (error: unknown) => {
      const { applied, unmatched } = applyServerValidationErrors(error, setError, FIELD_NAMES);
      if (unmatched.length > 0) toast.error(unmatched[0]);
      else if (applied > 0) toast.error('Check the highlighted fields and try again.');
    };

    if (isEditing) {
      update.mutate(payload, {
        onSuccess: () => navigate(paths.admin.homeBanners),
        onError,
      });

      return;
    }

    create.mutate(payload, {
      onSuccess: (saved) => {
        /*
         * The record exists now, so the staged file finally has something to
         * attach to. A failed upload must not read as a failed save — the slide
         * is real either way, and the admin can add art from the edit screen.
         */
        if (!stagedImage) {
          navigate(paths.admin.homeBanners);
          return;
        }

        uploadImage.mutate(
          { id: saved.id, file: stagedImage },
          {
            onSettled: () => navigate(paths.admin.homeBanners),
          },
        );
      },
      onError,
    });
  });

  const linkHint = HOME_BANNER_LINKS.find((option) => option.value === linkType)?.hint;

  /* Switched on but students see nothing — it looks live from every angle but the one that matters. */
  const liveButEmpty = isActive && !imageUrl && title.trim() === '';

  if (isEditing && isLoading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: 'Home banners', href: paths.admin.homeBanners },
          { label: isEditing ? banner?.title || 'Banner' : 'New banner' },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{isEditing ? 'Edit banner' : 'New banner'}</h1>
          <p className="text-sm text-muted-foreground">
            One slide of the carousel on the student app’s Home screen.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate(paths.admin.homeBanners)}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isEditing ? 'Save changes' : 'Add banner'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form onSubmit={submit} noValidate className="space-y-3">
          <FormSection icon={ImageIcon} title="Image" columns={2}>
            <div className="space-y-2 sm:col-span-2">
              <ImageDropzone
                label="Banner image"
                url={imageUrl}
                aspect="banner"
                busy={uploadImage.isPending || deleteImage.isPending}
                hint="PNG or JPG. Upload at 1280×540 — anything else is centre-cropped to that shape."
                onSelect={(file) => {
                  // Editing has a record to attach to; creating does not yet.
                  if (isEditing && bannerId !== null) uploadImage.mutate({ id: bannerId, file });
                  else setStagedImage(file);
                }}
                onRemove={() => {
                  if (isEditing && bannerId !== null) deleteImage.mutate(bannerId);
                  else setStagedImage(null);
                }}
              />

              <p className="text-xs text-muted-foreground">
                Optional. A slide with a headline and no image still shows — students see it as a
                plain Plan B slide in the brand colours.
              </p>
            </div>
          </FormSection>

          <FormSection icon={Type} title="Wording" columns={2}>
            <div className="space-y-1 sm:col-span-2">
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

            <div className="space-y-1 sm:col-span-2">
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
              <p className="text-xs text-muted-foreground">
                Both are optional — but a slide needs either a headline or an image, or students
                never see it.
              </p>
            </div>
          </FormSection>

          <FormSection icon={MousePointerClick} title="When a student taps it" columns={2}>
            <div className="space-y-1 sm:col-span-2">
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
              <div className="space-y-1 sm:col-span-2">
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
              <div className="space-y-1 sm:col-span-2">
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
            <div className="space-y-1 sm:col-span-2">
              <FieldLabel icon={Smartphone}>Show in the carousel</FieldLabel>
              <SegmentedToggle
                label="Show this slide on the student app's Home screen"
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
              {/* 64:27 — the app's slide shape and the shape uploads are cropped
                  to. A preview in a different ratio would show the admin a crop
                  the phone is never going to render. */}
              <div className="relative aspect-64/27 overflow-hidden rounded-2xl bg-[#0f1e45]">
                {imageUrl && <img src={imageUrl} alt="" className="size-full object-cover" />}

                {/* No scrim, because the app no longer draws one — the banner is
                    shown exactly as uploaded. That makes this preview the place
                    an admin finds out their white headline is invisible on a pale
                    photo, which is the whole point of having it. If a scrim ever
                    comes back to the carousel, it has to come back here too. */}

                {(title.trim() !== '' || subtitle.trim() !== '') && (
                  <div className="absolute inset-x-0 bottom-0 space-y-0.5 p-3 pr-14">
                    {title.trim() !== '' && (
                      <p className="text-sm leading-tight font-semibold text-white">{title}</p>
                    )}
                    {subtitle.trim() !== '' && (
                      <p className="text-[11px] leading-snug text-white/80">{subtitle}</p>
                    )}
                  </div>
                )}

                {/* Where the carousel draws its page dots. */}
                <div className="absolute right-3 bottom-3 flex items-center gap-1">
                  <span className="h-1 w-4 rounded-full bg-white" />
                  <span className="size-1 rounded-full bg-white/50" />
                  <span className="size-1 rounded-full bg-white/50" />
                </div>
              </div>
            </div>

            {liveButEmpty && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/5 p-2.5">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                <p className="text-xs text-muted-foreground">
                  This is switched on but has neither an image nor a headline, so students never see
                  it. Add one of the two.
                </p>
              </div>
            )}

            {!isActive && (
              <p className="text-xs text-muted-foreground">
                Hidden — this slide is skipped in the carousel.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
