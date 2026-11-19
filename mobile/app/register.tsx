import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from '@/components/icons';

import { colors } from '@shared/theme/tokens';
import { getValidationErrors } from '@shared/lib/serverErrors';
import { OTP_LENGTH, type RegisterValues } from '@shared/schemas/studentAuth';
import type { RequestCodeResponse, StudentSession } from '@shared/types/studentAuth';
import { requestRegistrationCode } from '@/api/auth.api';
import { errorMessage } from '@/api/client';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { AuthBackdrop, GlassCard } from '@/features/auth/AuthBackdrop';
import { RegisterCodeForm } from '@/features/auth/RegisterCodeForm';
import {
  EMPTY_REGISTER_DRAFT,
  RegisterDetailsForm,
  validateRegisterDraft,
  validateRegisterField,
  type RegisterDraft,
  type RegisterErrors,
} from '@/features/auth/RegisterDetailsForm';
import { useLeaveIfSignedIn } from '@/features/auth/useLeaveIfSignedIn';
import { GOOGLE_SIGN_IN_AVAILABLE } from '@/lib/googleAuth';
import { resetTo } from '@/lib/resetTo';
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

interface CodeStep {
  email: string;
  ticket: RequestCodeResponse;
}

/**
 * Sign up.
 *
 * The same photo-and-glass shape as Sign in, so the two read as one flow, and
 * sized to fit one phone screen: no brand band or step tracker above the form,
 * placeholders in place of field labels, hints only while a field is focused.
 *
 * Four details, then the code emailed to the student in a sheet over the form —
 * closing the sheet goes back to the details, still filled in. The account only
 * exists once that code comes back (StudentRegistrationService). Google, as an
 * icon under the form, creates the account in one tap instead.
 */
export default function RegisterScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const leaving = useLeaveIfSignedIn();
  const signIn = useAuthStore((state) => state.signIn);

  const [codeStep, setCodeStep] = useState<CodeStep | null>(null);
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
      setCodeStep({ email: values.email.trim().toLowerCase(), ticket });
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
    // Replacing the stack unmounts this screen, and the code sheet with it.
    resetTo('/(tabs)');
  }

  if (leaving) return null;

  return (
    <AuthBackdrop>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        hitSlop={12}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/sign-in'))}
        className="-ml-2 h-11 w-11 items-center justify-center rounded-full active:bg-white/10"
      >
        <ChevronLeft size={24} color={colors['primary-foreground']} />
      </Pressable>

      {/*
        Free space is split evenly above the title and below the sign-in link,
        so the title and form card sit together in the middle of the screen.
      */}
      <View className="min-h-[8px] flex-1" />

      <View className="items-center">
        <Text
          variant="none"
          accessibilityRole="header"
          className="text-center text-[28px] font-medium leading-[40px] text-white"
        >
          {t('register.title')}
        </Text>
        <Text
          variant="none"
          className="text-center text-[13px] font-normal leading-5 text-surface-foreground"
        >
          {t('register.heroSubtitle')}
        </Text>
      </View>

      <View className="h-14" />

      <GlassCard className="pt-3">
        <RegisterDetailsForm
          draft={draft}
          errors={errors}
          submitting={send.isPending}
          onChange={change}
          onBlurField={blur}
          onSubmit={submit}
        />

        {GoogleSignInButton ? (
          <View className="mt-4 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-white/25" />
            <Text
              variant="none"
              className="text-[12px] font-normal leading-5 text-surface-foreground"
            >
              {t('auth.orContinueWith')}
            </Text>
            <GoogleSignInButton disabled={send.isPending} iconOnly />
            <View className="h-px flex-1 bg-white/25" />
          </View>
        ) : null}
      </GlassCard>

      <View className="mt-2 flex-row flex-wrap items-center justify-center gap-x-1">
        <Text
          variant="none"
          className="text-[13px] font-normal leading-[22px] text-surface-foreground"
        >
          {t('register.haveAccount')}
        </Text>
        <Pressable
          accessibilityRole="link"
          hitSlop={10}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/sign-in'))}
          className="min-h-[44px] justify-center px-1"
        >
          <Text variant="none" className="text-[13px] font-semibold leading-[22px] text-accent">
            {t('register.signIn')}
          </Text>
        </Pressable>
      </View>

      <View className="min-h-[8px] flex-1" />

      <Sheet
        visible={codeStep !== null}
        title={t('register.codeTitle')}
        description={
          codeStep
            ? t('register.codeSubtitle', {
                length: OTP_LENGTH,
                email: codeStep.email,
                minutes: Math.max(1, Math.round(codeStep.ticket.expires_in_seconds / 60)),
              })
            : undefined
        }
        onClose={() => setCodeStep(null)}
        avoidKeyboard
      >
        {codeStep ? (
          <RegisterCodeForm
            key={codeStep.email}
            email={codeStep.email}
            resendAfterSeconds={codeStep.ticket.resend_after_seconds}
            resend={() => {
              const { values } = validateRegisterDraft(draft);
              // The draft already passed to get here; this only satisfies the type.
              return values ? requestRegistrationCode(values) : Promise.reject(new Error('invalid'));
            }}
            onRegistered={registered}
          />
        ) : null}
      </Sheet>
    </AuthBackdrop>
  );
}
