import { View } from 'react-native';
import { Trans, useTranslation } from 'react-i18next';
import { Mail, Phone, User } from '@/components/icons';

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
 * Drawn for the glass card on the photo-backed Create Account screen: underline
 * fields whose placeholder names them, and hints that appear only on focus, so
 * the whole form fits one phone screen (client request) without losing the help.
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
    <View className="gap-2">
      <Input
        label={t('register.fullName')}
        tone="glass"
        placeholder={t('register.fullName')}
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
        tone="glass"
        placeholder={t('register.email')}
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
        tone="glass"
        placeholder={t('register.contactNumber')}
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
        tone="glass"
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
        <View className="-ml-2.5 flex-row items-center">
          <Checkbox
            checked={draft.accept_terms}
            onChange={(value) => onChange('accept_terms', value)}
            accessibilityLabel={t('register.acceptTerms').replace(/<\/?\w+>/g, '')}
          />
          {/* Nested `Text` presses are how inline links work in RN. */}
          <Text
            variant="none"
            className={cn(
              'flex-1 text-[13px] font-normal leading-5',
              errors.accept_terms ? 'text-destructive-soft' : 'text-surface-foreground',
            )}
          >
            <Trans
              i18nKey="register.acceptTerms"
              components={{
                terms: (
                  <Text
                    variant="none"
                    accessibilityRole="link"
                    className="text-[13px] font-semibold leading-5 text-white underline"
                    onPress={() => void openExternalUrl(legal.termsUrl)}
                  />
                ),
                privacy: (
                  <Text
                    variant="none"
                    accessibilityRole="link"
                    className="text-[13px] font-semibold leading-5 text-white underline"
                    onPress={() => void openExternalUrl(legal.privacyUrl)}
                  />
                ),
              }}
            />
          </Text>
        </View>

        {errors.accept_terms ? (
          <Text variant="none" className="text-[12px] font-medium leading-5 text-destructive-soft">
            {errors.accept_terms}
          </Text>
        ) : null}
      </View>

      <Button
        label={t('register.submit')}
        variant="accent"
        size="lg"
        fullWidth
        className="mt-1"
        loading={submitting}
        onPress={onSubmit}
      />
    </View>
  );
}
