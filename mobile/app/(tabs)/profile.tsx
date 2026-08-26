import { useEffect } from 'react';
import { RefreshControl, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { LogOut, Mail, Pencil, Phone, ShieldCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@shared/theme/tokens';
import { fetchMe, signOut as signOutRequest } from '@/api/auth.api';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const signOutLocal = useAuthStore((state) => state.signOut);
  const setStudent = useAuthStore((state) => state.setStudent);
  const cached = useAuthStore((state) => state.student);

  /*
   * Read the profile from the server rather than from the auth store.
   *
   * The store is populated once at sign-in, so anything an admin changes
   * afterwards — a photo upload, a corrected name, a new profession — would
   * never appear until the student signed out and back in. Server state belongs
   * in a query (mobile/CLAUDE.md §2); the store is kept in sync for the screens
   * that only need a cheap read.
   */
  const { data, isFetching, refetch } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    // Shows the cached student instantly, then updates when the fetch lands.
    initialData: cached ?? undefined,
  });

  const student = data ?? cached;

  useEffect(() => {
    if (data) setStudent(data);
  }, [data, setStudent]);

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

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl
          refreshing={isFetching}
          onRefresh={() => void refetch()}
          tintColor={colors.primary}
        />
      }
    >
      <View className="pb-6 pt-4">
        <Text variant="display">{t('profile.title')}</Text>
      </View>

      <Card className="items-center p-6">
        <Avatar uri={student?.profile_photo_url} name={student?.full_name} size={88} />

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
        label={t('profile.edit')}
        icon={Pencil}
        size="lg"
        fullWidth
        className="mt-6"
        onPress={() => router.push('/profile/edit')}
      />

      <Button
        label={t('auth.signOut')}
        variant="outline"
        icon={LogOut}
        size="lg"
        fullWidth
        className="mt-3"
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
