import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Mail, Sparkles } from '@/components/icons';

import { colors } from '@shared/theme/tokens';
import { getValidationErrors } from '@shared/lib/serverErrors';
import { OTP_LENGTH, type RegisterValues } from '@shared/schemas/studentAuth';
import type { RequestCodeResponse, StudentSession } from '@shared/types/studentAuth';
import { requestRegistrationCode } from '@/api/auth.api';
import { errorMessage } from '@/api/client';
import { BrandMark } from '@/components/shared/BrandMark';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { RegisterCodeForm } from '@/features/auth/RegisterCodeForm';
import {
  EMPTY_REGISTER_DRAFT,
  RegisterDetailsForm,
  validateRegisterDraft,
  validateRegisterField,
  type RegisterDraft,
  type RegisterErrors,
} from '@/features/auth/RegisterDetailsForm';
import { RegisterStepper } from '@/features/auth/RegisterStepper';
import { useLeaveIfSignedIn } from '@/features/auth/useLeaveIfSignedIn';
import { useAppConfig } from '@/features/intro/useAppConfig';
import { GOOGLE_SIGN_IN_AVAILABLE } from '@/lib/googleAuth';
import { resetTo } from '@/lib/resetTo';
import { useStatusBarStyle } from '@/lib/useStatusBarStyle';
import { useAuthStore } from '@/stores/authStore';

/*
 * Required, not imported, and only when Google is usable in this build — see
 * the identical block in sign-in.tsx for why a static import would break
 * builds without Google configured.
 */
const GoogleSignInButton: typeof import('@/components/shared/GoogleSignInButton').GoogleSignInButton | null =
  GOOGLE_SIGN_IN_AVAILABLE
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/components/shared/GoogleSignInButton').GoogleSignInButton
    : null;

const FIELDS: readonly (keyof RegisterValues)[] = [
  'full_name',
  'email',
  'contact_number',
  'date_of_birth',
  'accept_terms',
];

type Step = { name: 'details' } | { name: 'code'; email: string; ticket: RequestCodeResponse };

/**
 * Sign up.
 *
 * The same navy-over-white shape as Sign in, so the two read as one flow: the
 * brand and a step tracker in the top band, the form in the thumb zone below.
 * Google sits first (one tap, and it can create the account on the spot); the
 * form below it asks for four details, then the code emailed to the student.
 * The account only exists once that code comes back (StudentRegistrationService).
 */
export default function RegisterScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const appConfig = useAppConfig();
  const leaving = useLeaveIfSignedIn();
  const signIn = useAuthStore((state) => state.signIn);

  useStatusBarStyle('light');

  const [step, setStep] = useState<Step>({ name: 'details' });
  const [draft, setDraft] = useState<RegisterDraft>(EMPTY_REGISTER_DRAFT);
  const [errors, setErrors] = useState<RegisterErrors>({});

  function change<K extends keyof RegisterDraft>(field: K, value: RegisterDraft[K]) {
    const next = { ...draft, [field]: value };
    setDraft(next);

    // A picked date or a tick is a finished choice, so check it now; typed
    // fields only clear here and are checked on blur.
    if (field === 'date_of_birth' || field === 'accept_terms') {
      setErrors((previous) => ({ ...previous, [field]: validateRegisterField(next, field) }));
    } else if (errors[field]) {
      setErrors((previous) => ({ ...previous, [field]: undefined }));
    }
  }

  function blur(field: keyof RegisterValues) {
    setErrors((previous) => ({ ...previous, [field]: validateRegisterField(draft, field) }));
  }

  const send = useMutation({
    mutationFn: (values: RegisterValues) => requestRegistrationCode(values),
    onSuccess: (ticket, values) => {
      // The same toast whether or not the address was already registered.
      toast.info(t('register.codeSent'));
      setStep({ name: 'code', email: values.email.trim().toLowerCase(), ticket });
    },
    onError: (error) => {
      const serverErrors = getValidationErrors(error);

      if (!serverErrors) {
        toast.error(errorMessage(error, t('common.genericError')));
        return;
      }

      const mapped: RegisterErrors = {};
      for (const [field, messages] of Object.entries(serverErrors)) {
        if (FIELDS.includes(field as keyof RegisterValues) && messages[0]) {
          mapped[field as keyof RegisterValues] = messages[0];
        }
      }

      setErrors(mapped);
      toast.error(t('register.fixErrors'));
    },
  });

  function submit() {
    const { values, errors: found } = validateRegisterDraft(draft);
    setErrors(found);

    if (!values) {
      toast.error(t('register.fixErrors'));
      return;
    }

    send.mutate(values);
  }

  async function registered(session: StudentSession) {
    await signIn(session.token, session.expires_at, session.student);
    toast.success(session.is_new_student ? t('auth.welcome') : t('auth.welcomeBack'));
    resetTo('/(tabs)');
  }

  if (leaving) return null;

  const onCode = step.name === 'code';

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand band */}
        <View className="overflow-hidden px-6 pb-8" style={{ paddingTop: insets.top + 8 }}>
          {/* A soft gold glow in the corner — depth without an image to load. */}
          <View
            pointerEvents="none"
            className="absolute -right-16 -top-10 h-56 w-56 rounded-full bg-accent opacity-10"
          />

          <View className="flex-row items-center justify-between">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              hitSlop={12}
              onPress={() => (onCode ? setStep({ name: 'details' }) : router.back())}
              className="-ml-2 h-11 w-11 items-center justify-center rounded-full active:bg-white/10"
            >
              <ChevronLeft size={24} color="#ffffff" />
            </Pressable>

            <View className="flex-row items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1">
              <Sparkles size={13} color={colors.accent} />
              <Text className="text-[11px] font-semibold uppercase tracking-wide text-accent">
                {t('register.eyebrow')}
              </Text>
            </View>
          </View>

          <View className="mt-4">
            <BrandMark logoUrl={appConfig.data?.logo_url} />
          </View>

          <Text className="mt-5 text-[26px] font-bold leading-9 text-white">
            {onCode ? t('register.codeTitle') : t('register.title')}
          </Text>
          <Text className="mt-2 text-[15px] leading-6 text-surface-muted">
            {step.name === 'code'
              ? t('register.codeSubtitle', {
                  length: OTP_LENGTH,
                  email: step.email,
                  minutes: Math.max(1, Math.round(step.ticket.expires_in_seconds / 60)),
                })
              : t('register.subtitle')}
          </Text>

          <View className="mt-6">
            <RegisterStepper current={onCode ? 1 : 0} />
          </View>
        </View>

        {/* Form sheet */}
        <View
          className="flex-1 rounded-t-[16px] bg-background px-6 pt-8"
          style={{ paddingBottom: insets.bottom + 24 }}
        >
          {step.name === 'code' ? (
            <>
              <View className="mb-6 h-14 w-14 items-center justify-center self-center rounded-2xl bg-accent-soft">
                <Mail size={26} color={colors.primary} />
              </View>

              <RegisterCodeForm
                email={step.email}
                resendAfterSeconds={step.ticket.resend_after_seconds}
                resend={() => {
                  const { values } = validateRegisterDraft(draft);
                  // The draft already passed to get here; this only satisfies the type.
                  return values ? requestRegistrationCode(values) : Promise.reject(new Error('invalid'));
                }}
                onBack={() => setStep({ name: 'details' })}
                onRegistered={registered}
              />
            </>
          ) : (
            <>
              {GoogleSignInButton ? (
                <>
                  <GoogleSignInButton disabled={send.isPending} />

                  <View className="my-6 flex-row items-center gap-3">
                    <View className="h-px flex-1 bg-border" />
                    <Text variant="caption">{t('register.orEmail')}</Text>
                    <View className="h-px flex-1 bg-border" />
                  </View>
                </>
              ) : null}

              <RegisterDetailsForm
                draft={draft}
                errors={errors}
                submitting={send.isPending}
                onChange={change}
                onBlurField={blur}
                onSubmit={submit}
              />

              <View className="mt-6 flex-row flex-wrap items-center justify-center gap-x-1 border-t border-border pt-5">
                <Text variant="caption">{t('register.haveAccount')}</Text>
                <Pressable
                  accessibilityRole="link"
                  hitSlop={10}
                  onPress={() => (router.canGoBack() ? router.back() : router.replace('/sign-in'))}
                  className="min-h-[44px] justify-center px-1"
                >
                  <Text className="text-[13px] font-semibold text-primary">{t('register.signIn')}</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
