import { Tabs } from 'expo-router';
import { GraduationCap, Home, ListChecks, User } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, MIN_TOUCH_TARGET } from '@shared/theme/tokens';

/**
 * Four tabs, not the five root CLAUDE.md §8 reserves.
 *
 * Jobs has no backend yet, and a tab that opens onto "coming soon" is a support
 * ticket and a bad first impression. The bar is a flex row — adding it later
 * reflows nothing.
 */
export default function TabsLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors['muted-foreground'],
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          // The gesture bar on modern Android and the home indicator on iOS both
          // sit where the tab labels would otherwise be.
          height: MIN_TOUCH_TARGET + 16 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          // Sinhala tab labels clip at the default line height.
          lineHeight: 16,
        },
        tabBarItemStyle: {
          minHeight: MIN_TOUCH_TARGET,
        },
        // Android's ripple is the platform-correct press affordance.
        tabBarButtonTestID: undefined,
        ...(Platform.OS === 'android' ? { tabBarHideOnKeyboard: true } : {}),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('home.title'),
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: t('courses.title'),
          tabBarIcon: ({ color, size }) => <GraduationCap size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="checklist"
        options={{
          title: t('checklist.title'),
          tabBarIcon: ({ color, size }) => <ListChecks size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile.title'),
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
