import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Globe,
  Hash,
  Image as ImageIcon,
  Languages,
  Link2,
  Loader2,
  MousePointerClick,
  Save,
  Shapes,
  Type,
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
import { useCourseProgrammes } from '@/features/admin/courses/hooks/useCourses';
import { SITE_HERO_ICON_GLYPHS } from '@/features/admin/website/heroIcons';
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
  SITE_HERO_ICONS,
  SITE_LINK_TARGETS,
  type HeroSlideFormSchema,
} from '@/features/admin/website/websiteSchema';
import { paths } from '@/routes/paths';
import type { SaveSiteHeroSlidePayload } from '@shared/types/siteContent';

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
          <FormSection icon={ImageIcon} title="Image">
            <div className="space-y-2 sm:col-span-2">
              <ImageDropzone
                label="Slide image"
                url={imageUrl}
                aspect="photo"
                busy={uploadImage.isPending || deleteImage.isPending}
                hint="PNG or JPG. Upload at 1200×900 — anything else is centre-cropped to that shape."
                maxBytes={5 * 1024 * 1024}
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

              <p className="text-xs text-muted-foreground">
                Optional. Without an image the slide shows a designed Plan B panel with the icon
                below — so you can write the words now and add the photo later.
              </p>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <FieldLabel icon={Shapes}>Icon for the designed panel</FieldLabel>
              <Select
                value={values.icon}
                onValueChange={(value) =>
                  setValue('icon', value as HeroSlideFormSchema['icon'], { shouldDirty: true })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SITE_HERO_ICONS.map((option) => {
                    const Glyph = SITE_HERO_ICON_GLYPHS[option.value];

                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <Glyph className="size-4" />
                        {option.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Only shown when there is no image.
              </p>
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

          <FormSection icon={Hash} title="Figures over the image">
            <div className="space-y-1">
              <FieldLabel htmlFor="stat-one-value" icon={Hash}>
                First figure
              </FieldLabel>
              <Input
                id="stat-one-value"
                placeholder="e.g. 500+"
                aria-invalid={!!errors.stat_one_value}
                {...register('stat_one_value')}
              />
              <FieldError message={errors.stat_one_value?.message} />
            </div>

            <div className="space-y-1">
              <FieldLabel htmlFor="stat-one-label" icon={Type}>
                What it counts
              </FieldLabel>
              <Input
                id="stat-one-label"
                placeholder="e.g. Students"
                aria-invalid={!!errors.stat_one_label}
                {...register('stat_one_label')}
              />
              <FieldError message={errors.stat_one_label?.message} />
            </div>

            <div className="space-y-1">
              <FieldLabel htmlFor="stat-one-label-si" icon={Languages}>
                What it counts (Sinhala)
              </FieldLabel>
              <Input
                id="stat-one-label-si"
                placeholder="උදා. සිසුන්"
                aria-invalid={!!errors.stat_one_label_si}
                {...register('stat_one_label_si')}
              />
              <FieldError message={errors.stat_one_label_si?.message} />
            </div>

            <div className="space-y-1">
              <FieldLabel htmlFor="stat-two-value" icon={Hash}>
                Second figure
              </FieldLabel>
              <Input
                id="stat-two-value"
                placeholder="e.g. 2"
                aria-invalid={!!errors.stat_two_value}
                {...register('stat_two_value')}
              />
              <FieldError message={errors.stat_two_value?.message} />
            </div>

            <div className="space-y-1">
              <FieldLabel htmlFor="stat-two-label" icon={Type}>
                What it counts
              </FieldLabel>
              <Input
                id="stat-two-label"
                placeholder="e.g. Languages"
                aria-invalid={!!errors.stat_two_label}
                {...register('stat_two_label')}
              />
              <FieldError message={errors.stat_two_label?.message} />
            </div>

            <div className="space-y-1">
              <FieldLabel htmlFor="stat-two-label-si" icon={Languages}>
                What it counts (Sinhala)
              </FieldLabel>
              <Input
                id="stat-two-label-si"
                placeholder="උදා. භාෂා"
                aria-invalid={!!errors.stat_two_label_si}
                {...register('stat_two_label_si')}
              />
              <FieldError message={errors.stat_two_label_si?.message} />
            </div>

            <p className="text-xs text-muted-foreground sm:col-span-2">
              Optional. Both are small white cards that sit over the bottom of the image. Leave a
              figure blank to hide that card.
            </p>
          </FormSection>

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
          <SlidePreview values={values} imageUrl={imageUrl} />
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
}: {
  values: HeroSlideFormSchema;
  imageUrl: string | null;
}) {
  const FallbackIcon = SITE_HERO_ICON_GLYPHS[values.icon];

  const stats = (
    [
      { value: values.stat_one_value.trim(), label: values.stat_one_label.trim() },
      { value: values.stat_two_value.trim(), label: values.stat_two_label.trim() },
    ] as const
  ).filter((stat) => stat.value !== '');

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

      <div className="space-y-3 overflow-hidden rounded-2xl bg-[#0f1e45] p-4">
        <div className="space-y-2">
          {values.eyebrow.trim() !== '' && (
            <span className="inline-flex rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-[#f19f00] uppercase">
              {values.eyebrow}
            </span>
          )}

          <p className="text-lg leading-tight font-semibold text-balance text-white">
            {values.heading.trim() === '' ? (
              <span className="text-white/40">Your headline appears here</span>
            ) : (
              renderHighlight(values.heading, 'text-[#f19f00]')
            )}
          </p>

          {values.body.trim() !== '' && (
            <p className="text-xs leading-relaxed text-white/70">{values.body}</p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {values.primary_cta_target !== 'none' && values.primary_cta_label.trim() !== '' && (
              <span className="rounded-md bg-[#f19f00] px-3 py-1.5 text-[11px] font-semibold text-[#0f1e45]">
                {values.primary_cta_label}
              </span>
            )}
            {values.secondary_cta_target !== 'none' && values.secondary_cta_label.trim() !== '' && (
              <span className="rounded-md border border-white/25 px-3 py-1.5 text-[11px] font-semibold text-white">
                {values.secondary_cta_label}
              </span>
            )}
          </div>
        </div>

        {/* 4:3 — the frame the website reserves and the shape uploads are
            cropped to. A preview in another ratio shows a crop nobody gets. */}
        <div className="relative aspect-4/3 overflow-hidden rounded-xl border border-white/10 bg-white/5">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 text-white/40">
              <FallbackIcon className="size-8" />
              <p className="text-[10px]">Designed panel — no image</p>
            </div>
          )}

          {stats.length > 0 && (
            <div className="absolute right-3 bottom-3 flex gap-2">
              {stats.map((stat) => (
                <div
                  key={stat.value + stat.label}
                  className="rounded-lg bg-white px-2.5 py-1.5 text-center shadow-lg"
                >
                  <p className="text-xs leading-none font-bold text-[#0f1e45]">{stat.value}</p>
                  {stat.label !== '' && (
                    <p className="mt-0.5 text-[9px] leading-none text-[#0f1e45]/60">{stat.label}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
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
