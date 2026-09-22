import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Controller, useFieldArray, useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  BookOpen,
  ChevronsDownUp,
  ChevronsUpDown,
  ClipboardList,
  Image as ImageIcon,
  Languages,
  Layers,
  Loader2,
  Plus,
  Save,
  Tag,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { FieldError, FieldLabel } from '@/components/shared/FormField';
import { FormSection } from '@/components/shared/FormSection';
import { ImageDropzone } from '@/components/shared/ImageDropzone';
import { PageLoader } from '@/components/shared/PageLoader';
import { SegmentedToggle } from '@/components/shared/SegmentedToggle';
import { CourseCategoryFields } from '@/features/admin/courses/components/CourseCategoryFields';
import { TopicCard } from '@/features/admin/courses/components/TopicCard';
import { VideoPreviewDialog } from '@/features/admin/courses/components/VideoPreviewDialog';
import { VideoUploadDialog, type VideoUploadItem } from '@/features/admin/courses/components/VideoUploadDialog';
import type { StagedVideoFile } from '@/features/admin/courses/components/VideoRow';
import {
  courseFormSchema,
  emptyTopic,
  emptyVideo,
  DEFAULT_CURRENCY,
  type CourseFormSchema,
} from '@/features/admin/courses/courseSchema';
import {
  useCourseProgramme,
  useCreateCourseProgramme,
  useDeleteCourseThumbnail,
  useDeleteCourseVideoFile,
  useVideoProcessingWatcher,
  useUpdateCourseProgramme,
  useUploadCourseThumbnail,
} from '@/features/admin/courses/hooks/useCourses';
import { useActiveCourseCategories } from '@/features/admin/courseCategories/hooks/useCourseCategories';
import { withCurrentCategory } from '@/features/admin/courseCategories/hooks/useCategoryCascade';
import { uploadCourseProgrammeThumbnail, uploadCourseVideoFile } from '@/api/courses.api';
import { fromCents, toCents } from '@shared/lib/formatters';
import { newClientKey } from '@shared/lib/clientKey';
import { applyServerValidationErrors, getValidationErrors } from '@shared/lib/serverErrors';
import { paths } from '@/routes/paths';
import type { CourseProgramme, CourseProgrammePayload, CourseVideo } from '@shared/types/course';

const COURSE_FIELD_NAMES = Object.keys(courseFormSchema.shape);

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
] as const;

/** Blank form for a new course: one topic ready to fill in, nothing else. */
function blankCourse(): CourseFormSchema {
  return {
    course_category_id: undefined as unknown as number,
    name: '',
    name_si: '',
    description: '',
    price: '',
    currency: DEFAULT_CURRENCY,
    status: 'draft',
    topics: [emptyTopic()],
  };
}

function toFormValues(programme: CourseProgramme): CourseFormSchema {
  const topics = (programme.topics ?? []).map((topic) => ({
    saved_id: topic.id,
    title: topic.title,
    // The stored Sinhala name, never the English fallback: what the admin sees
    // in this input is what gets saved back, so an untranslated topic has to
    // look untranslated.
    title_si: topic.title_si ?? '',
    description: topic.description ?? '',
    videos: (topic.videos ?? []).map((video) => ({
      client_key: newClientKey(),
      saved_id: video.id,
      title: video.title,
      title_si: video.title_si ?? '',
      duration_seconds: video.duration_seconds,
    })),
  }));

  return {
    course_category_id: programme.course_category_id,
    name: programme.name,
    name_si: programme.name_si ?? '',
    description: programme.description ?? '',
    price: programme.price_cents > 0 ? fromCents(programme.price_cents) : '',
    currency: programme.currency || DEFAULT_CURRENCY,
    status: programme.status,
    // The form always needs somewhere to type; a course saved without topics
    // can't happen through this form, but old data shouldn't render an empty page.
    topics: topics.length > 0 ? topics : [emptyTopic()],
  };
}

/**
 * The reason the server gave for rejecting a lesson file — "under 512 MB",
 * "MP4 or MOV". Anything that isn't a 422 (a dropped connection, a 500) has no
 * message worth showing an admin, so the caller falls back to a generic one.
 */
function uploadFailureReason(error: unknown): string | null {
  const errors = getValidationErrors(error);
  return errors ? (Object.values(errors)[0]?.[0] ?? null) : null;
}

function indexVideos(programme: CourseProgramme): Record<number, CourseVideo> {
  const index: Record<number, CourseVideo> = {};
  for (const topic of programme.topics ?? []) {
    for (const video of topic.videos ?? []) index[video.id] = video;
  }
  return index;
}

export function CourseFormPage() {
  const { id } = useParams<{ id: string }>();
  const programmeId = id ? Number(id) : undefined;
  const isEditing = !!programmeId;
  const navigate = useNavigate();

  const { data: programme, isLoading: programmeLoading } = useCourseProgramme(programmeId);
  const { data: categories, isLoading: categoriesLoading } = useActiveCourseCategories();

  // Active categories, plus the one this course already sits in if it was switched off since.
  const categoryTree = useMemo(
    () => withCurrentCategory(categories ?? [], programme?.category),
    [categories, programme?.category],
  );

  const createCourse = useCreateCourseProgramme();
  const updateCourse = useUpdateCourseProgramme(programmeId ?? 0);
  const removeVideoFile = useDeleteCourseVideoFile();
  const uploadThumbnail = useUploadCourseThumbnail(programmeId ?? 0);
  const removeThumbnail = useDeleteCourseThumbnail(programmeId ?? 0);

  /** Files chosen but not uploaded yet, keyed by each video row's `client_key`. */
  const [stagedFiles, setStagedFiles] = useState<Record<string, StagedVideoFile>>({});
  /** Saved video records, so a row can show its uploaded file name/size/duration. */
  const [videoMeta, setVideoMeta] = useState<Record<number, CourseVideo>>({});

  /*
   * Lessons Bunny is still encoding. They become playable without anything
   * happening in this tab, so the rows are refreshed until they settle rather
   * than leaving the admin to guess when to reload.
   */
  const encodingVideoIds = useMemo(
    () =>
      Object.values(videoMeta)
        .filter((video) => video.processing_status === 'pending' || video.processing_status === 'processing')
        .map((video) => video.id),
    [videoMeta],
  );

  useVideoProcessingWatcher(encodingVideoIds, (video) => {
    setVideoMeta((current) => ({ ...current, [video.id]: video }));
  });
  const [collapsedTopics, setCollapsedTopics] = useState<Record<number, boolean>>({});
  const [previewVideo, setPreviewVideo] = useState<CourseVideo | null>(null);
  const [fileRemovalTarget, setFileRemovalTarget] = useState<CourseVideo | null>(null);
  const [uploads, setUploads] = useState<VideoUploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  /**
   * Course art. On an existing course it uploads the moment it is picked, like
   * the student photo. On a new one there is no id to attach it to yet, so the
   * file is held here with a local preview and sent once the save returns an id.
   */
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [stagedThumbnail, setStagedThumbnail] = useState<File | null>(null);
  const [stagedThumbnailPreview, setStagedThumbnailPreview] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CourseFormSchema>({
    resolver: zodResolver(courseFormSchema) as Resolver<CourseFormSchema>,
    defaultValues: blankCourse(),
    // Errors appear when the admin leaves a field, never mid-keystroke (CLAUDE.md §8).
    mode: 'onBlur',
    reValidateMode: 'onBlur',
  });

  const { fields: topicFields, append, remove, move } = useFieldArray({ control, name: 'topics' });

  /*
   * When the chosen category's courses are sold in a bundle — its own, or its
   * main category's when it follows that one — this course's price is its share
   * of the bundle total, not something anyone pays on its own. Say so.
   */
  const categoryId = useWatch({ control, name: 'course_category_id' });
  const bundleNote = useMemo(() => {
    for (const main of categoryTree) {
      const sub = main.children?.find((child) => child.id === categoryId);
      if (main.id !== categoryId && !sub) continue;

      const owner =
        sub && sub.selling_mode !== 'inherit'
          ? sub.selling_mode === 'bundle'
            ? sub
            : null
          : main.selling_mode === 'bundle'
            ? main
            : null;

      return owner
        ? `Sold in the ${owner.name} bundle — this price is added to the bundle total and isn't sold on its own. Free courses stay free.`
        : null;
    }
    return null;
  }, [categoryTree, categoryId]);

  // Hydrated once per course, not on every refetch: saving invalidates this
  // query, and re-running the reset would wipe the staged files still uploading
  // (and, more generally, throw away whatever the admin was mid-way through typing).
  const hydratedProgrammeId = useRef<number | null>(null);

  useEffect(() => {
    if (!programme || hydratedProgrammeId.current === programme.id) return;
    // Wait for the category list too: a Select handed a value before its options
    // exist has nothing to render the label from, so the field would read empty
    // even though the form holds the right id.
    if (categoriesLoading) return;
    hydratedProgrammeId.current = programme.id;

    reset(toFormValues(programme));
    setVideoMeta(indexVideos(programme));
    setStagedFiles({});
    setThumbnailUrl(programme.thumbnail_url);
    // Long courses open collapsed apart from the first topic, so the page starts
    // scannable instead of several screens tall.
    setCollapsedTopics(Object.fromEntries((programme.topics ?? []).map((_topic, index) => [index, index !== 0])));
  }, [programme, categoriesLoading, reset]);

  // Object URLs are revoked on replace/unmount so a long editing session doesn't leak them.
  useEffect(() => {
    return () => {
      if (stagedThumbnailPreview) URL.revokeObjectURL(stagedThumbnailPreview);
    };
  }, [stagedThumbnailPreview]);

  const saving = createCourse.isPending || updateCourse.isPending || isUploading;
  const busy = saving;
  const thumbnailBusy = uploadThumbnail.isPending || removeThumbnail.isPending;

  const pickThumbnail = (file: File) => {
    if (isEditing) {
      uploadThumbnail.mutate(file, { onSuccess: (updated) => setThumbnailUrl(updated.thumbnail_url) });
      return;
    }

    setStagedThumbnail(file);
    setStagedThumbnailPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(file);
    });
  };

  const clearThumbnail = () => {
    if (isEditing) {
      removeThumbnail.mutate(undefined, { onSuccess: () => setThumbnailUrl(null) });
      return;
    }

    setStagedThumbnail(null);
    setStagedThumbnailPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
  };

  const stageFile = (key: string, staged: StagedVideoFile | null) => {
    setStagedFiles((current) => {
      const next = { ...current };
      if (staged) next[key] = staged;
      else delete next[key];
      return next;
    });
  };

  const expandAll = () => setCollapsedTopics({});
  const collapseAll = () => setCollapsedTopics(Object.fromEntries(topicFields.map((_field, index) => [index, true])));

  const addTopic = () => {
    append({ ...emptyTopic(), videos: [emptyVideo()] });
    // The new topic lands last and should be open; reordering after this point
    // resets collapse state anyway, so index-keyed state stays truthful.
    setCollapsedTopics((current) => ({
      ...current,
      [topicFields.length]: false,
    }));
  };

  const buildPayload = (values: CourseFormSchema): CourseProgrammePayload => ({
    course_category_id: values.course_category_id,
    name: values.name,
    // Blank stays blank all the way to the column — null there is what the
    // student API reads as "fall back to English".
    name_si: values.name_si || null,
    description: values.description || null,
    // Empty means free. Converted here, once, from the decimal the admin typed.
    price_cents: toCents(values.price),
    currency: values.currency,
    status: values.status,
    topics: values.topics.map((topic) => ({
      id: topic.saved_id,
      title: topic.title,
      title_si: topic.title_si || null,
      description: topic.description || null,
      videos: topic.videos.map((video) => ({
        id: video.saved_id,
        title: video.title,
        title_si: video.title_si || null,
        duration_seconds: video.duration_seconds ?? null,
      })),
    })),
  });

  /**
   * Pairs each staged file with the video row the save just created. Order is the
   * contract: the backend stores `sort_order` from the submitted position and
   * returns topics and videos in that order, so position identifies the row.
   */
  const pendingUploads = (values: CourseFormSchema, saved: CourseProgramme) =>
    values.topics.flatMap((topic, topicIndex) =>
      topic.videos.flatMap((video, videoIndex) => {
        const staged = stagedFiles[video.client_key];
        const savedVideo = saved.topics?.[topicIndex]?.videos?.[videoIndex];
        return staged && savedVideo ? [{ clientKey: video.client_key, videoId: savedVideo.id, staged }] : [];
      }),
    );

  const runUploads = async (
    queue: ReturnType<typeof pendingUploads>,
  ): Promise<{ failed: number; reason: string | null }> => {
    setUploads(
      queue.map((item) => ({
        key: item.clientKey,
        name: item.staged.file.name,
        sizeBytes: item.staged.file.size,
        percent: 0,
        status: 'pending' as const,
      })),
    );
    setIsUploading(true);

    let failed = 0;
    let reason: string | null = null;

    // Sequential: parallel large uploads on a slow connection just starve each other.
    for (const item of queue) {
      const patch = (changes: Partial<VideoUploadItem>) =>
        setUploads((current) => current.map((row) => (row.key === item.clientKey ? { ...row, ...changes } : row)));

      patch({ status: 'uploading' });

      try {
        const uploaded = await uploadCourseVideoFile(item.videoId, item.staged.file, {
          durationSeconds: item.staged.durationSeconds,
          onProgress: (percent) => patch({ percent }),
        });

        setVideoMeta((current) => ({ ...current, [uploaded.id]: uploaded }));
        stageFile(item.clientKey, null);
        patch({ status: 'done', percent: 100 });
      } catch (error) {
        failed += 1;
        const message = uploadFailureReason(error);
        reason ??= message;
        patch({ status: 'error', error: message ?? undefined });
      }
    }

    setIsUploading(false);
    return { failed, reason };
  };

  const onSubmit = async (values: CourseFormSchema) => {
    let saved: CourseProgramme;

    try {
      const payload = buildPayload(values);
      saved = isEditing ? await updateCourse.mutateAsync(payload) : await createCourse.mutateAsync(payload);
    } catch (error) {
      // The backend reports nested rows as `topics.0.videos.1.title`, and this
      // form renders every level of that path, so the error can land on the input.
      const { applied, unmatched } = applyServerValidationErrors(error, setError, COURSE_FIELD_NAMES, {
        nested: true,
      });
      if (unmatched.length > 0) toast.error(unmatched[0]);
      else if (applied > 0) toast.error('Check the highlighted fields and try again.');
      return;
    }

    setVideoMeta(indexVideos(saved));

    // Staged only on create — there was no course id to attach it to until now.
    // A failed thumbnail must not read as a failed save, so it reports separately.
    if (stagedThumbnail) {
      try {
        const withThumbnail = await uploadCourseProgrammeThumbnail(saved.id, stagedThumbnail);
        setThumbnailUrl(withThumbnail.thumbnail_url);
        setStagedThumbnail(null);
      } catch {
        toast.error('Course saved, but the thumbnail could not be uploaded. Add it from the course page.');
      }
    }

    const queue = pendingUploads(values, saved);
    const { failed, reason } = queue.length > 0 ? await runUploads(queue) : { failed: 0, reason: null };
    setUploads([]);

    if (failed > 0) {
      // The reason, when the server gave one: "did not upload" alone leaves the
      // admin retrying the same too-large file with nothing to change.
      toast.error(
        `Course saved, but ${failed} ${failed === 1 ? 'video' : 'videos'} did not upload${reason ? `: ${reason}` : ''}. Try again below.`,
      );
      // Land on the edit page so the saved rows (and their ids) are reloaded and
      // the failed uploads can be retried without re-creating anything.
      navigate(paths.admin.courseEdit(saved.id), { replace: true });
      return;
    }

    toast.success(isEditing ? 'Course updated.' : 'Course created.');
    navigate(paths.admin.courses);
  };

  // Both queries, so the edit form is never painted with fields it is about to
  // fill in a moment later.
  if (isEditing && (programmeLoading || categoriesLoading)) return <PageLoader />;

  return (
    <div className="space-y-3">
      <Breadcrumbs
        items={[
          { label: 'Courses', href: paths.admin.courses },
          { label: isEditing ? (programme?.name ?? 'Course') : 'New course' },
        ]}
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold">{isEditing ? 'Edit course' : 'Add course'}</h1>
            <p className="text-sm text-muted-foreground">
              Pick a category and sub-category, name the programme, then add its topics and videos.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => navigate(paths.admin.courses)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              {isEditing ? 'Save changes' : 'Create course'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {/* Course details — sticky on desktop so they stay visible while
              working through a long topic list. */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-4">
              <FormSection icon={BookOpen} title="Course details" columns={2}>
                <Controller
                  control={control}
                  name="course_category_id"
                  render={({ field }) => (
                    <CourseCategoryFields
                      tree={categoryTree}
                      value={field.value ?? null}
                      onChange={(value) => field.onChange(value ?? undefined)}
                      onBlur={field.onBlur}
                      loading={categoriesLoading}
                      disabled={busy}
                      error={errors.course_category_id?.message}
                    />
                  )}
                />

                <div className="sm:col-span-2 space-y-1">
                  <FieldLabel htmlFor="course-name" icon={BookOpen} required>
                    Course programme name (English)
                  </FieldLabel>
                  <Input
                    id="course-name"
                    placeholder="e.g. Phase 1 — UAE Awareness & Reality Check"
                    aria-invalid={!!errors.name}
                    disabled={busy}
                    {...register('name')}
                  />
                  <FieldError message={errors.name?.message} />
                </div>

                {/* Optional throughout: students reading in Sinhala see the
                    English name until this is filled in, which is what lets the
                    catalogue be translated course by course. */}
                <div className="sm:col-span-2 space-y-1">
                  <FieldLabel htmlFor="course-name-si" icon={Languages}>
                    Course programme name (Sinhala)
                  </FieldLabel>
                  <Input
                    id="course-name-si"
                    placeholder="උදා. පළමු අදියර — එක්සත් අරාබි එමීර් රාජ්‍යය පිළිබඳ හැඳින්වීම"
                    aria-invalid={!!errors.name_si}
                    disabled={busy}
                    {...register('name_si')}
                  />
                  <FieldError message={errors.name_si?.message} />
                  <p className="text-xs text-muted-foreground">
                    Optional. Shown to students who use the app in Sinhala — they see the English
                    name until you add one.
                  </p>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <FieldLabel icon={ImageIcon}>Thumbnail</FieldLabel>
                  <ImageDropzone
                    label="Course thumbnail"
                    url={isEditing ? thumbnailUrl : stagedThumbnailPreview}
                    onSelect={pickThumbnail}
                    onRemove={clearThumbnail}
                    hint="PNG or JPG, up to 2MB · cropped to 16:9"
                    busy={thumbnailBusy}
                    disabled={busy}
                  />
                  <p className="text-xs text-muted-foreground">
                    {isEditing
                      ? 'Shown on the course card in the student app.'
                      : 'Uploads automatically once the course is created.'}
                  </p>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <FieldLabel htmlFor="course-description" icon={Tag}>
                    Summary
                  </FieldLabel>
                  <Textarea
                    id="course-description"
                    rows={3}
                    placeholder="One or two lines students see on the course card"
                    aria-invalid={!!errors.description}
                    disabled={busy}
                    {...register('description')}
                  />
                  <FieldError message={errors.description?.message} />
                </div>

                {/* Q&A paper lives on its own page — a paper can run to dozens of
                    questions, which has no business inside this form. Only offered
                    once the course exists, since the paper hangs off its id. */}
                {isEditing && (
                  <div className="sm:col-span-2 space-y-1">
                    <FieldLabel icon={ClipboardList}>Q&amp;A paper</FieldLabel>
                    <div className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-2">
                      <div className="min-w-0">
                        {programme?.paper ? (
                          <>
                            <p className="truncate text-[13px] font-medium">{programme.paper.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {programme.paper.questions_count ?? 0} questions · {programme.paper.pass_mark}% to pass
                            </p>
                          </>
                        ) : (
                          <>
                            <Badge variant="secondary">No paper</Badge>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Students see no questions after the videos.
                            </p>
                          </>
                        )}
                      </div>
                      <Button asChild type="button" size="xs" variant="outline" className="shrink-0">
                        <Link to={paths.admin.coursePaper(programmeId!)}>
                          {programme?.paper ? 'Edit paper' : 'Create paper'}
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}

                <div className="sm:col-span-2 space-y-1">
                  <FieldLabel htmlFor="course-price" icon={Wallet}>
                    Price
                  </FieldLabel>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-xs font-medium text-muted-foreground">
                      {DEFAULT_CURRENCY}
                    </span>
                    <Input
                      id="course-price"
                      inputMode="decimal"
                      placeholder="0.00"
                      aria-invalid={!!errors.price}
                      disabled={busy}
                      className="pl-11"
                      {...register('price')}
                    />
                  </div>
                  <FieldError message={errors.price?.message} />
                  <p className="text-xs text-muted-foreground">
                    {bundleNote ?? 'Leave blank for a free course — students get access as soon as they open it.'}
                  </p>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <FieldLabel icon={Tag} required>
                    Status
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <SegmentedToggle
                        label="Course status"
                        options={STATUS_OPTIONS}
                        value={field.value}
                        onChange={field.onChange}
                        invalid={!!errors.status}
                      />
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    Drafts stay hidden from students until you publish them.
                  </p>
                </div>
              </FormSection>
            </div>
          </div>

          {/* Topics */}
          <div className="space-y-2 lg:col-span-2">
            <div className="flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Layers className="size-3.5" />
                </span>
                <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Topics ({topicFields.length})
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={expandAll}
                  aria-label="Expand all topics"
                  title="Expand all"
                >
                  <ChevronsUpDown className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={collapseAll}
                  aria-label="Collapse all topics"
                  title="Collapse all"
                >
                  <ChevronsDownUp className="size-3.5" />
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={busy} onClick={addTopic}>
                  <Plus className="size-3.5" /> Add topic
                </Button>
              </div>
            </div>

            {errors.topics?.message && (
              <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {errors.topics.message}
              </p>
            )}

            <div className="space-y-2">
              {topicFields.map((field, index) => (
                <TopicCard
                  key={field.id}
                  index={index}
                  control={control}
                  register={register}
                  errors={errors}
                  open={!collapsedTopics[index]}
                  onToggleOpen={() =>
                    setCollapsedTopics((current) => ({
                      ...current,
                      [index]: !current[index],
                    }))
                  }
                  onMove={(direction) => {
                    move(index, index + direction);
                    // Collapse state is index-keyed, so reordering invalidates it.
                    setCollapsedTopics({});
                  }}
                  onRemove={() => {
                    remove(index);
                    setCollapsedTopics({});
                  }}
                  canMoveUp={index > 0}
                  canMoveDown={index < topicFields.length - 1}
                  videoMeta={videoMeta}
                  stagedFiles={stagedFiles}
                  onStageFile={stageFile}
                  onRemoveExistingFile={setFileRemovalTarget}
                  onPreview={setPreviewVideo}
                  disabled={busy}
                />
              ))}
            </div>

            <Button type="button" size="sm" variant="outline" className="w-full" disabled={busy} onClick={addTopic}>
              <Plus className="size-3.5" /> Add topic
            </Button>
          </div>
        </div>
      </form>

      <VideoPreviewDialog video={previewVideo} onOpenChange={(open) => !open && setPreviewVideo(null)} />

      <VideoUploadDialog items={uploads} open={isUploading} />

      <ConfirmDialog
        open={!!fileRemovalTarget}
        onOpenChange={(open) => !open && setFileRemovalTarget(null)}
        title="Remove this video file?"
        description={`The uploaded file for "${fileRemovalTarget?.title}" will be deleted. The video stays in the topic so you can upload a replacement.`}
        confirmLabel="Remove file"
        variant="destructive"
        isLoading={removeVideoFile.isPending}
        onConfirm={() => {
          if (!fileRemovalTarget) return;
          removeVideoFile.mutate(fileRemovalTarget.id, {
            onSuccess: (updated) => {
              setVideoMeta((current) => ({
                ...current,
                [updated.id]: updated,
              }));
              setFileRemovalTarget(null);
            },
          });
        }}
      />
    </div>
  );
}
