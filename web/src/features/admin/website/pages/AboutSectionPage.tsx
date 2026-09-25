import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  Languages,
  Loader2,
  Play,
  Save,
  Tag,
  Type,
  Youtube,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FieldError, FieldLabel } from '@/components/shared/FormField';
import { FormSection } from '@/components/shared/FormSection';
import { ImageDropzone } from '@/components/shared/ImageDropzone';
import { PageLoader } from '@/components/shared/PageLoader';
import { applyServerValidationErrors } from '@shared/lib/serverErrors';
import { useCompanySettings } from '@/features/admin/settings/hooks/useCompanySettings';
import { renderHighlight } from '@/features/admin/website/highlight';
import {
  useDeleteCommunityPoster,
  useUpdateWebsiteContent,
  useUploadCommunityPoster,
} from '@/features/admin/website/hooks/useWebsiteContent';
import {
  websiteContentFormSchema,
  type WebsiteContentFormSchema,
} from '@/features/admin/website/websiteSchema';
import { youTubeThumbnailUrl, youTubeVideoId } from '@shared/lib/youtube';
import type { SaveWebsiteContentPayload } from '@shared/types/siteContent';

const FIELD_NAMES = [
  'community_eyebrow',
  'community_eyebrow_si',
  'community_heading',
  'community_heading_si',
  'community_body',
  'community_body_si',
  'community_video_url',
  'community_video_duration_label',
  'community_floating_label',
  'community_floating_label_si',
];

/**
 * Website Configuration > About Video — the "Community & trust" band.
 *
 * A settings page over the `company_settings` singleton, beside Bank Details
 * and App Intro, and it submits only its own fields so saving the website copy
 * can never touch the bank account.
 *
 * **The video is a link, not an upload** (client decision, 2026-09-25). The
 * website loads nothing from YouTube until a visitor presses play, so a visitor
 * who never watches is never handed to Google — and Plan B's own server never
 * carries the bytes.
 */
export function AboutSectionPage() {
  const { data: settings, isLoading } = useCompanySettings();

  const save = useUpdateWebsiteContent();
  const uploadPoster = useUploadCommunityPoster();
  const deletePoster = useDeleteCommunityPoster();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<WebsiteContentFormSchema>({
    resolver: zodResolver(websiteContentFormSchema),
    // Never mid-keystroke (CLAUDE.md §8 "Sectioned Admin Forms").
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: {
      community_eyebrow: '',
      community_eyebrow_si: '',
      community_heading: '',
      community_heading_si: '',
      community_body: '',
      community_body_si: '',
      community_video_url: '',
      community_video_duration_label: '',
      community_floating_label: '',
      community_floating_label_si: '',
    },
  });

  useEffect(() => {
    if (!settings) return;

    reset({
      community_eyebrow: settings.community_eyebrow ?? '',
      community_eyebrow_si: settings.community_eyebrow_si ?? '',
      community_heading: settings.community_heading ?? '',
      // The stored Sinhala column, never the English fallback — what is in this
      // input is what gets saved back over it.
      community_heading_si: settings.community_heading_si ?? '',
      community_body: settings.community_body ?? '',
      community_body_si: settings.community_body_si ?? '',
      community_video_url: settings.community_video_url ?? '',
      community_video_duration_label: settings.community_video_duration_label ?? '',
      community_floating_label: settings.community_floating_label ?? '',
      community_floating_label_si: settings.community_floating_label_si ?? '',
    });
  }, [settings, reset]);

  const values = watch();
  const posterUrl = settings?.community_poster_url ?? null;

  const submit = handleSubmit((form) => {
    const blankToNull = (value: string) => value.trim() || null;

    const payload: SaveWebsiteContentPayload = {
      community_eyebrow: blankToNull(form.community_eyebrow),
      community_eyebrow_si: blankToNull(form.community_eyebrow_si),
      community_heading: blankToNull(form.community_heading),
      community_heading_si: blankToNull(form.community_heading_si),
      community_body: blankToNull(form.community_body),
      community_body_si: blankToNull(form.community_body_si),
      community_video_url: blankToNull(form.community_video_url),
      community_video_duration_label: blankToNull(form.community_video_duration_label),
      community_floating_label: blankToNull(form.community_floating_label),
      community_floating_label_si: blankToNull(form.community_floating_label_si),
    };

    save.mutate(payload, {
      onError: (error) => {
        const { applied, unmatched } = applyServerValidationErrors(error, setError, FIELD_NAMES);
        if (unmatched.length > 0) toast.error(unmatched[0]);
        else if (applied > 0) toast.error('Check the highlighted fields and try again.');
      },
    });
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">About video</h1>
          <p className="text-sm text-muted-foreground">
            The “Community &amp; trust” band on the Plan B website — the heading, the paragraph and
            the video beside them.
          </p>
        </div>

        <Button size="sm" onClick={submit} disabled={save.isPending}>
          {save.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save changes
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <form onSubmit={submit} noValidate className="space-y-3">
          <FormSection icon={Youtube} title="Video">
            <div className="space-y-1 sm:col-span-2">
              <FieldLabel htmlFor="video-url" icon={Youtube}>
                YouTube link
              </FieldLabel>
              <Input
                id="video-url"
                placeholder="https://www.youtube.com/watch?v=xxxxxxxxxxx"
                aria-invalid={!!errors.community_video_url}
                {...register('community_video_url')}
              />
              <FieldError message={errors.community_video_url?.message} />
              <VideoLinkStatus url={values.community_video_url} />
            </div>

            <div className="space-y-1">
              <FieldLabel htmlFor="video-length" icon={Clock}>
                Video length
              </FieldLabel>
              <Input
                id="video-length"
                placeholder="e.g. 1:58"
                aria-invalid={!!errors.community_video_duration_label}
                {...register('community_video_duration_label')}
              />
              <FieldError message={errors.community_video_duration_label?.message} />
              <p className="text-xs text-muted-foreground">
                Shown on the play button. Type it from the video itself.
              </p>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <FieldLabel icon={ImageIcon}>Cover image</FieldLabel>
              <ImageDropzone
                label="Video cover image"
                url={posterUrl}
                aspect="video"
                busy={uploadPoster.isPending || deletePoster.isPending}
                hint="PNG or JPG. Upload at 1280×720 — anything else is centre-cropped to that shape."
                maxBytes={5 * 1024 * 1024}
                onSelect={(file) => uploadPoster.mutate(file)}
                onRemove={() => deletePoster.mutate()}
              />
              <p className="text-xs text-muted-foreground">
                Optional — the still shown before anyone presses play. Without one the website uses
                YouTube’s own thumbnail, which is usually lower quality.
              </p>
            </div>
          </FormSection>

          <FormSection icon={Type} title="Wording (English)">
            <div className="space-y-1">
              <FieldLabel htmlFor="eyebrow" icon={Tag}>
                Small label
              </FieldLabel>
              <Input
                id="eyebrow"
                placeholder="e.g. Community & trust"
                aria-invalid={!!errors.community_eyebrow}
                {...register('community_eyebrow')}
              />
              <FieldError message={errors.community_eyebrow?.message} />
            </div>

            <div className="space-y-1">
              <FieldLabel htmlFor="floating-label" icon={Tag}>
                Pill over the video
              </FieldLabel>
              <Input
                id="floating-label"
                placeholder="e.g. Enrolment open now"
                aria-invalid={!!errors.community_floating_label}
                {...register('community_floating_label')}
              />
              <FieldError message={errors.community_floating_label?.message} />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <FieldLabel htmlFor="heading" icon={Type}>
                Heading
              </FieldLabel>
              <Input
                id="heading"
                placeholder="e.g. Join **500+ Sri Lankans** building a life in the UAE"
                aria-invalid={!!errors.community_heading}
                {...register('community_heading')}
              />
              <FieldError message={errors.community_heading?.message} />
              <p className="text-xs text-muted-foreground">
                Put <span className="font-mono font-semibold">**</span> around a word or two to show
                them in gold. Watch the preview to see it.
              </p>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <FieldLabel htmlFor="body" icon={Type}>
                Paragraph
              </FieldLabel>
              <Textarea
                id="body"
                rows={4}
                placeholder="e.g. Plan B International has guided students and professionals from Colombo to Dubai since day one."
                aria-invalid={!!errors.community_body}
                {...register('community_body')}
              />
              <FieldError message={errors.community_body?.message} />
            </div>
          </FormSection>

          <FormSection icon={Languages} title="Wording (Sinhala)">
            <div className="space-y-1">
              <FieldLabel htmlFor="eyebrow-si" icon={Languages}>
                Small label
              </FieldLabel>
              <Input
                id="eyebrow-si"
                aria-invalid={!!errors.community_eyebrow_si}
                {...register('community_eyebrow_si')}
              />
              <FieldError message={errors.community_eyebrow_si?.message} />
            </div>

            <div className="space-y-1">
              <FieldLabel htmlFor="floating-label-si" icon={Languages}>
                Pill over the video
              </FieldLabel>
              <Input
                id="floating-label-si"
                aria-invalid={!!errors.community_floating_label_si}
                {...register('community_floating_label_si')}
              />
              <FieldError message={errors.community_floating_label_si?.message} />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <FieldLabel htmlFor="heading-si" icon={Languages}>
                Heading
              </FieldLabel>
              <Input
                id="heading-si"
                placeholder="**තරු** ලකුණු එලෙසම භාවිත කරන්න"
                aria-invalid={!!errors.community_heading_si}
                {...register('community_heading_si')}
              />
              <FieldError message={errors.community_heading_si?.message} />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <FieldLabel htmlFor="body-si" icon={Languages}>
                Paragraph
              </FieldLabel>
              <Textarea
                id="body-si"
                rows={4}
                aria-invalid={!!errors.community_body_si}
                {...register('community_body_si')}
              />
              <FieldError message={errors.community_body_si?.message} />
              <p className="text-xs text-muted-foreground">
                All optional. Anything left blank shows the English wording instead.
              </p>
            </div>
          </FormSection>
        </form>

        <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <AboutPreview values={values} posterUrl={posterUrl} />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Tells the admin whether the pasted link will actually play, before they save.
 *
 * The same parser the website uses, so what this says and what the front page
 * does cannot disagree. It is **not** the security control — the server
 * re-checks the link against its own host allowlist on write, and the website
 * parses it a third time before an iframe is ever created.
 */
function VideoLinkStatus({ url }: { url: string }) {
  const trimmed = url.trim();

  if (trimmed === '') {
    return (
      <p className="text-xs text-muted-foreground">
        Leave blank to show the designed panel instead of a video.
      </p>
    );
  }

  const videoId = youTubeVideoId(trimmed);

  if (!videoId) {
    return (
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
        Not a YouTube video link — this will be refused when you save.
      </p>
    );
  }

  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <CheckCircle2 className="size-3.5 shrink-0 text-success" />
      YouTube video <span className="font-mono">{videoId}</span>
    </p>
  );
}

/**
 * How the band looks on the website.
 *
 * The website's own colours, not the admin palette — see `HeroSlideFormPage`'s
 * preview for the reasoning. Here it matters most for the gold word in the
 * heading and for whether the pill overlaps the play button.
 */
function AboutPreview({
  values,
  posterUrl,
}: {
  values: WebsiteContentFormSchema;
  posterUrl: string | null;
}) {
  const videoId = youTubeVideoId(values.community_video_url);
  // An admin-uploaded still wins; YouTube's own thumbnail is the fallback, and
  // is what the website falls back to as well.
  const still = posterUrl ?? (videoId ? youTubeThumbnailUrl(videoId) : null);

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Play className="size-3.5" />
        </span>
        <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          How visitors see it
        </span>
      </div>

      <div className="space-y-3 rounded-2xl bg-[#f5f6f9] p-4">
        {values.community_eyebrow.trim() !== '' && (
          <span className="inline-flex rounded-full bg-[#fef4e0] px-2.5 py-1 text-[10px] font-semibold tracking-wider text-[#946100] uppercase">
            {values.community_eyebrow}
          </span>
        )}

        <p className="text-lg leading-tight font-semibold text-balance text-[#0f1e45]">
          {values.community_heading.trim() === '' ? (
            <span className="text-[#0f1e45]/40">Your heading appears here</span>
          ) : (
            renderHighlight(values.community_heading, 'text-[#946100]')
          )}
        </p>

        {values.community_body.trim() !== '' && (
          <p className="line-clamp-4 text-xs leading-relaxed text-[#0f1e45]/70">
            {values.community_body}
          </p>
        )}

        {/* 16:9 — the frame the website reserves for the player. */}
        <div className="relative aspect-video overflow-hidden rounded-xl bg-[#0f1e45]">
          {still ? (
            <img src={still} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-white/40">
              <p className="text-[10px]">Designed panel — no video link</p>
            </div>
          )}

          {still && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-white/95 shadow-lg">
                <Play className="size-4 fill-[#0f1e45] text-[#0f1e45]" />
              </span>
            </div>
          )}

          {values.community_video_duration_label.trim() !== '' && still && (
            <span className="absolute top-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
              {values.community_video_duration_label}
            </span>
          )}

          {values.community_floating_label.trim() !== '' && (
            <span className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[10px] font-medium text-[#0f1e45] shadow-lg">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {values.community_floating_label}
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        The video does not load until a visitor presses play — nothing is sent to YouTube before
        then.
      </p>
    </div>
  );
}
