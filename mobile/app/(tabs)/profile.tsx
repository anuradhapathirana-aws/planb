import { useEffect } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTabBarClearance } from '@/components/shared/TabBar';
import { ChevronRight, Heart, LogOut, Mail, Phone, Receipt, ShieldCheck } from '@/components/icons';
import { useTranslation } from 'react-i18next';

import { colors } from '@shared/theme/tokens';
import { fetchMe, signOut as signOutRequest } from '@/api/auth.api';
import { fetchCourses } from '@/api/courses.api';
import { Button } from '@/components/ui/Button';
import { Card, PressableCard } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useChecklistOverview } from '@/features/checklist/useChecklists';
import { ContinueLearningCard } from '@/features/profile/ContinueLearningCard';
import { ProfileHeader } from '@/features/profile/ProfileHeader';
import { ProfileStats } from '@/features/profile/ProfileStats';
import { useServicePurchases } from '@/features/services/useServices';
import { useWishlist } from '@/features/wishlist/useWishlist';
import { queryClient } from '@/lib/queryClient';
import { useStatusBarStyle } from '@/lib/useStatusBarStyle';
import { useAuthStore } from '@/stores/authStore';

export default function ProfileScreen() {
  const { t } = useTranslation();
  // The tab bar floats over this screen; see `useTabBarClearance`.
  const tabBarClearance = useTabBarClearance();

  // `ProfileHeader`'s navy panel carries its own top inset so it runs under the
  // clock, which is the one place on a tab screen white glyphs are correct.
  useStatusBarStyle('light');
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

  /*
   * Progress moved here from Home, which is now the catalogue. All three reuse
   * the query keys the Courses, Checklists and Services tabs already own, so
   * this screen costs nothing extra once any of them has been opened — and its
   * numbers can never disagree with the screens they link to.
   */
  const courses = useQuery({ queryKey: ['courses'], queryFn: () => fetchCourses() });
  const checklists = useChecklistOverview();
  const purchases = useServicePurchases();
  // Warms the wishlist screen and gives its row a count.
  const wishlist = useWishlist();
  const wishlistCount = wishlist.data?.length;

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
    /*
     * Not `Screen`: it applies the top inset to the page before any child
     * renders, and the navy header has to run behind the status bar.
     */
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: tabBarClearance + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={() => void refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <ProfileHeader
          student={student}
          onEdit={() => router.push('/profile/edit')}
          onNotifications={() => router.push('/notifications')}
        />

        <View className="px-5 pt-4">
          <ProfileStats
            phases={checklists.data ?? []}
            courses={courses.data?.data ?? []}
            purchases={purchases.data?.data ?? []}
            loading={courses.isLoading || checklists.isLoading || purchases.isLoading}
          />

          <ContinueLearningCard courses={courses.data?.data ?? []} />

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

          {/*
            Beside Payment history and built the same way: a list students open
            now and then, behind a row rather than a tab. The count appears once
            the list has loaded and is left off at zero — "0" next to a row reads
            as a warning, and the screen it opens says the list is empty anyway.
          */}
          <PressableCard
            accessibilityLabel={
              wishlistCount
                ? `${t('wishlist.title')}. ${t('wishlist.count', { count: wishlistCount })}`
                : t('wishlist.title')
            }
            onPress={() => router.push('/profile/wishlist')}
            className="mt-4 flex-row items-center gap-3 p-4"
          >
            <Heart size={18} color={colors['muted-foreground']} />

            <Text className="flex-1 font-medium">{t('wishlist.title')}</Text>

            {wishlistCount ? (
              <Text variant="caption" className="tabular-nums">
                {wishlistCount}
              </Text>
            ) : null}

            <ChevronRight size={20} color={colors['muted-foreground']} />
          </PressableCard>

          {/*
            Payment history lives behind a row rather than a fourth tab: students
            check it rarely, and a tab bar earns its space on what people open daily.
          */}
          <PressableCard
            accessibilityLabel={t('payment.historyTitle')}
            onPress={() => router.push('/profile/payments')}
            className="mt-3 flex-row items-center gap-3 p-4"
          >
            <Receipt size={18} color={colors['muted-foreground']} />

            <Text className="flex-1 font-medium">{t('payment.historyLink')}</Text>

            <ChevronRight size={20} color={colors['muted-foreground']} />
          </PressableCard>

          {/*
            Sign out is the only button on the page. Editing is the pencil in the
            navy header — a second, full-width way into the same screen made the
            footer read as the primary action when it is the rarer one.
          */}
          <Button
            label={t('auth.signOut')}
            variant="outline"
            icon={LogOut}
            size="lg"
            fullWidth
            className="mt-6"
            loading={signOut.isPending}
            onPress={() => signOut.mutate()}
          />
        </View>
      </ScrollView>
    </View>
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
