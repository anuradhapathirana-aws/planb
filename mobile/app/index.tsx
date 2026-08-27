import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { View } from 'react-native';

import { fetchMe } from '@/api/auth.api';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/stores/authStore';

/**
 * The launch gate.
 *
 * A token restored from the Keychain proves only that one was stored, not that
 * it still works — an admin may have blocked the student, or the token may have
 * expired. So this asks the server before letting anyone in. That single call
 * is the authority; local state is never trusted on its own.
 */
export default function LaunchScreen() {
  const setStudent = useAuthStore((state) => state.setStudent);

  const { data, isError, isSuccess } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    // A failure here means "sign in", not "try again" — the client has already
    // attempted a token refresh by the time this rejects.
    retry: false,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (isSuccess && data) {
      setStudent(data);
      router.replace('/(tabs)');
    }
  }, [isSuccess, data, setStudent]);

  useEffect(() => {
    if (isError) router.replace('/sign-in');
  }, [isError]);

  return (
    <Screen>
      <View className="flex-1 justify-center gap-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-20 w-full" />
      </View>
    </Screen>
  );
}
