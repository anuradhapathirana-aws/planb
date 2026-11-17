import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  AlertTriangle,
  AlignLeft,
  Ban,
  Globe,
  Image as ImageIcon,
  Languages,
  Laptop,
  Link2,
  Loader2,
  MousePointerClick,
  Ruler,
  Save,
  Smartphone,
  Type,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { cn } from '@/lib/utils';
import { useCourseProgrammes } from '@/features/admin/courses/hooks/useCourses';
import { useCompanySettings } from '@/features/admin/settings/hooks/useCompanySettings';
import { plainHeading, renderHighlight } from '@/features/admin/website/highlight';
import {
  useCreateSiteHeroSlide,
  useDeleteSiteHeroSlideImage,
  useSiteHeroSlideDetail,
  useUpdateSiteHeroSlide,
  useUploadSiteHeroSlideImage,
} from '@/features/admin/website/hooks/useSiteHeroSlides';
import {
  heroSlideFormSchema,
  SITE_LINK_TARGETS,
  type HeroSlideFormSchema,
} from '@/features/admin/website/websiteSchema';
import { paths } from '@/routes/paths';
import type { HeroFigure } from '@shared/types/companySettings';
import type { SaveSiteHeroSlidePayload } from '@shared/types/siteContent';

/**
 * The size the backend stores every slide image at (`SiteHeroSlideService`).
 * **One decision with that file** — change both together. The upload box warns
 * the admin when a file is smaller than this.
 */
const HERO_IMAGE_SIZE = { width: 1920, height: 1080 };

/** Mirrors `UploadSiteHeroSlideImageRequest`: JPG, PNG or WebP, up to 8 MB. */
const HERO_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const HERO_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

/**
 * Where the website anchors the crop (`HERO_FOCUS` in the website's
 * `HeroSlider.tsx`), so the preview crops exactly as visitors' screens do.
 */
const HERO_FOCUS = '68% 40%';

const FIELD_NAMES = [
  'eyebrow',
  'eyebrow_si',
  'heading',
  'heading_si',
  'body',
  'body_si',
  'primary_cta_label',
  'primary_cta_label_si',
  'primary_cta_target',
  'primary_cta_course_programme_id',
  'primary_cta_url',
  'secondary_cta_label',
  'secondary_cta_label_si',
  'secondary_cta_target',
  'secondary_cta_course_programme_id',
  'secondary_cta_url',
  'stat_one_value',
  'stat_one_label',
  'stat_one_label_si',
  'stat_two_value',
  'stat_two_label',
  'stat_two_label_si',
  'icon',
  'is_visible',
];

function blankSlide(): HeroSlideFormSchema {
  return {
    eyebrow: '',
    eyebrow_si: '',
    heading: '',
    heading_si: '',
    body: '',
    body_si: '',
    primary_cta_label: '',
    primary_cta_label_si: '',
    primary_cta_target: 'courses',
    primary_cta_course_programme_id: '',
    primary_cta_url: '',
    secondary_cta_label: '',
    secondary_cta_label_si: '',
    secondary_cta_target: 'none',
    secondary_cta_course_programme_id: '',
    secondary_cta_url: '',
    stat_one_value: '',
    stat_one_label: '',
    stat_one_label_si: '',
    stat_two_value: '',
    stat_two_label: '',
    stat_two_label_si: '',
    icon: 'education',
    is_visible: true,
  };
}

/**
 * Add / edit one hero slide.
 *
 * A full page rather than a dialog: five logical groups plus artwork and a live
 * preview is well past what a dialog carries (CLAUDE.md §8).
 *
 * Two columns — form left, a preview of the real website hero right — because a
 * hero slide's entire job is how the headline sits on the artwork. The gold
 * word, the line breaks and a pale photo swallowing white text are all things
 * you can only judge by looking, and the alternative is publishing to the
 * company's front page and checking afterwards.
 *
 * **Since 2026-11 the image is the hero's full-screen background**, 1920×1080,
 * so the preview shows both a laptop and a phone crop, and the upload box
 * carries a size-and-layout guide. The figures strip is shared by every slide
 * and is edited on the Hero slider list page, not here. The old per-slide
 * figures and fallback icon are no longer shown; their stored values ride
 * along unchanged in the form state (see `websiteSchema.ts`).
 *
 * **Creating stages the image; editing uploads it immediately.** Media Library
 * needs a saved record to attach a file to, so a new slide is saved first and
 * the staged file goes up against the id that comes back — the same order the
 * Course form uses for lesson videos and the Home banner form for artwork.
 */
export function HeroSlideFormPage() {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();

  const slideId = params.id ? Number(params.id) : null;
  const isEditing = slideId !== null;

  const { data: slide, isLoading } = useSiteHeroSlideDetail(slideId);

  const create = useCreateSiteHeroSlide();
  const update = useUpdateSiteHeroSlide(slideId ?? 0);
  const uploadImage = useUploadSiteHeroSlideImage();
  const deleteImage = useDeleteSiteHeroSlideImage();

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
  } = useForm<HeroSlideFormSchema>({
    resolver: zodResolver(heroSlideFormSchema),
    // Never mid-keystroke (CLAUDE.md §8 "Sectioned Admin Forms").
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: blankSlide(),
  });

  // Seeds the form once the slide arrives, and re-seeds after every save.
  useEffect(() => {
    if (!slide) return;

    reset({
      eyebrow: slide.eyebrow ?? '',
      eyebrow_si: slide.eyebrow_si ?? '',
      heading: slide.heading ?? '',
      // The stored Sinhala column, never the English fallback: what the admin
      // sees here is what gets saved back, so untranslated has to look
      // untranslated.
      heading_si: slide.heading_si ?? '',
      body: slide.body ?? '',
      body_si: slide.body_si ?? '',
      primary_cta_label: slide.primary_cta_label ?? '',
      primary_cta_label_si: slide.primary_cta_label_si ?? '',
      primary_cta_target: slide.primary_cta_target,
      primary_cta_course_programme_id: slide.primary_cta_course_programme_id?.toString() ?? '',
      primary_cta_url: slide.primary_cta_url ?? '',
      secondary_cta_label: slide.secondary_cta_label ?? '',
      secondary_cta_label_si: slide.secondary_cta_label_si ?? '',
      secondary_cta_target: slide.secondary_cta_target,
      secondary_cta_course_programme_id: slide.secondary_cta_course_programme_id?.toString() ?? '',
      secondary_cta_url: slide.secondary_cta_url ?? '',
      stat_one_value: slide.stat_one_value ?? '',
      stat_one_label: slide.stat_one_label ?? '',
      stat_one_label_si: slide.stat_one_label_si ?? '',
      stat_two_value: slide.stat_two_value ?? '',
      stat_two_label: slide.stat_two_label ?? '',
      stat_two_label_si: slide.stat_two_label_si ?? '',
      icon: slide.icon,
      is_visible: slide.is_visible,
    });
  }, [slide, reset]);

  const values = watch();

  /*
   * Only published courses can be linked — the backend rejects a draft, since a
   * visitor clicking through would hit a 404. Fetching only what is selectable
   * keeps the admin from picking something that will be refused on save.
   */
  const { data: courses } = useCourseProgrammes({ status: 'published', per_page: 100 });

  // The shared strip, so the preview shows what sits under this slide on the site.
  const { data: settings } = useCompanySettings();
  const figures = settings?.hero_figures ?? null;

  const imageUrl = isEditing ? (slide?.image_url ?? null) : stagedPreview;
  const saving = create.isPending || update.isPending || uploadImage.isPending;

  const submit = handleSubmit((form) => {
    const cta = (slot: 'primary' | 'secondary') => ({
      [`${slot}_cta_label`]: form[`${slot}_cta_label`].trim() || null,
      [`${slot}_cta_label_si`]: form[`${slot}_cta_label_si`].trim() || null,
      [`${slot}_cta_target`]: form[`${slot}_cta_target`],
      [`${slot}_cta_course_programme_id`]:
        form[`${slot}_cta_target`] === 'course' && form[`${slot}_cta_course_programme_id`] !== ''
          ? Number(form[`${slot}_cta_course_programme_id`])
          : null,
      [`${slot}_cta_url`]:
        form[`${slot}_cta_target`] === 'url' ? form[`${slot}_cta_url`].trim() : null,
    });

    const payload = {
      eyebrow: form.eyebrow.trim() || null,
      eyebrow_si: form.eyebrow_si.trim() || null,
      heading: form.heading.trim(),
      // Blank stays blank all the way to the column — null there is what the
      // public API reads as "fall back to English".
      heading_si: form.heading_si.trim() || null,
      body: form.body.trim() || null,
      body_si: form.body_si.trim() || null,
      ...cta('primary'),
      ...cta('secondary'),
      stat_one_value: form.stat_one_value.trim() || null,
      stat_one_label: form.stat_one_label.trim() || null,
      stat_one_label_si: form.stat_one_label_si.trim() || null,
      stat_two_value: form.stat_two_value.trim() || null,
      stat_two_label: form.stat_two_label.trim() || null,
      stat_two_label_si: form.stat_two_label_si.trim() || null,
      icon: form.icon,
      is_visible: form.is_visible,
    } as SaveSiteHeroSlidePayload;

    const onError = (error: unknown) => {
      const { applied, unmatched } = applyServerValidationErrors(error, setError, FIELD_NAMES);
      if (unmatched.length > 0) toast.error(unmatched[0]);
      else if (applied > 0) toast.error('Check the highlighted fields and try again.');
    };

    if (isEditing) {
      update.mutate(payload, {
        onSuccess: () => navigate(paths.admin.heroSlides),
        onError,
      });

      return;
    }

    create.mutate(payload, {
      onSuccess: (saved) => {
        /*
         * The record exists now, so the staged file finally has something to
         * attach to. A failed upload must not read as a failed save — the slide
         * is real either way, and the admin can add artwork from the edit
         * screen.
         */
        if (!stagedImage) {
          navigate(paths.admin.heroSlides);
          return;
        }

        uploadImage.mutate(
          { id: saved.id, file: stagedImage },
          { onSettled: () => navigate(paths.admin.heroSlides) },
        );
      },
      onError,
    });
  });

  if (isEditing && isLoading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: 'Hero slider', href: paths.admin.heroSlides },
          { label: isEditing ? plainHeading(slide?.heading ?? null) || 'Slide' : 'New slide' },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{isEditing ? 'Edit slide' : 'New slide'}</h1>
          <p className="text-sm text-muted-foreground">
            One slide of the rotating banner at the top of the Plan B website.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate(paths.admin.heroSlides)}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isEditing ? 'Save changes' : 'Add slide'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <form onSubmit={submit} noValidate className="space-y-3">
          <FormSection icon={ImageIcon} title="Background image">
            <div className="space-y-2 sm:col-span-2">
              <ImageDropzone
                label="Slide background image"
                url={imageUrl}
                aspect="video"
                recommendedSize={HERO_IMAGE_SIZE}
                acceptedTypes={HERO_IMAGE_TYPES}
                busy={uploadImage.isPending || deleteImage.isPending}
                hint={`JPG, PNG or WebP · ${HERO_IMAGE_SIZE.width} × ${HERO_IMAGE_SIZE.height} px · up to 8 MB`}
                maxBytes={HERO_IMAGE_MAX_BYTES}
                onSelect={(file) => {
                  // Editing has a record to attach to; creating does not yet.
                  if (isEditing && slideId !== null) uploadImage.mutate({ id: slideId, file });
                  else setStagedImage(file);
                }}
                onRemove={() => {
                  if (isEditing && slideId !== null) deleteImage.mutate(slideId);
                  else setStagedImage(null);
                }}
              />

              <HeroImageGuide />
            </div>
          </FormSection>

          <FormSection icon={Type} title="Wording (English)">
            <div className="space-y-1 sm:col-span-2">
              <FieldLabel htmlFor="eyebrow" icon={Type}>
                Small label above the headline
              </FieldLabel>
              <Input
                id="eyebrow"
                placeholder="e.g. Study in the UAE"
                aria-invalid={!!errors.eyebrow}
                {...register('eyebrow')}
              />
              <FieldError message={errors.eyebrow?.message} />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <FieldLabel htmlFor="heading" icon={Type} required>
                Headline
              </FieldLabel>
              <Input
                id="heading"
                placeholder="e.g. Your route to a **UAE degree**, mapped out"
                aria-invalid={!!errors.heading}
                {...register('heading')}
              />
              <FieldError message={errors.heading?.message} />
              <p className="text-xs text-muted-foreground">
                Put <span className="font-mono font-semibold">**</span> around a word or two to show
                them in gold — like{' '}
                <span className="font-mono">**UAE degree**</span>. Watch the preview to see it.
              </p>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <FieldLabel htmlFor="body" icon={Type}>
                Paragraph
              </FieldLabel>
              <Textarea
                id="body"
                rows={3}
                placeholder="e.g. Courses, documents and timelines in one place — built for Sri Lankan students."
                aria-invalid={!!errors.body}
                {...register('body')}
              />
              <FieldError message={errors.body?.message} />
            </div>
          </FormSection>

          {/* Optional throughout: a visitor reading the site in Sinhala sees the
              English wording until these are filled in, which is what lets the
              website be translated a slide at a time. */}
          <FormSection icon={Languages} title="Wording (Sinhala)">
            <div className="space-y-1 sm:col-span-2">
              <FieldLabel htmlFor="eyebrow-si" icon={Languages}>
                Small label
              </FieldLabel>
              <Input
                id="eyebrow-si"
                placeholder="උදා. එක්සත් අරාබි එමීර් රාජ්‍යයේ අධ්‍යාපනය"
                aria-invalid={!!errors.eyebrow_si}
                {...register('eyebrow_si')}
              />
              <FieldError message={errors.eyebrow_si?.message} />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <FieldLabel htmlFor="heading-si" icon={Languages}>
                Headline
              </FieldLabel>
              <Input
                id="heading-si"
                placeholder="**තරු** ලකුණු එලෙසම භාවිත කරන්න"
                aria-invalid={!!errors.heading_si}
                {...register('heading_si')}
              />
              <FieldError message={errors.heading_si?.message} />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <FieldLabel htmlFor="body-si" icon={Languages}>
                Paragraph
              </FieldLabel>
              <Textarea
                id="body-si"
                rows={3}
                aria-invalid={!!errors.body_si}
                {...register('body_si')}
              />
              <FieldError message={errors.body_si?.message} />
              <p className="text-xs text-muted-foreground">
                All optional. Anything left blank shows the English wording instead.
              </p>
            </div>
          </FormSection>

          <CtaSection
            slot="primary"
            title="First button"
            values={values}
            errors={errors}
            register={register}
            setValue={setValue}
            courses={courses?.data ?? []}
          />

          <CtaSection
            slot="secondary"
            title="Second button"
            values={values}
            errors={errors}
            register={register}
            setValue={setValue}
            courses={courses?.data ?? []}
          />

          <FormSection icon={Globe} title="Visibility">
            <div className="space-y-1 sm:col-span-2">
              <FieldLabel icon={Globe}>Show on the website</FieldLabel>
              <SegmentedToggle
                label="Show this slide on the Plan B website"
                value={values.is_visible ? 'on' : 'off'}
                onChange={(value) => setValue('is_visible', value === 'on', { shouldDirty: true })}
                options={[
                  { value: 'off', label: 'Hidden' },
                  { value: 'on', label: 'Showing' },
                ]}
              />
              <p className="text-xs text-muted-foreground">
                Hiding it keeps the image and wording, so the same slide can come back without
                re-uploading.
              </p>
            </div>
          </FormSection>
        </form>

        <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <SlidePreview values={values} imageUrl={imageUrl} figures={figures} />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

type FormErrors = Partial<Record<keyof HeroSlideFormSchema, { message?: string }>>;

interface CtaSectionProps {
  slot: 'primary' | 'secondary';
  title: string;
  values: HeroSlideFormSchema;
  errors: FormErrors;
  register: ReturnType<typeof useForm<HeroSlideFormSchema>>['register'];
  setValue: ReturnType<typeof useForm<HeroSlideFormSchema>>['setValue'];
  courses: { id: number; name: string }[];
}

/**
 * One button. Both slots are identical, so they share a component rather than
 * the file carrying the same six fields twice with `secondary_` in front.
 */
function CtaSection({
  slot,
  title,
  values,
  errors,
  register,
  setValue,
  courses,
}: CtaSectionProps) {
  const target = values[`${slot}_cta_target`];
  const hint = SITE_LINK_TARGETS.find((option) => option.value === target)?.hint;
  const showsButton = target !== 'none';

  return (
    <FormSection icon={MousePointerClick} title={title}>
      <div className="space-y-1 sm:col-span-2">
        <FieldLabel icon={Link2}>Where it goes</FieldLabel>
        <Select
          value={target}
          onValueChange={(value) =>
            setValue(`${slot}_cta_target`, value as HeroSlideFormSchema['primary_cta_target'], {
              shouldDirty: true,
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SITE_LINK_TARGETS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>

      {showsButton && (
        <>
          <div className="space-y-1">
            <FieldLabel htmlFor={`${slot}-label`} icon={Type} required>
              Button wording
            </FieldLabel>
            <Input
              id={`${slot}-label`}
              placeholder={slot === 'primary' ? 'e.g. Browse courses' : 'e.g. How it works'}
              aria-invalid={!!errors[`${slot}_cta_label`]}
              {...register(`${slot}_cta_label`)}
            />
            <FieldError message={errors[`${slot}_cta_label`]?.message} />
          </div>

          <div className="space-y-1">
            <FieldLabel htmlFor={`${slot}-label-si`} icon={Languages}>
              Button wording (Sinhala)
            </FieldLabel>
            <Input
              id={`${slot}-label-si`}
              placeholder="උදා. පාඨමාලා බලන්න"
              aria-invalid={!!errors[`${slot}_cta_label_si`]}
              {...register(`${slot}_cta_label_si`)}
            />
            <FieldError message={errors[`${slot}_cta_label_si`]?.message} />
          </div>
        </>
      )}

      {target === 'course' && (
        <div className="space-y-1 sm:col-span-2">
          <FieldLabel icon={Link2} required>
            Course
          </FieldLabel>
          <Select
            value={values[`${slot}_cta_course_programme_id`]}
            onValueChange={(value) =>
              setValue(`${slot}_cta_course_programme_id`, value, { shouldDirty: true })
            }
          >
            <SelectTrigger aria-invalid={!!errors[`${slot}_cta_course_programme_id`]}>
              <SelectValue placeholder="Choose a published course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course.id} value={String(course.id)}>
                  {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors[`${slot}_cta_course_programme_id`]?.message} />
        </div>
      )}

      {target === 'url' && (
        <div className="space-y-1 sm:col-span-2">
          <FieldLabel htmlFor={`${slot}-url`} icon={Link2} required>
            Web address
          </FieldLabel>
          <Input
            id={`${slot}-url`}
            placeholder="https://planbinternational.lk/intake"
            aria-invalid={!!errors[`${slot}_cta_url`]}
            {...register(`${slot}_cta_url`)}
          />
          <FieldError message={errors[`${slot}_cta_url`]?.message} />
        </div>
      )}
    </FormSection>
  );
}

/**
 * How the slide looks on the website.
 *
 * **Deliberately the website's own colours, not the admin palette** — the same
 * call the Home banner preview makes. The point of a preview is the visitor's
 * screen, and an admin-themed mock would hide exactly the problem it exists to
 * catch: a gold word that disappears, or white text on a pale photograph.
 *
 * The navy and gold below are `site/src/index.css`'s `--surface` and `--accent`,
 * copied as literals because this app cannot read that app's stylesheet. **If
 * those tokens change, these change with them** — the gold was retuned to
 * `#f19f00` on 2026-09-25 and these moved with it.
 */
function SlidePreview({
  values,
  imageUrl,
  figures,
}: {
  values: HeroSlideFormSchema;
  imageUrl: string | null;
  /** The shared strip. Null = never saved, so the website shows its built-in one. */
  figures: HeroFigure[] | null;
}) {
  /* Switched on but visitors see nothing — it looks live from every angle but the one that matters. */
  const liveButEmpty = values.is_visible && values.heading.trim() === '';

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Globe className="size-3.5" />
        </span>
        <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          How visitors see it
        </span>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <Laptop className="size-3.5" />
        Laptop / desktop
      </p>

      {/* 16:10 — a typical laptop window. The photo fills it exactly the way the
          website does (`object-cover`, same focus point), so a subject that is
          cut off here is cut off for visitors too. */}
      <div className="relative aspect-16/10 overflow-hidden rounded-xl bg-[#0f1e45]">
        <PreviewBackground imageUrl={imageUrl} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f1e45]/90 from-0% via-[#0f1e45]/55 via-35% to-transparent to-60%" />

        {/* The floating menu bar. */}
        <div className="absolute inset-x-2 top-2 h-3.5 rounded-md border border-white/10 bg-[#0f1e45]/75" />

        <div className="absolute inset-x-3 top-8 bottom-12 flex max-w-[58%] flex-col justify-center gap-1">
          {values.eyebrow.trim() !== '' && (
            <span className="truncate text-[7px] font-semibold tracking-[0.2em] text-[#f19f00] uppercase">
              {values.eyebrow}
            </span>
          )}

          <p className="line-clamp-3 text-[13px] leading-tight font-bold text-white">
            {values.heading.trim() === '' ? (
              <span className="text-white/40">Your headline appears here</span>
            ) : (
              renderHighlight(values.heading, 'text-[#f19f00]')
            )}
          </p>

          {values.body.trim() !== '' && (
            <p className="line-clamp-2 text-[8px] leading-snug text-white/75">{values.body}</p>
          )}

          <PreviewButtons values={values} />
        </div>

        <PreviewFigures figures={figures} />
      </div>

      <div className="flex items-end gap-3 pt-1">
        <div className="shrink-0 space-y-1">
          <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <Smartphone className="size-3.5" />
            Phone
          </p>
          {/* 9:19 — a phone screen. The same photo, cropped to its right-of-centre
              strip; this is why the guide asks for the person on the right. */}
          <div className="relative aspect-9/19 w-24 overflow-hidden rounded-xl border-2 border-slate-800 bg-[#0f1e45]">
            <PreviewBackground imageUrl={imageUrl} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f1e45]/90 via-[#0f1e45]/60 to-[#0f1e45]/25" />
            <div className="absolute inset-x-1.5 bottom-10 space-y-1">
              <p className="line-clamp-3 text-[8px] leading-tight font-bold text-white">
                {values.heading.trim() === ''
                  ? 'Your headline'
                  : renderHighlight(values.heading, 'text-[#f19f00]')}
              </p>
              <div className="h-1.5 w-10 rounded-sm bg-[#f19f00]" />
            </div>
            <div className="absolute inset-x-1.5 bottom-1.5 grid h-7 grid-cols-2 rounded-sm border border-white/10 bg-[#0f1e45]/70" />
          </div>
        </div>

        <p className="pb-1 text-xs text-muted-foreground">
          Phones show the photo’s right-of-centre part, behind the text. Check the person is
          still visible here.
        </p>
      </div>

      {liveButEmpty && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/5 p-2.5">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
          <p className="text-xs text-muted-foreground">
            This is switched on but has no headline, so visitors never see it.
          </p>
        </div>
      )}

      {!values.is_visible && (
        <p className="text-xs text-muted-foreground">Hidden — this slide is skipped on the website.</p>
      )}
    </div>
  );
}

/**
 * The slide's photo, cropped the way the website crops it. With no upload the
 * website uses its own default banner, which lives in the website's bundle and
 * cannot be loaded from here — so the preview says so instead of guessing.
 */
function PreviewBackground({ imageUrl }: { imageUrl: string | null }) {
  if (!imageUrl) {
    return (
      <div className="absolute inset-0 flex items-center justify-end bg-[linear-gradient(135deg,#1c2f66,#0f1e45)] pr-3">
        <p className="max-w-[40%] text-right text-[9px] leading-snug text-white/50">
          No image — the website’s default banner photo shows here
        </p>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt=""
      className="absolute inset-0 size-full object-cover"
      style={{ objectPosition: HERO_FOCUS }}
    />
  );
}

/** Pill buttons, as on the website: gold first, glass outline second. */
function PreviewButtons({ values }: { values: HeroSlideFormSchema }) {
  const primary = values.primary_cta_target !== 'none' && values.primary_cta_label.trim() !== '';
  const secondary =
    values.secondary_cta_target !== 'none' && values.secondary_cta_label.trim() !== '';

  if (!primary && !secondary) return null;

  return (
    <div className="flex flex-wrap gap-1 pt-0.5">
      {primary && (
        <span className="rounded-full bg-[#f19f00] px-2 py-0.5 text-[7px] font-semibold text-[#1f2937]">
          {values.primary_cta_label}
        </span>
      )}
      {secondary && (
        <span className="rounded-full border border-white/40 bg-white/10 px-2 py-0.5 text-[7px] font-semibold text-white">
          {values.secondary_cta_label}
        </span>
      )}
    </div>
  );
}

/** The shared figures strip along the bottom — edited on the Hero slider page, not here. */
function PreviewFigures({ figures }: { figures: HeroFigure[] | null }) {
  // Never saved: the website shows its built-in figures, so draw neutral cells.
  const cells =
    figures === null
      ? Array.from({ length: 4 }, () => ({ value: '—', label: 'Figure' }))
      : figures;

  if (cells.length === 0) return null;

  return (
    <div
      className="absolute inset-x-3 bottom-2 grid rounded-md border border-white/10 bg-[#0f1e45]/70"
      style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
    >
      {cells.map((figure, index) => (
        <div
          key={`${index}-${figure.label}`}
          className={cn('min-w-0 px-1.5 py-1', index > 0 && 'border-l border-white/10')}
        >
          <p className="text-[9px] leading-none font-semibold text-[#f19f00]">{figure.value}</p>
          <p className="mt-0.5 truncate text-[6px] text-white/80">{figure.label}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * What a good hero photo looks like, next to the upload box.
 *
 * The admin has no crop tool (by design, same as every other upload), so the
 * only way to get a good result is to be told the size and layout up front. The
 * diagram is the website's own layout at 16:9: menu on top, text on the left,
 * figures along the bottom — the free area on the right is where the person goes.
 */
function HeroImageGuide() {
  return (
    <div className="grid gap-3 rounded-lg border bg-secondary/40 p-3 sm:grid-cols-[180px_minmax(0,1fr)]">
      <div
        className="relative aspect-video overflow-hidden rounded-md border border-dashed border-slate-400 bg-background text-[8px] font-medium text-muted-foreground"
        aria-hidden="true"
      >
        <div className="absolute inset-x-1 top-1 flex h-3 items-center justify-center rounded-sm bg-slate-200">
          Menu
        </div>
        <div className="absolute top-5 bottom-6 left-1 flex w-[50%] items-center justify-center rounded-sm bg-slate-200 text-center">
          Text
        </div>
        <div className="absolute top-5 right-[8%] bottom-6 flex w-[30%] items-center justify-center rounded-sm border border-primary bg-primary/10 text-center text-primary">
          Person
        </div>
        <div className="absolute inset-x-1 bottom-1 flex h-4 items-center justify-center rounded-sm bg-slate-200">
          Figures strip
        </div>
      </div>

      <ul className="space-y-1.5 text-xs text-muted-foreground">
        <li className="flex items-start gap-1.5">
          <Ruler className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <span>
            <span className="font-semibold text-foreground">
              {HERO_IMAGE_SIZE.width} × {HERO_IMAGE_SIZE.height} px
            </span>{' '}
            (16:9, landscape). Bigger is fine. Smaller looks blurry on large screens, and other
            shapes are cropped to 16:9.
          </span>
        </li>
        <li className="flex items-start gap-1.5">
          <User className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <span>
            Put the person on the <span className="font-semibold text-foreground">right</span>,
            about two-thirds across. Phones only show this part of the photo.
          </span>
        </li>
        <li className="flex items-start gap-1.5">
          <AlignLeft className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <span>
            Keep the left half plain. The headline and buttons sit there, and the website darkens
            it.
          </span>
        </li>
        <li className="flex items-start gap-1.5">
          <Ban className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <span>
            No words or logos in the photo. The menu, text and figures cover the top, left and
            bottom.
          </span>
        </li>
        <li className="flex items-start gap-1.5">
          <ImageIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <span>Optional. Without one, the slide uses the website’s default banner photo.</span>
        </li>
      </ul>
    </div>
  );
}
