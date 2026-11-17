import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { BarChart3, Hash, Info, Languages, Loader2, Save, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { FieldError, FieldLabel } from '@/components/shared/FormField';
import { applyServerValidationErrors } from '@shared/lib/serverErrors';
import { useCompanySettings } from '@/features/admin/settings/hooks/useCompanySettings';
import { useUpdateHeroFigures } from '@/features/admin/website/hooks/useWebsiteContent';
import {
  HERO_FIGURE_ROWS,
  heroFiguresFormSchema,
  type HeroFiguresFormSchema,
} from '@/features/admin/website/websiteSchema';
import type { HeroFigure } from '@shared/types/companySettings';

/**
 * What the website shows while no strip has ever been saved — a copy of
 * `heroFigures` in `site/src/features/marketing/homeContent.ts`. Shown here so
 * the admin starts from what visitors currently see, not from four blank rows
 * that make the strip look unused.
 */
const WEBSITE_SAMPLE_FIGURES: HeroFigure[] = [
  { value: '500+', label: 'Students guided', label_si: null },
  { value: '12+', label: 'Professions covered', label_si: null },
  { value: '40+', label: 'Checklist steps to the UAE', label_si: null },
  { value: '2', label: 'Languages: English & Sinhala', label_si: null },
];

const PLACEHOLDERS = [
  { value: 'e.g. 500+', label: 'e.g. Students guided', label_si: 'උදා. මඟ පෙන්වූ සිසුන්' },
  { value: 'e.g. 12+', label: 'e.g. Professions covered', label_si: 'උදා. වෘත්තීන්' },
  { value: 'e.g. 95%', label: 'e.g. Visa success rate', label_si: 'උදා. වීසා සාර්ථකත්වය' },
  { value: 'e.g. 2', label: 'e.g. Languages', label_si: 'උදා. භාෂා' },
];

/** Always four rows: stored figures first, then blanks. */
function toFormRows(figures: HeroFigure[]): HeroFiguresFormSchema['figures'] {
  return Array.from({ length: HERO_FIGURE_ROWS }, (_, index) => ({
    value: figures[index]?.value ?? '',
    label: figures[index]?.label ?? '',
    label_si: figures[index]?.label_si ?? '',
  }));
}

/**
 * Website Configuration > Hero slider > Figures strip.
 *
 * The row of figures along the bottom of the website's hero. **Shared by every
 * slide**, which is why it is edited here on the list page and not inside a
 * slide's form. It lives on the `company_settings` singleton and reuses that
 * query, like the About video page.
 *
 * A blank row is simply not shown, so the strip can carry one to four figures.
 * Blanking all four hides the strip.
 */
export function HeroFiguresCard() {
  const { data: settings, isLoading } = useCompanySettings();
  const save = useUpdateHeroFigures();

  const neverSaved = settings !== undefined && settings.hero_figures === null;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<HeroFiguresFormSchema>({
    resolver: zodResolver(heroFiguresFormSchema),
    // Never mid-keystroke (CLAUDE.md §8 "Sectioned Admin Forms").
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: { figures: toFormRows([]) },
  });

  useEffect(() => {
    if (!settings) return;
    reset({ figures: toFormRows(settings.hero_figures ?? WEBSITE_SAMPLE_FIGURES) });
  }, [settings, reset]);

  const submit = handleSubmit((form) => {
    const blankToNull = (value: string) => value.trim() || null;

    save.mutate(
      {
        figures: form.figures.map((figure) => ({
          value: blankToNull(figure.value),
          label: blankToNull(figure.label),
          label_si: blankToNull(figure.label_si),
        })),
      },
      {
        onError: (error) => {
          const { applied, unmatched } = applyServerValidationErrors(error, setError, ['figures'], {
            nested: true,
          });
          if (unmatched.length > 0) toast.error(unmatched[0]);
          else if (applied > 0) toast.error('Check the highlighted figures and try again.');
        },
      },
    );
  });

  if (isLoading) return <Skeleton className="h-56" />;

  return (
    <form onSubmit={submit} noValidate className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <BarChart3 className="size-3.5" />
            </span>
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Figures strip
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            The row of figures along the bottom of the banner. The same on every slide. Leave a
            figure blank to hide it.
          </p>
        </div>

        <Button type="submit" size="sm" disabled={save.isPending || (!isDirty && !neverSaved)}>
          {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save figures
        </Button>
      </div>

      {neverSaved && (
        <p className="flex items-start gap-1.5 rounded-md bg-primary/5 p-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
          These are the website’s sample figures. Replace them with Plan B’s real numbers and save.
        </p>
      )}

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: HERO_FIGURE_ROWS }, (_, index) => {
          const rowErrors = errors.figures?.[index];
          const placeholder = PLACEHOLDERS[index];

          return (
            <fieldset key={index} className="space-y-2 rounded-md bg-secondary/40 p-2.5">
              <legend className="sr-only">Figure {index + 1}</legend>
              <p className="text-[11px] font-semibold text-muted-foreground" aria-hidden="true">
                Figure {index + 1}
              </p>

              <div className="space-y-1">
                <FieldLabel htmlFor={`figure-${index}-value`} icon={Hash}>
                  Number
                </FieldLabel>
                <Input
                  id={`figure-${index}-value`}
                  placeholder={placeholder?.value}
                  aria-invalid={!!rowErrors?.value}
                  {...register(`figures.${index}.value`)}
                />
                <FieldError message={rowErrors?.value?.message} />
              </div>

              <div className="space-y-1">
                <FieldLabel htmlFor={`figure-${index}-label`} icon={Type}>
                  What it counts
                </FieldLabel>
                <Input
                  id={`figure-${index}-label`}
                  placeholder={placeholder?.label}
                  aria-invalid={!!rowErrors?.label}
                  {...register(`figures.${index}.label`)}
                />
                <FieldError message={rowErrors?.label?.message} />
              </div>

              <div className="space-y-1">
                <FieldLabel htmlFor={`figure-${index}-label-si`} icon={Languages}>
                  What it counts (Sinhala)
                </FieldLabel>
                <Input
                  id={`figure-${index}-label-si`}
                  placeholder={placeholder?.label_si}
                  aria-invalid={!!rowErrors?.label_si}
                  {...register(`figures.${index}.label_si`)}
                />
                <FieldError message={rowErrors?.label_si?.message} />
              </div>
            </fieldset>
          );
        })}
      </div>
    </form>
  );
}
