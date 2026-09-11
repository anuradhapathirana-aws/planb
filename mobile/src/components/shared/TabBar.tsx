import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';

import { colors, MIN_TOUCH_TARGET } from '@shared/theme/tokens';

/** The raised disc, the white ring around it, and the icon inside. */
const DISC_SIZE = 52;
const HALO = 5;
const PUCK = DISC_SIZE + HALO * 2;
const ICON_SIZE = 24;

/**
 * The bar's own height, above the safe-area inset.
 *
 * Deliberately equal to `PUCK`: at rest the puck exactly fills the bar's
 * vertical extent, which is what centres every icon in the bar without a magic
 * padding number. Change one and change the other.
 */
const BAR_HEIGHT = PUCK;

/**
 * How far the active disc rises above the bar's top edge.
 *
 * Nothing overflows anything to get there, and that is deliberate: React Native
 * does not deliver touches to a child drawn outside its parent's bounds on
 * Android, so a disc hanging over the bar's edge would be dead across its whole
 * top half. The row is instead `LIFT` taller than the bar and the navy starts
 * `LIFT` down from the component's top, so the disc stays inside its own
 * Pressable.
 *
 * The white ring is what separates the disc from the bar — both are navy, so
 * without it the disc's lower half would simply vanish into the bar.
 *
 * Ring and disc are concentric, so `HALO` px of white shows around the disc at
 * every lift and nothing clips. This only sets how much of that assembly clears
 * the bar: at 12 the ring breaks the edge by 12px and the disc by 7.
 */
const LIFT = 12;

/**
 * Honours the OS "reduce motion" setting rather than overriding it — a bar that
 * springs on every tap is exactly the kind of movement that setting exists for.
 */
const SPRING = {
  damping: 15,
  stiffness: 160,
  mass: 0.9,
  reduceMotion: ReduceMotion.System,
};

/**
 * Derived from the public `Tabs` export rather than deep-imported from
 * `expo-router/build/react-navigation/bottom-tabs`. Expo vendors React
 * Navigation inside expo-router and moves it between versions; this survives
 * that, a build-path import does not.
 */
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/** The `tabBarIcon` render function each screen supplies in `(tabs)/_layout.tsx`. */
type TabBarIcon = NonNullable<TabBarProps['descriptors'][string]>['options']['tabBarIcon'];

/**
 * The Plan B tab bar — a navy bar where the open tab rises into a ringed disc,
 * to a client-supplied reference.
 *
 * Replaces React Navigation's own bar rather than restyling it. The disc has to
 * break the bar's top edge, and every way of doing that with the built-in bar
 * ends in the Android clipping problem described on `LIFT`.
 *
 * **The raised disc is the active tab, not a fixed centre button.** The
 * reference parks a search button in the middle; here the lift *is* the
 * selected state, so it travels to whichever tab the student opens. That keeps
 * five tabs and five routes — no sixth target, and nothing to reverse the
 * "five tabs, no centre search button" decision in `docs/CHANGELOG.md` over.
 *
 * **There are no labels**, at the client's request. That makes every tab an
 * icon-only control, so `accessibilityLabel` carries the screen's title and is
 * not optional here (mobile/CLAUDE.md §4) — it is the only thing a screen
 * reader has to go on.
 *
 * Colours are Plan B navy throughout, not the reference's blue. The disc is the
 * bar's own navy and the glyph on it is white — ~14:1 — so selection is carried
 * by the lift and the white ring rather than by a second colour.
 */
export function TabBar({ state, descriptors, navigation, insets }: TabBarProps) {
  return (
    /*
     * The strip above the navy — the one the white ring rises into — is painted
     * `background` rather than left transparent ON PURPOSE. Left transparent it
     * shows whatever the navigator paints behind the bar, and with no
     * `ThemeProvider` at the root that is React Navigation's own
     * `DefaultTheme.background`, `rgb(242,242,242)` — a grey band noticeably
     * darker than any screen above it. Painting it the app's own ground makes it
     * continuous with the screen, which is what "transparent" has to mean here.
     * The alternative, theming the navigator, would repaint every scene in the
     * app to fix one strip.
     */
    <View
      style={{ paddingBottom: insets.bottom, backgroundColor: colors.background }}
      accessibilityRole="tablist"
    >
      {/*
        Painted behind the row rather than as its background, so the disc can sit
        above the bar's top edge while staying inside the component's own bounds.
        `rounded-t-[16px]` matches `Sheet` and the sign-in panel — the app's two
        other full-width bottom surfaces.
      */}
      <View
        className="absolute inset-x-0 bottom-0 rounded-t-[16px] bg-primary"
        style={{ top: LIFT }}
      />

      <View className="flex-row items-end" style={{ height: LIFT + BAR_HEIGHT }}>
        {state.routes.map((route, index) => {
          // Indexing a Record is `T | undefined` under `noUncheckedIndexedAccess`;
          // in practice every route has a descriptor.
          const descriptor = descriptors[route.key];
          if (!descriptor) return null;

          const { options } = descriptor;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <TabItem
              key={route.key}
              focused={isFocused}
              icon={options.tabBarIcon}
              // The only thing a screen reader has left now that the labels are
              // gone. `title` is still set per screen in `(tabs)/_layout.tsx`.
              label={options.title ?? route.name}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            />
          );
        })}
      </View>
    </View>
  );
}

interface TabItemProps {
  focused: boolean;
  icon: TabBarIcon;
  label: string;
  onPress: () => void;
  onLongPress: () => void;
}

/**
 * One tab. Rises into the ringed disc when it becomes the open one, and settles
 * back into the bar when another is opened.
 *
 * The glyph is white in both states, so it is drawn once and never animated.
 * It used to be navy on a gold disc, which needed two stacked copies
 * crossfading — a lucide icon takes a plain colour prop, and switching it
 * outright turned the glyph navy while the disc behind it was still scaling up,
 * navy on navy for the length of the spring. One colour, one icon, no crossfade.
 *
 * Styles here are plain objects rather than `className`. NativeWind styles the
 * RN core components; `Animated.View` is a wrapper around them, and the colours
 * below still come from `@shared/theme/tokens` rather than being hand-mixed, so
 * the one-brand-change-one-file rule (mobile/CLAUDE.md §2) holds either way.
 */
function TabItem({ focused, icon, label, onPress, onLongPress }: TabItemProps) {
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, SPRING);
  }, [focused, progress]);

  const puckStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -LIFT * progress.value }],
  }));

  // Scales up from most of its size rather than from nothing — growing from a
  // dot reads as a popping bubble, which is louder than a tab change deserves.
  const discStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.7 + 0.3 * progress.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      className="flex-1 items-center justify-end self-stretch"
      style={{ minHeight: MIN_TOUCH_TARGET }}
    >
      <Animated.View style={[styles.puck, puckStyle]}>
        {/* The white ring, and the navy disc inside it, scaling in together. */}
        <Animated.View style={[styles.halo, discStyle]}>
          <View style={styles.disc} />
        </Animated.View>

        {/*
          White whether the tab is open or not. The lift and the ringed disc are
          what mark the open one, so the glyph does not also have to change.
        */}
        <View style={styles.icon}>
          {icon?.({ focused, color: colors['primary-foreground'], size: ICON_SIZE })}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  puck: {
    width: PUCK,
    height: PUCK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: PUCK,
    height: PUCK,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: PUCK / 2,
    // White, so the disc reads as cut out of the bar rather than stuck on it.
    // `primary-foreground` is the token for white-on-navy specifically, which is
    // exactly what this is.
    backgroundColor: colors['primary-foreground'],
  },
  disc: {
    width: DISC_SIZE,
    height: DISC_SIZE,
    borderRadius: DISC_SIZE / 2,
    /*
     * The bar's own navy, so the open tab reads as a bubble of the menu itself
     * lifting out rather than a separate gold token. The white ring is what
     * separates the two — without it the disc's lower half would vanish into
     * the bar, since they are now the same colour.
     *
     * It also fixes a contrast problem the gold had: the glyph is white, and
     * white on gold is ~2.6:1, under both the 4.5:1 text threshold and the 3:1
     * floor for graphical objects. White on navy is ~14:1.
     */
    backgroundColor: colors.primary,
    /*
     * iOS only, and deliberately no Android `elevation`. Android paints by
     * elevation rather than document order, so an elevated disc would paint over
     * the two icon layers that follow it and hide the glyph entirely. iOS keeps
     * document order regardless of shadow, so it is safe there. The disc sits on
     * its own white ring either way, which already separates it from the bar.
     */
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      default: {},
    }),
  },
  icon: {
    position: 'absolute',
  },
});
