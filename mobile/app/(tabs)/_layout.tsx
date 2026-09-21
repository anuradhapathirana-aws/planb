import { Tabs } from 'expo-router';
import { GraduationCap, Home, Plane, Sparkles, User } from '@/components/icons';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

import { TabBar } from '@/components/shared/TabBar';

/**
 * Five tabs, which is the cap root CLAUDE.md §8 sets — Home, Courses, Services,
 * Checklists, Profile.
 *
 * Jobs is the one the SRS names that is missing, and it stays missing until it
 * has a backend: a tab that opens onto "coming soon" is a support ticket and a
 * bad first impression. There is no room for it now anyway, so when it arrives
 * something has to give rather than a sixth being squeezed in.
 *
 * Services sits directly after Courses because the two are the same kind of
 * thing to a student — something Plan B sells them — and grouping them keeps
 * the bar's left half "what I can buy" and its right half "my own stuff".
 *
 * The bar itself is ours (`@/components/shared/TabBar`), so the styling options
 * React Navigation's bar reads — `tabBarStyle`, `tabBarLabelStyle`,
 * `tabBarActiveTintColor` — are gone from here. Only `title` and `tabBarIcon`
 * still matter, and `TabBar` reads both: the icon to draw, and the title as the
 * `accessibilityLabel` that stands in for the labels the bar no longer shows.
 */
export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
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
        name="services"
        options={{
          title: t('services.title'),
          tabBarIcon: ({ color, size }) => <Sparkles size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="checklist"
        options={{
          title: t('checklist.title'),
          tabBarIcon: ({ color, size }) => <Plane size={size} color={color} />,
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
