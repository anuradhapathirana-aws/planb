import { View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { LogOut, Mail, Phone, ShieldCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@shared/theme/tokens';
import { signOut as signOutRequest } from '@/api/auth.api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const student = useAuthStore((state) => state.student);
  const signOutLocal = useAuthStore((state) => state.signOut);

  const signOut = useMutation({
    mutationFn: signOutRequest,
    /*
     * onSettled, not onSuccess: a student tapping "sign out" with no signal must
     * still end up signed out on the device. The local token is what matters —
     * the server-side revoke is best-effort, and the token expires anyway.
     */
    onSettled: async () => {
      await signOutLocal();
      queryClient.clear();
      router.replace('/sign-in');
    },
  });

  const initials = student?.full_name
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <Screen scroll>
      <View className="pb-6 pt-4">
        <Text variant="display">{t('profile.title')}</Text>
      </View>

      <Card className="items-center p-6">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-primary">
          <Text className="text-[26px] font-bold leading-8 text-primary-foreground">
            {initials || '—'}
          </Text>
        </View>

        <Text variant="title" className="mt-4 text-center">
          {student?.full_name ?? '—'}
        </Text>

        <Text variant="caption" className="mt-1">
          {student?.student_id}
        </Text>
      </Card>

      <Card className="mt-4 divide-y divide-border">
        <Row icon={Mail} label={t('auth.emailLabel')} value={student?.email ?? '—'} />
        <Row
          icon={Phone}
          label={t('profile.contactNumber')}
          value={student?.contact_number ?? t('common.notSet')}
        />
      </Card>

      {/*
        The email row above is read-only by design: it is the credential the
        sign-in code is sent to, so changing it needs a verify-old-then-verify-new
        flow rather than a text field (backend/CLAUDE.md).
      */}
      <View className="mt-3 flex-row items-start gap-2 px-1">
        <ShieldCheck size={14} color={colors['muted-foreground']} />
        <Text variant="caption" className="flex-1 leading-5">
          {t('profile.emailLocked')}
        </Text>
      </View>

      <Button
        label={t('auth.signOut')}
        variant="outline"
        icon={LogOut}
        size="lg"
        fullWidth
        className="mt-8"
        loading={signOut.isPending}
        onPress={() => signOut.mutate()}
      />
    </Screen>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center gap-3 p-4">
      <Icon size={18} color={colors['muted-foreground']} />

      <View className="flex-1">
        <Text variant="label">{label}</Text>
        <Text className="mt-0.5" numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}
