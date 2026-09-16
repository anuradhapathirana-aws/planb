import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Eye,
  Image as ImageIcon,
  Languages,
  Loader2,
  MessageSquareText,
  RotateCcw,
  Save,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldError, FieldLabel } from '@/components/shared/FormField';
import { FormSection } from '@/components/shared/FormSection';
import { ImageDropzone } from '@/components/shared/ImageDropzone';
import { PageLoader } from '@/components/shared/PageLoader';
import { SegmentedToggle } from '@/components/shared/SegmentedToggle';
import { IntroPreview } from '@/features/admin/settings/components/IntroPreview';
import {
  appIntroFormSchema,
  INTRO_ANIMATION_OPTIONS,
  type AppIntroFormSchema,
} from '@/features/admin/settings/companySettingsSchema';
import {
  useCompanySettings,
  useDeleteCompanyLogo,
  useUpdateAppIntro,
  useUploadCompanyLogo,
} from '@/features/admin/settings/hooks/useCompanySettings';
import { DEFAULT_LOGO } from '@/hooks/useBranding';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { applyServerValidationErrors } from '@shared/lib/serverErrors';

const FIELD_NAMES = [
  'intro_is_enabled',
  'intro_greeting_en',
  'intro_greeting_si',
  'intro_animation',
];

/**
 * Settings > App Intro — the Plan B logo, and the short greeting animation the
 * student app plays on every launch before Home or Sign in.
 *
 * The logo uploads immediately (it is its own endpoint); the greeting and
 * animation save with the button. The logo is also used in this admin panel's
 * sidebar and sign-in page.
 */
export function AppIntroPage() {
  const { data: settings, isLoading } = useCompanySettings();
  const update = useUpdateAppIntro();
  const uploadLogo = useUploadCompanyLogo();
  const deleteLogo = useDeleteCompanyLogo();
  const canEdit = useAuthStore((state) => state.hasRole('Super Admin', 'Content Manager'));

  const [replayKey, setReplayKey] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isDirty },
  } = useForm<AppIntroFormSchema>({
    resolver: zodResolver(appIntroFormSchema),
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: {
      intro_is_enabled: true,
      intro_greeting_en: '',
      intro_greeting_si: '',
      intro_animation: 'fade',
    },
  });

  useEffect(() => {
    if (!settings) return;

    reset({
      intro_is_enabled: settings.intro_is_enabled,
      intro_greeting_en: settings.intro_greeting_en ?? '',
      intro_greeting_si: settings.intro_greeting_si ?? '',
      intro_animation: settings.intro_animation,
    });
  }, [settings, reset]);

  const enabled = watch('intro_is_enabled');
  const animation = watch('intro_animation');
  const greetingEn = watch('intro_greeting_en');
  const greetingSi = watch('intro_greeting_si');

  const [previewLocale, setPreviewLocale] = useState<'en' | 'si'>('en');
  const previewGreeting =
    previewLocale === 'si' && greetingSi.trim() !== '' ? greetingSi : greetingEn;

  const submit = handleSubmit((form) => {
    update.mutate(
      {
        intro_is_enabled: form.intro_is_enabled,
        intro_greeting_en: form.intro_greeting_en.trim() || null,
        intro_greeting_si: form.intro_greeting_si.trim() || null,
        intro_animation: form.intro_animation,
      },
      {
        onError: (error) => {
          const { applied, unmatched } = applyServerValidationErrors(error, setError, FIELD_NAMES);
          if (unmatched.length > 0) toast.error(unmatched[0]);
          else if (applied > 0) toast.error('Check the highlighted fields and try again.');
        },
      },
    );
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">App intro</h1>
          <p className="text-sm text-muted-foreground">
            The logo and greeting students see each time they open the mobile app.
          </p>
        </div>

        {canEdit && (
          <Button size="sm" onClick={submit} disabled={update.isPending || !isDirty}>
            {update.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save changes
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <form onSubmit={submit} noValidate className="space-y-3">
          <fieldset disabled={!canEdit} className="space-y-3">
            <FormSection icon={ImageIcon} title="Plan B logo">
              <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center">
                <ImageDropzone
                  label="Plan B logo"
                  url={settings?.logo_url ?? null}
                  aspect="square"
                  acceptedTypes={['image/png', 'image/jpeg', 'image/webp']}
                  busy={uploadLogo.isPending || deleteLogo.isPending}
                  disabled={!canEdit}
                  hint="PNG, JPG or WebP, up to 2 MB"
                  className="w-36 shrink-0"
                  onSelect={(file) => uploadLogo.mutate(file)}
                  onRemove={() => deleteLogo.mutate()}
                />
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>
                    Upload a square logo, at least 512×512. A PNG with a transparent background
                    looks best.
                  </p>
                  <p>
                    Used on the app intro, the app sign-in screen, and this admin panel. With no
                    logo uploaded, the default Plan B logo is used.
                  </p>
                  <p>It saves as soon as you upload it.</p>
                </div>
              </div>
            </FormSection>

            <FormSection icon={Eye} title="Show intro">
              <div className="space-y-1 sm:col-span-2">
                <FieldLabel icon={Eye}>Play the intro when the app opens</FieldLabel>
                <SegmentedToggle
                  label="Play the intro when the app opens"
                  value={enabled ? 'on' : 'off'}
                  onChange={(value) =>
                    setValue('intro_is_enabled', value === 'on', {
                      shouldDirty: true,
                    })
                  }
                  options={[
                    { value: 'off', label: 'Off' },
                    { value: 'on', label: 'On' },
                  ]}
                />
                <p className="text-xs text-muted-foreground">
                  Plays for about 2 seconds. Students can tap to skip it.
                </p>
              </div>
            </FormSection>

            <FormSection icon={MessageSquareText} title="Greeting message">
              <div className="space-y-1 sm:col-span-2">
                <FieldLabel htmlFor="intro_greeting_en" icon={Languages}>
                  English
                </FieldLabel>
                <Input
                  id="intro_greeting_en"
                  placeholder="e.g. Welcome to Plan B International"
                  aria-invalid={!!errors.intro_greeting_en}
                  {...register('intro_greeting_en')}
                />
                <FieldError message={errors.intro_greeting_en?.message} />
                <p className="text-xs text-muted-foreground">
                  Optional. If empty, the intro shows only the logo.
                </p>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <FieldLabel htmlFor="intro_greeting_si" icon={Languages}>
                  Sinhala
                </FieldLabel>
                <Input
                  id="intro_greeting_si"
                  placeholder="e.g. Plan B International වෙත සාදරයෙන් පිළිගනිමු"
                  aria-invalid={!!errors.intro_greeting_si}
                  {...register('intro_greeting_si')}
                />
                <FieldError message={errors.intro_greeting_si?.message} />
                <p className="text-xs text-muted-foreground">
                  Optional. If empty, students using Sinhala see the English message.
                </p>
              </div>
            </FormSection>

            <FormSection icon={Sparkles} title="Animation">
              <div
                role="radiogroup"
                aria-label="Intro animation"
                className="grid grid-cols-2 gap-2 sm:col-span-2 xl:grid-cols-4"
              >
                {INTRO_ANIMATION_OPTIONS.map((option) => {
                  const selected = option.value === animation;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        setValue('intro_animation', option.value, {
                          shouldDirty: true,
                        });
                        setReplayKey((key) => key + 1);
                      }}
                      className={cn(
                        'min-h-11 rounded-md border px-3 py-2 text-left transition-colors',
                        'focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none',
                        'disabled:cursor-not-allowed disabled:opacity-60',
                        selected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'hover:bg-secondary/60',
                      )}
                    >
                      <p className={cn('text-sm font-medium', selected && 'text-primary')}>
                        {option.label}
                      </p>
                      <p className="text-[11px] leading-snug text-muted-foreground">
                        {option.hint}
                      </p>
                    </button>
                  );
                })}
              </div>
              <FieldError message={errors.intro_animation?.message} />
            </FormSection>
          </fieldset>
        </form>

        <div className="space-y-2 rounded-lg border p-3 lg:sticky lg:top-4 lg:self-start">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Smartphone className="size-3.5" />
              </span>
              <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Preview
              </span>
            </div>
            <Button size="xs" variant="outline" onClick={() => setReplayKey((key) => key + 1)}>
              <RotateCcw className="size-3.5" />
              Replay
            </Button>
          </div>

          <SegmentedToggle
            label="Preview language"
            value={previewLocale}
            onChange={setPreviewLocale}
            options={[
              { value: 'en', label: 'English' },
              { value: 'si', label: 'Sinhala' },
            ]}
          />

          {enabled ? (
            <IntroPreview
              logoUrl={settings?.logo_url ?? DEFAULT_LOGO}
              greeting={previewGreeting}
              animation={animation}
              replayKey={replayKey}
            />
          ) : (
            <p className="rounded-md bg-muted/40 p-2.5 text-xs text-muted-foreground">
              The intro is off. Students go straight to the Home or Sign-in screen.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
