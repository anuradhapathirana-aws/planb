import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Controller, useFieldArray, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  ChevronsDownUp,
  ChevronsUpDown,
  ClipboardList,
  FileText,
  Loader2,
  Lock,
  Percent,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { FieldError, FieldLabel } from '@/components/shared/FormField';
import { FormSection } from '@/components/shared/FormSection';
import { PageLoader } from '@/components/shared/PageLoader';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import { QuestionCard } from '@/features/admin/courses/components/QuestionCard';
import {
  coursePaperFormSchema,
  emptyQuestion,
  DEFAULT_PASS_MARK,
  type CoursePaperFormSchema,
} from '@/features/admin/courses/coursePaperSchema';
import {
  useCoursePaper,
  useDeleteCoursePaper,
  useSaveCoursePaper,
} from '@/features/admin/courses/hooks/useCoursePaper';
import { useCourseProgramme } from '@/features/admin/courses/hooks/useCourses';
import { newClientKey } from '@/lib/clientKey';
import { applyServerValidationErrors } from '@/lib/serverErrors';
import { paths } from '@/routes/paths';
import type { CoursePaper, CoursePaperPayload } from '@/types/course';

const PAPER_FIELD_NAMES = Object.keys(coursePaperFormSchema.shape);

function blankPaper(programmeName?: string): CoursePaperFormSchema {
  return {
    title: programmeName ? `${programmeName} — Question paper` : '',
    instructions: '',
    pass_mark: DEFAULT_PASS_MARK,
    max_attempts: null,
    requires_all_videos_watched: true,
    questions: [emptyQuestion()],
  };
}

function toFormValues(paper: CoursePaper): CoursePaperFormSchema {
  return {
    title: paper.title,
    instructions: paper.instructions ?? '',
    pass_mark: paper.pass_mark,
    max_attempts: paper.max_attempts,
    requires_all_videos_watched: paper.requires_all_videos_watched,
    questions: (paper.questions ?? []).map((question) => ({
      client_key: newClientKey(),
      saved_id: question.id,
      text: question.text,
      type: question.type,
      options: question.options.map((option) => ({
        client_key: newClientKey(),
        saved_id: option.id,
        text: option.text,
        is_correct: option.is_correct,
      })),
    })),
  };
}

export function CoursePaperPage() {
  const { id } = useParams<{ id: string }>();
  const programmeId = Number(id);
  const navigate = useNavigate();

  const { data: programme, isLoading: programmeLoading } = useCourseProgramme(programmeId);
  const { data: paper, isLoading: paperLoading } = useCoursePaper(programmeId);

  const savePaper = useSaveCoursePaper(programmeId);
  const deletePaper = useDeleteCoursePaper(programmeId);

  const [collapsedQuestions, setCollapsedQuestions] = useState<Record<number, boolean>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    setError,
    formState: { errors },
  } = useForm<CoursePaperFormSchema>({
    resolver: zodResolver(coursePaperFormSchema) as Resolver<CoursePaperFormSchema>,
    defaultValues: blankPaper(),
    mode: 'onBlur',
    reValidateMode: 'onBlur',
  });

  const { fields: questionFields, append, remove, move } = useFieldArray({ control, name: 'questions' });

  // Hydrated once, so saving (which invalidates these queries) can't wipe what
  // the admin is part-way through typing.
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current || paperLoading || programmeLoading) return;
    hydrated.current = true;

    if (paper) {
      reset(toFormValues(paper));
      // A long paper opens collapsed apart from the first question.
      setCollapsedQuestions(
        Object.fromEntries((paper.questions ?? []).map((_question, index) => [index, index !== 0])),
      );
    } else {
      reset(blankPaper(programme?.name));
    }
  }, [paper, paperLoading, programme, programmeLoading, reset]);

  const busy = savePaper.isPending || deletePaper.isPending;
  const paperExists = !!paper;

  const addQuestion = () => {
    append(emptyQuestion());
    setCollapsedQuestions((current) => ({ ...current, [questionFields.length]: false }));
  };

  const expandAll = () => setCollapsedQuestions({});
  const collapseAll = () =>
    setCollapsedQuestions(Object.fromEntries(questionFields.map((_field, index) => [index, true])));

  const onSubmit = (values: CoursePaperFormSchema) => {
    const payload: CoursePaperPayload = {
      title: values.title,
      instructions: values.instructions || null,
      pass_mark: values.pass_mark,
      max_attempts: values.max_attempts,
      requires_all_videos_watched: values.requires_all_videos_watched,
      questions: values.questions.map((question) => ({
        id: question.saved_id,
        text: question.text,
        type: question.type,
        options: question.options.map((option) => ({
          id: option.saved_id,
          text: option.text,
          is_correct: option.is_correct,
        })),
      })),
    };

    savePaper.mutate(payload, {
      onSuccess: (saved) => {
        // Re-seed with the saved ids so a second save updates rows instead of
        // recreating them, and stay on the page rather than bouncing the admin out.
        reset(toFormValues(saved));
        setCollapsedQuestions({});
      },
      onError: (error) => {
        const { applied, unmatched } = applyServerValidationErrors(error, setError, PAPER_FIELD_NAMES, {
          nested: true,
        });
        if (unmatched.length > 0) toast.error(unmatched[0]);
        else if (applied > 0) toast.error('Check the highlighted questions and try again.');
      },
    });
  };

  if (programmeLoading || paperLoading) return <PageLoader />;

  return (
    <div className="space-y-3">
      <Breadcrumbs
        items={[
          { label: 'Courses', href: paths.admin.courses },
          { label: programme?.name ?? 'Course', href: paths.admin.courseEdit(programmeId) },
          { label: 'Question paper' },
        ]}
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-xl font-semibold">
              Question paper
              <Badge variant={paperExists ? 'success' : 'secondary'}>
                {paperExists ? `${paper.questions_count ?? paper.questions?.length ?? 0} questions` : 'Not created yet'}
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              Students answer this after finishing every video in this course. No paper means no questions are shown.
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            {paperExists && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setConfirmDelete(true)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-3.5" /> Delete paper
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => navigate(paths.admin.courseEdit(programmeId))}
            >
              Back to course
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              {paperExists ? 'Save paper' : 'Create paper'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {/* Paper settings — sticky on desktop so the rules stay visible while
              working down a long question list. */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-4">
              <FormSection icon={ClipboardList} title="Paper settings" columns={2}>
                <div className="sm:col-span-2 space-y-1">
                  <FieldLabel htmlFor="paper-title" icon={ClipboardList} required>
                    Paper title
                  </FieldLabel>
                  <Input
                    id="paper-title"
                    placeholder="e.g. Phase 1 — Final assessment"
                    aria-invalid={!!errors.title}
                    disabled={busy}
                    {...register('title')}
                  />
                  <FieldError message={errors.title?.message} />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <FieldLabel icon={FileText}>Instructions</FieldLabel>
                  <Controller
                    control={control}
                    name="instructions"
                    render={({ field }) => (
                      <RichTextEditor
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        invalid={!!errors.instructions}
                        placeholder="What students should know before they start."
                      />
                    )}
                  />
                  <FieldError message={errors.instructions?.message} />
                </div>

                <div className="space-y-1">
                  <FieldLabel htmlFor="pass-mark" icon={Percent} required>
                    Pass mark
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      id="pass-mark"
                      type="number"
                      min={1}
                      max={100}
                      placeholder="70"
                      aria-invalid={!!errors.pass_mark}
                      disabled={busy}
                      className="pr-7"
                      {...register('pass_mark')}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground">
                      %
                    </span>
                  </div>
                  <FieldError message={errors.pass_mark?.message} />
                </div>

                <div className="space-y-1">
                  <FieldLabel htmlFor="max-attempts" icon={RefreshCw}>
                    Retry limit
                  </FieldLabel>
                  <Input
                    id="max-attempts"
                    type="number"
                    min={1}
                    max={100}
                    placeholder="Unlimited"
                    aria-invalid={!!errors.max_attempts}
                    disabled={busy}
                    {...register('max_attempts')}
                  />
                  <FieldError message={errors.max_attempts?.message} />
                  <p className="text-xs text-muted-foreground">Leave blank for unlimited retries.</p>
                </div>

                <div className="sm:col-span-2 flex items-start justify-between gap-3 rounded-md border px-2.5 py-2">
                  <div className="min-w-0">
                    <Label htmlFor="requires-videos" className="text-xs">
                      <Lock className="size-3.5 text-muted-foreground" />
                      Lock until all videos watched
                    </Label>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Students must finish every video in this course before the paper opens.
                    </p>
                  </div>
                  <Controller
                    control={control}
                    name="requires_all_videos_watched"
                    render={({ field }) => (
                      <Switch
                        id="requires-videos"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={busy}
                        className="mt-0.5 shrink-0"
                      />
                    )}
                  />
                </div>
              </FormSection>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-2 lg:col-span-2">
            <div className="flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <ClipboardList className="size-3.5" />
                </span>
                <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Questions ({questionFields.length})
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={expandAll}
                  aria-label="Expand all questions"
                  title="Expand all"
                >
                  <ChevronsUpDown className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={collapseAll}
                  aria-label="Collapse all questions"
                  title="Collapse all"
                >
                  <ChevronsDownUp className="size-3.5" />
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={busy} onClick={addQuestion}>
                  <Plus className="size-3.5" /> Add question
                </Button>
              </div>
            </div>

            {errors.questions?.message && (
              <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {errors.questions.message}
              </p>
            )}

            <div className="space-y-2">
              {questionFields.map((field, index) => (
                <QuestionCard
                  key={field.id}
                  index={index}
                  control={control}
                  register={register}
                  setValue={setValue}
                  getValues={getValues}
                  errors={errors}
                  open={!collapsedQuestions[index]}
                  onToggleOpen={() => setCollapsedQuestions((current) => ({ ...current, [index]: !current[index] }))}
                  onMove={(direction) => {
                    move(index, index + direction);
                    // Collapse state is index-keyed, so reordering invalidates it.
                    setCollapsedQuestions({});
                  }}
                  onRemove={() => {
                    remove(index);
                    setCollapsedQuestions({});
                  }}
                  canMoveUp={index > 0}
                  canMoveDown={index < questionFields.length - 1}
                  disabled={busy}
                />
              ))}
            </div>

            <Button type="button" size="sm" variant="outline" className="w-full" disabled={busy} onClick={addQuestion}>
              <Plus className="size-3.5" /> Add question
            </Button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this question paper?"
        description="Every question and answer on it will be removed, and students will no longer see a paper after this course's videos. This cannot be undone."
        confirmLabel="Delete paper"
        variant="destructive"
        isLoading={deletePaper.isPending}
        onConfirm={() =>
          deletePaper.mutate(undefined, {
            onSuccess: () => {
              setConfirmDelete(false);
              navigate(paths.admin.courseEdit(programmeId));
            },
          })
        }
      />
    </div>
  );
}
