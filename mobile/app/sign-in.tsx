import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { requestCodeSchema } from '@shared/schemas/studentAuth';
import { requestLoginCode } from '@/api/auth.api';
import { errorMessage } from '@/api/client';
import { BrandMark } from '@/components/shared/BrandMark';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';

/**
 * Sign in.
 *
 * Navy above, white sheet below — the logo's own contrast, and it puts the
 * brand in the top third where the eye lands first while keeping the form in
 * the thumb zone.
 */
export default function SignInScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();

  const mutation = useMutation({
    mutationFn: (value: string) => requestLoginCode(value),
    onSuccess: (_result, value) => {
      /*
       * The API returns the same body whether or not that email matched a
       * student, so "we sent you a code" is the only honest thing to say — and
       * the copy has to carry the ambiguity without alarming anyone
       * (backend/CLAUDE.md §4).
       */
      toast.info(t('auth.codeSent'));
      router.push({ pathname: '/verify', params: { email: value } });
    },
    onError: (err) => {
      const message = errorMessage(err, t('common.genericError'));
      setError(message);
      toast.error(message);
    },
  });

  function handleSubmit() {
    const parsed = requestCodeSchema.safeParse({ email });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t('common.genericError'));
      return;
    }

    setError(undefined);
    mutation.mutate(parsed.data.email);
  }

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
        {/* Brand panel */}
        <View className="px-6 pb-10" style={{ paddingTop: insets.top + 48 }}>
          <BrandMark />

          <Text className="mt-6 text-[26px] font-bold leading-9 text-white">
            {t('auth.signInTitle')}
          </Text>
          <Text className="mt-2 text-[15px] leading-6 text-surface-muted">
            {t('auth.signInSubtitle')}
          </Text>
        </View>

        {/* Form sheet */}
        <View className="flex-1 rounded-t-[28px] bg-background px-6 pt-8">
          <Input
            label={t('auth.emailLabel')}
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              // Clearing on edit, not re-validating on every keystroke: an error
              // that updates while you type is noise (root CLAUDE.md §8).
              if (error) setError(undefined);
            }}
            error={error}
            icon={Mail}
            required
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={handleSubmit}
            editable={!mutation.isPending}
          />

          <Button
            label={t('auth.sendCode')}
            size="lg"
            fullWidth
            className="mt-5"
            loading={mutation.isPending}
            onPress={handleSubmit}
          />

          <Text variant="caption" className="mt-6 text-center leading-5">
            {t('auth.noAccount')}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
