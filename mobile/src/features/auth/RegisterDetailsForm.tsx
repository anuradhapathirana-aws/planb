import { View } from 'react-native';
import { Trans, useTranslation } from 'react-i18next';
import { Mail, Phone, ShieldCheck, User } from '@/components/icons';

import { colors } from '@shared/theme/tokens';
import {
  latestRegisterBirthDate,
  REGISTER_EARLIEST_BIRTH_DATE,
  registerSchema,
  type RegisterValues,
} from '@shared/schemas/studentAuth';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { DateField } from '@/components/ui/DateField';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { useLegalLinks } from '@/features/legal/useLegalLinks';
import { openExternalUrl } from '@/lib/webBrowser';
import { cn } from '@/lib/cn';

export type RegisterErrors = Partial<Record<keyof RegisterValues, string>>;

/** The form as it is being edited — the date is null until one is picked. */
export type RegisterDraft = Omit<RegisterValues, 'date_of_birth'> & { date_of_birth: string | null };

export const EMPTY_REGISTER_DRAFT: RegisterDraft = {
  full_name: '',
  email: '',
  contact_number: '',
  date_of_birth: null,
  accept_terms: false,
};

/** One field against the shared schema, for validate-on-blur. */
export function validateRegisterField(draft: RegisterDraft, field: keyof RegisterValues): string | undefined {
  const result = registerSchema.shape[field].safeParse(draft[field] ?? '');

  return result.success ? undefined : result.error.issues[0]?.message;
}

/** Every field at once, for submit. `values` is only set when all of them pass. */
export function validateRegisterDraft(draft: RegisterDraft): {
  values?: RegisterValues;
  errors: RegisterErrors;
} {
  const result = registerSchema.safeParse({ ...draft, date_of_birth: draft.date_of_birth ?? '' });

  if (result.success) return { values: result.data, errors: {} };

  const errors: RegisterErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof RegisterValues | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }

  return { errors };
}

/** `yyyy-mm-dd` → a local-time Date, never through UTC (see DateField). */
function localDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);

  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

/**
 * Step one of signing up: four details and the terms.
 *
 * Controlled by the screen, not by itself, so going back from the code step
 * finds everything still filled in. Errors appear on blur and clear on edit —
 * never re-checked per keystroke (root CLAUDE.md §8).
 */
export function RegisterDetailsForm({
  draft,
  errors,
  submitting,
  onChange,
  onBlurField,
  onSubmit,
}: {
  draft: RegisterDraft;
  errors: RegisterErrors;
  submitting: boolean;
  onChange: <K extends keyof RegisterDraft>(field: K, value: RegisterDraft[K]) => void;
  onBlurField: (field: keyof RegisterValues) => void;
  onSubmit: () => void;
}) {
  const { t } = useTranslation();
  const legal = useLegalLinks();

  return (
    <View className="gap-4">
      <Input
        label={t('register.fullName')}
        placeholder={t('register.fullNamePlaceholder')}
        hint={t('register.fullNameHint')}
        value={draft.full_name}
        onChangeText={(value) => onChange('full_name', value)}
        onBlur={() => onBlurField('full_name')}
        error={errors.full_name}
        icon={User}
        required
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        maxLength={120}
        editable={!submitting}
      />

      <Input
        label={t('register.email')}
        placeholder={t('register.emailPlaceholder')}
        value={draft.email}
        onChangeText={(value) => onChange('email', value)}
        onBlur={() => onBlurField('email')}
        error={errors.email}
        icon={Mail}
        required
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        maxLength={255}
        editable={!submitting}
      />

      <Input
        label={t('register.contactNumber')}
        placeholder={t('register.contactNumberPlaceholder')}
        hint={t('register.contactNumberHint')}
        value={draft.contact_number}
        onChangeText={(value) => onChange('contact_number', value)}
        onBlur={() => onBlurField('contact_number')}
        error={errors.contact_number}
        icon={Phone}
        required
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        maxLength={24}
        editable={!submitting}
      />

      <DateField
        label={t('register.dateOfBirth')}
        placeholder={t('register.dateOfBirthPlaceholder')}
        hint={t('register.dateOfBirthHint')}
        value={draft.date_of_birth}
        onChange={(value) => onChange('date_of_birth', value)}
        error={errors.date_of_birth}
        minimumDate={localDate(REGISTER_EARLIEST_BIRTH_DATE)}
        maximumDate={localDate(latestRegisterBirthDate())}
      />

      {/*
        A plain View, not a Pressable: wrapping the Checkbox in a second
        touchable would read out as two checkboxes, and would swallow the
        presses on the two links inside the sentence.
      */}
      <View>
        <View
          className={cn(
            'flex-row items-center gap-1 rounded-lg border py-1 pl-1 pr-3',
            errors.accept_terms
              ? 'border-destructive'
              : draft.accept_terms
                ? 'border-primary/40 bg-primary-soft'
                : 'border-border bg-card',
          )}
        >
          <Checkbox
            checked={draft.accept_terms}
            onChange={(value) => onChange('accept_terms', value)}
            accessibilityLabel={t('register.acceptTerms').replace(/<\/?\w+>/g, '')}
          />
          {/* Nested `Text` presses are how inline links work in RN. */}
          <Text variant="caption" className="flex-1 leading-5">
            <Trans
              i18nKey="register.acceptTerms"
              components={{
                terms: (
                  <Text
                    variant="caption"
                    accessibilityRole="link"
                    className="font-medium text-primary underline"
                    onPress={() => void openExternalUrl(legal.termsUrl)}
                  />
                ),
                privacy: (
                  <Text
                    variant="caption"
                    accessibilityRole="link"
                    className="font-medium text-primary underline"
                    onPress={() => void openExternalUrl(legal.privacyUrl)}
                  />
                ),
              }}
            />
          </Text>
        </View>

        {errors.accept_terms ? (
          <Text className="mt-1.5 text-[13px] leading-5 text-destructive">{errors.accept_terms}</Text>
        ) : null}
      </View>

      <Button
        label={t('register.submit')}
        size="lg"
        fullWidth
        className="mt-1"
        loading={submitting}
        onPress={onSubmit}
      />

      <View className="flex-row items-center justify-center gap-1.5">
        <ShieldCheck size={14} color={colors.success} />
        <Text variant="caption" className="text-center leading-5">
          {t('register.noPassword')}
        </Text>
      </View>
    </View>
  );
}
