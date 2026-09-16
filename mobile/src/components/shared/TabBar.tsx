import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';

import { colors, MIN_TOUCH_TARGET } from '@shared/theme/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Inset of the floating bar from the screen's sides. Matches Home's page gutter. */
const SIDE_INSET = 16;

/** Space under the bar on a phone with no home indicator (no bottom safe area). */
const BOTTOM_GAP = 8;

/**
 * Room above the bar for the raised circle and its flight. The circle rests with
 * its top 20px above the bar and rises `FLIGHT_LIFT` more mid-flight, so this is
 * the smallest number that keeps the whole animation inside the component —
 * nothing is drawn outside its own bounds, which Android would be entitled to
 * clip. The strip is transparent and passes touches through to the page.
 */
const TOP = 28;

/** The navy bar itself. Trimmed from 60 at the client's request. */
const BAR_HEIGHT = 54;
const BAR_RADIUS = 20;

/**
 * Horizontal padding inside the bar, before the five tab slots.
 *
 * Wider than it looks necessary, and that is load-bearing: the wave needs
 * straight bar edge on BOTH sides of a tab to rise out of, and the outermost
 * tabs sit next to the rounded corners. See `SHOULDER_MAX`.
 */
const BAR_PADDING_X = 28;

/** The raised circle, and the glyphs in and under it. */
const DISC = 50;
const DISC_ICON = 24;
const BAR_ICON = 22;

/** The white ring separating the navy circle from the navy bar. */
const DISC_RING = 3;

/** How bright the unselected icons are — white at this opacity. */
const BAR_ICON_OPACITY = 0.7;

/** How far below the bar's top edge the circle's centre rests. */
const DISC_DROP = 5;

/** How far above the bar's edge the wave peaks, behind the circle. */
const WAVE_HEIGHT = 13;

/**
 * Half-width of the wave at the bar's edge — how far the curve's "shoulders"
 * sweep out either side of the circle.
 *
 * Capped per screen at the room the outermost tab actually has before the
 * rounded corner begins (`shoulder`, in `TabBar`). A wave on the first tab that started
 * inside the corner would bend the bar's outline back on itself.
 */
const SHOULDER_MAX = 38;

/** How much higher the circle rises while it travels between tabs. */
const FLIGHT_LIFT = 10;

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
 * The bar's outline as one SVG path: a rounded rectangle whose top edge rises
 * into a wave centred on `cx`.
 *
 * One path rather than a rectangle with a bump laid over it: the wave has to be
 * part of the bar's own silhouette, so the iOS shadow drawn from its alpha
 * follows the curve instead of stopping where a second shape would begin.
 *
 * Coordinates are inset half a pixel, a leftover of the hairline stroke the
 * white version needed. Kept because the corner clearance in `shoulder` is
 * measured against it.
 */
function wavePath(width: number, cx: number, waveHeight: number, shoulder: number): string {
  'worklet';

  const inset = 0.5;
  const left = inset;
  const right = width - inset;
  const top = TOP;
  const bottom = TOP + BAR_HEIGHT - inset;
  const r = BAR_RADIUS;
  const peak = top - waveHeight;
  const from = cx - shoulder;
  const to = cx + shoulder;

  return [
    `M ${left + r} ${top}`,
    `L ${from} ${top}`,
    // Leaves the edge flat and turns up into the peak — tangents horizontal at
    // both ends, so the wave has no corner where it meets the bar.
    `C ${from + shoulder * 0.55} ${top} ${cx - shoulder * 0.45} ${peak} ${cx} ${peak}`,
    `C ${cx + shoulder * 0.45} ${peak} ${to - shoulder * 0.55} ${top} ${to} ${top}`,
    `L ${right - r} ${top}`,
    `A ${r} ${r} 0 0 1 ${right} ${top + r}`,
    `L ${right} ${bottom - r}`,
    `A ${r} ${r} 0 0 1 ${right - r} ${bottom}`,
    `L ${left + r} ${bottom}`,
    `A ${r} ${r} 0 0 1 ${left} ${bottom - r}`,
    `L ${left} ${top + r}`,
    `A ${r} ${r} 0 0 1 ${left + r} ${top}`,
    'Z',
  ].join(' ');
}

/** Space below the bar: the home-indicator inset, or a small gap without one. */
function bottomGap(safeAreaBottom: number): number {
  return safeAreaBottom > 0 ? safeAreaBottom : BOTTOM_GAP;
}

/**
 * How much of the bottom of the screen the floating bar covers — the padding a
 * tab screen's scrolling content must end with so its last row can scroll clear.
 *
 * Includes the transparent strip above the bar, because the raised circle sits
 * in it. Read from the same constants and the same safe-area inset the bar lays
 * itself out with, so the two cannot disagree.
 */
export function useTabBarClearance(): number {
  const insets = useSafeAreaInsets();

  return TOP + BAR_HEIGHT + bottomGap(insets.bottom);
}

/**
 * The Plan B tab bar — a floating navy bar where the open tab rides a raised,
 * white-ringed navy circle cradled in a wave of the bar, to a client-supplied
 * reference.
 *
 * **Bar and circle are the same navy, at the client's request, and the white
 * ring is what makes that work.** Without it the circle's lower half would sink
 * invisibly into the wave it sits in, and mid-flight — with the wave flattened —
 * the whole circle would be navy on navy. The ring outlines it on the bar; above
 * the bar it merges into the white page, where the navy is already contrast
 * enough.
 *
 * **The circle IS the selected tab, and it travels.** Tapping another tab lifts
 * the circle out of the bar — the wave under it flattens as it leaves — carries
 * it in an arc to the new tab, and drops it in with a bounce as the wave rises
 * again beneath it. The tab it left gets its grey icon back, growing into the
 * empty slot; the tab it lands on gives its grey icon up. Every icon it passes
 * over on the way dips out of its path and back, which is what makes the travel
 * read as one continuous movement rather than a jump.
 *
 * All of it is driven by ONE number, `position` — the circle's place along the
 * bar as a fractional tab index. The wave's centre, the circle's `x`, each grey
 * icon's size and which icon the circle carries are all read off it. They cannot
 * drift apart mid-flight because nothing else is animating them.
 *
 * **Reduce motion is honoured**: with the OS setting on, the circle moves
 * straight to the new tab with no flight, lift or bounce.
 *
 * **There are no labels**, at the client's request. That makes every tab an
 * icon-only control, so `accessibilityLabel` carries the screen's title and is
 * not optional here (mobile/CLAUDE.md §4) — it is the only thing a screen
 * reader has to go on.
 *
 * **Floating over the screen, absolutely positioned**, at the client's request.
 * It used to sit in flow with its gutters painted white, and the white strip the
 * circle rises into cut off the bottom of Home's last row. Now everything round
 * the navy bar is transparent and content scrolls behind it.
 *
 * **The price is that tab screens no longer get the bar's height taken off for
 * them.** Every tab screen's scrolling content must end with
 * `useTabBarClearance()` of bottom padding, or its last row sits under the bar
 * with no way to scroll it clear. A new tab screen has to do the same.
 */
export function TabBar({ state, descriptors, navigation, insets }: TabBarProps) {
  const [width, setWidth] = useState(0);
  const count = state.routes.length;

  const position = useSharedValue(state.index);
  const from = useSharedValue(state.index);
  const to = useSharedValue(state.index);
  const lift = useSharedValue(0);
  const scale = useSharedValue(1);
  const wave = useSharedValue(1);

  const previousIndex = useRef(state.index);

  /*
   * The trip in progress, or null once the circle has landed.
   *
   * **This React state, not the shared values, decides what is drawn at rest**,
   * and that is the fix for icons doubling up inside the circle on Android. The
   * animated opacities live on the UI thread only. When a pushed screen (All
   * Courses, a course) covers the tabs, Android detaches the bar's native views,
   * and the animation state they come back with cannot be trusted — the next
   * trip could land with both the old and the new glyph half-visible in the
   * circle until another tab was tapped.
   *
   * So animated layers exist ONLY for the length of a trip. At rest the circle
   * holds one plain, non-animated glyph for the open tab, each bar icon is a
   * plain view whose visibility comes from `focused`, and the bar's outline is a
   * plain SVG path — nothing on screen at rest depends on a UI-thread value
   * surviving a detach.
   */
  const [flight, setFlight] = useState<{ from: number; to: number } | null>(null);
  const landing = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(landing.current), []);

  useEffect(() => {
    const target = state.index;
    const origin = previousIndex.current;

    if (target === origin) return;
    previousIndex.current = target;

    from.value = origin;
    to.value = target;
    setFlight({ from: origin, to: target });

    /*
     * Longer for a longer trip, so crossing four tabs does not look like a
     * teleport and moving one does not drag. Capped well under a second — this
     * is navigation, and the screen has already changed underneath.
     */
    const travel = 360 + 70 * Math.abs(target - origin);

    position.value = withTiming(target, {
      duration: travel,
      easing: Easing.inOut(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });

    // Up and out of the bar on the way, then dropped in with a bounce on arrival.
    lift.value = withSequence(
      withTiming(-FLIGHT_LIFT, {
        duration: travel * 0.45,
        easing: Easing.out(Easing.quad),
        reduceMotion: ReduceMotion.System,
      }),
      withSpring(0, { damping: 9, stiffness: 190, reduceMotion: ReduceMotion.System }),
    );

    scale.value = withSequence(
      withTiming(0.86, { duration: travel * 0.45, reduceMotion: ReduceMotion.System }),
      withSpring(1, { damping: 8, stiffness: 200, reduceMotion: ReduceMotion.System }),
    );

    /*
     * The wave flattens as the circle leaves, travels flat, and swells back
     * under the circle just before it lands — so it reads as the bar letting go
     * of the circle and catching it again, not as a bump sliding along.
     */
    wave.value = withSequence(
      withTiming(0, { duration: 140, reduceMotion: ReduceMotion.System }),
      withDelay(
        Math.max(0, travel * 0.7 - 140),
        withSpring(1, { damping: 10, stiffness: 170, reduceMotion: ReduceMotion.System }),
      ),
    );

    /*
     * Lands the trip from the JS side on a timer, deliberately not from the
     * animation's completion callback: an animation interrupted by a detach may
     * never report finishing, and a trip that never lands would keep the
     * animated layers — the thing that broke — on screen indefinitely.
     *
     * The margin past `travel` covers the drop-in bounce. Snapping `position`
     * is a no-op when the animation did finish, and puts the circle where it
     * belongs when it did not. A newer tap clears this timer and starts its own.
     */
    clearTimeout(landing.current);
    landing.current = setTimeout(() => {
      position.value = target;
      from.value = target;
      to.value = target;
      setFlight(null);
    }, travel + 250);
  }, [state.index, position, from, to, lift, scale, wave]);

  /** The `tabBarIcon` a tab's screen supplies, by position in the bar. */
  const iconAt = (index: number): TabBarIcon => {
    const route = state.routes[index];

    return route ? descriptors[route.key]?.options.tabBarIcon : undefined;
  };

  const slot = width > 0 ? (width - BAR_PADDING_X * 2) / count : 0;
  /*
   * The first tab's centre, minus the corner: the room the wave has on its left.
   * Less 1px, because the outline is inset half a pixel for the stroke — without
   * it the wave on the outermost tabs starts half a pixel INSIDE the corner arc.
   */
  const shoulder = Math.min(SHOULDER_MAX, BAR_PADDING_X + slot / 2 - BAR_RADIUS - 1);

  /** The bar's outline with the wave fully risen under tab `index` — its resting shape. */
  const restingPath = (index: number) =>
    wavePath(width, BAR_PADDING_X + slot * (index + 0.5), WAVE_HEIGHT, shoulder);

  const barProps = useAnimatedProps(() => ({
    d: wavePath(
      width,
      BAR_PADDING_X + slot * (position.value + 0.5),
      WAVE_HEIGHT * wave.value,
      shoulder,
    ),
  }));

  const discStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: BAR_PADDING_X + slot * (position.value + 0.5) - DISC / 2 },
      { translateY: lift.value },
      { scale: scale.value },
    ],
  }));

  return (
    /*
     * Absolute, so the screen above fills the whole height and shows through
     * everywhere the navy bar is not. That also retires the grey band a
     * transparent in-flow strip used to show: nothing of the navigator is behind
     * this any more, only the screen itself.
     *
     * `box-none` on both wrappers: they take no touches themselves, so a tap in
     * the gutters or the strip above the bar reaches the page underneath. Only
     * the tab slots, which cover the navy bar exactly, respond.
     */
    <View
      accessibilityRole="tablist"
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: SIDE_INSET,
        paddingBottom: bottomGap(insets.bottom),
      }}
    >
      <View
        pointerEvents="box-none"
        style={{ height: TOP + BAR_HEIGHT }}
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      >
        {width > 0 && (
          <>
            {/*
              iOS draws the shadow from the SVG's own alpha, so it follows the
              wave. Android's `elevation` needs an opaque rectangular background
              and would cast a box under the curve, so Android gets none — a navy
              bar on a white page needs no shadow to be seen.

              No stroke: the light hairline the white bar needed would read as a
              pale outline round a dark shape.

              Same rest/trip split as the icons (see `flight`). On Android an
              `AnimatedPath` could mount — after login, or when a pushed screen
              uncovered the tabs — without its animated `d` ever reaching the
              native view, leaving the bar unpainted: only the circle showed, and
              the white bar icons vanished into the white page until a tab tap
              started an animation. At rest the outline is a plain `d` prop now.
              The trip's path is keyed so it mounts fresh, and is handed its
              starting shape as a plain prop too, so its first frame is never empty.
            */}
            <View style={[StyleSheet.absoluteFill, styles.barShadow]} pointerEvents="none">
              <Svg width={width} height={TOP + BAR_HEIGHT}>
                {flight === null ? (
                  <Path d={restingPath(state.index)} fill={colors.primary} />
                ) : (
                  <AnimatedPath
                    key={`${flight.from}-${flight.to}`}
                    d={restingPath(flight.from)}
                    animatedProps={barProps}
                    fill={colors.primary}
                  />
                )}
              </Svg>
            </View>

            {/*
              The glyphs are CHILDREN of the circle, not stacked siblings over it.
              Android paints by elevation rather than document order, so an
              elevated circle drawn as a sibling would paint over its own icon;
              as children they elevate with it.
            */}
            <Animated.View pointerEvents="none" style={[styles.disc, discStyle]}>
              {flight === null ? (
                // At rest: the open tab's glyph, and nothing animated — see `flight`.
                <View style={[StyleSheet.absoluteFill, styles.discIcon]}>
                  {discGlyph(iconAt(state.index))}
                </View>
              ) : (
                /*
                 * Mid-trip: only the two glyphs the circle crossfades between,
                 * keyed by the trip so a tap that interrupts one mounts fresh
                 * layers rather than inheriting the last trip's opacities.
                 */
                [flight.from, flight.to].map((index) => (
                  <DiscIcon
                    key={`${flight.from}-${flight.to}-${index}`}
                    index={index}
                    from={from}
                    to={to}
                    position={position}
                    icon={iconAt(index)}
                  />
                ))
              )}
            </Animated.View>
          </>
        )}

        <View style={styles.row}>
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
              <TabSlot
                key={route.key}
                index={index}
                focused={isFocused}
                position={position}
                animating={flight !== null}
                icon={options.tabBarIcon}
                // The only thing a screen reader has, with no visible labels.
                // `title` is still set per screen in `(tabs)/_layout.tsx`.
                label={options.title ?? route.name}
                onPress={onPress}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

interface TabSlotProps {
  index: number;
  focused: boolean;
  position: SharedValue<number>;
  /** A trip is in progress, so the icon follows the circle; otherwise it is static. */
  animating: boolean;
  icon: TabBarIcon;
  label: string;
  onPress: () => void;
  onLongPress: () => void;
}

/**
 * One tab's touch target, and its grey icon in the bar.
 *
 * The icon's presence is its DISTANCE from the circle: fully there when the
 * circle is a tab or more away, shrunk and sunk out of sight when the circle is
 * over it. That single rule is what gives the tab being left its icon back, takes
 * it from the tab being landed on, and makes each icon in between duck as the
 * circle passes over.
 *
 * The touch target covers the navy bar exactly and nothing above it. The strip
 * the circle rises into is transparent, so a target reaching into it would
 * steal taps meant for the page content showing through. The bar is 54px, so no
 * slot is under 44 (mobile/CLAUDE.md §4).
 */
function TabSlot({
  index,
  focused,
  position,
  animating,
  icon,
  label,
  onPress,
  onLongPress,
}: TabSlotProps) {
  const iconStyle = useAnimatedStyle(() => {
    const distance = Math.abs(position.value - index);

    return {
      // Peaks at `BAR_ICON_OPACITY`, not 1 — see the icon below.
      opacity: interpolate(distance, [0.2, 0.75], [0, BAR_ICON_OPACITY], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(distance, [0.2, 0.75], [10, 0], Extrapolation.CLAMP) },
        { scale: interpolate(distance, [0.2, 0.75], [0.4, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      style={styles.slot}
    >
      {/*
        Animated only while the circle travels. At rest the icon is a plain style
        — hidden under the open tab, shown elsewhere — the same values the
        animation ends on, so the swap between the two is invisible, and a detach
        on Android has no UI-thread state to lose. See `flight` in `TabBar`.
      */}
      <Animated.View
        style={animating ? iconStyle : focused ? styles.barIconHidden : styles.barIconShown}
      >
        {/*
          White dimmed by the view's opacity, not a grey token. `muted-foreground`
          on navy is 3.2:1 — scraping the 3:1 floor for graphical objects, and a
          22px outline icon at that contrast is hard to pick out on a phone in
          daylight. White at 70% blends to 8.2:1 on this navy and still sits a clear step below the
          circle's full-white glyph: one strong mark on the bar, four quiet ones.
        */}
        {icon?.({ focused: false, color: colors['primary-foreground'], size: BAR_ICON })}
      </Animated.View>
    </Pressable>
  );
}

/** A glyph as the circle draws it: white on navy, ~15:1. */
function discGlyph(icon: TabBarIcon) {
  return icon?.({ focused: true, color: colors['primary-foreground'], size: DISC_ICON });
}

interface DiscIconProps {
  index: number;
  from: SharedValue<number>;
  to: SharedValue<number>;
  position: SharedValue<number>;
  icon: TabBarIcon;
}

/**
 * One of the two glyphs the circle crossfades between during a trip. Mounted
 * only while a trip is in progress — at rest the circle draws a plain glyph
 * instead (see `flight` in `TabBar`).
 *
 * Mid-flight the circle swaps from the tab it left to the tab it is heading for,
 * crossfading over the middle of the trip. It deliberately does NOT show the
 * icons of tabs it passes over — those are still in the bar, ducking out of its
 * way, and the circle flashing through them too would be noise.
 */
function DiscIcon({ index, from, to, position, icon }: DiscIconProps) {
  const style = useAnimatedStyle(() => {
    const span = to.value - from.value;
    const progress =
      span === 0 ? 1 : Math.min(1, Math.max(0, (position.value - from.value) / span));
    const arriving = interpolate(progress, [0.35, 0.65], [0, 1], Extrapolation.CLAMP);

    let opacity = 0;
    if (index === to.value) opacity = arriving;
    else if (index === from.value) opacity = 1 - arriving;

    return { opacity };
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.discIcon, style]}>
      {discGlyph(icon)}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  barShadow: {
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 14,
      },
      default: {},
    }),
  },
  disc: {
    position: 'absolute',
    left: 0,
    top: TOP + DISC_DROP - DISC / 2,
    width: DISC,
    height: DISC,
    borderRadius: DISC / 2,
    backgroundColor: colors.primary,
    /*
     * The white ring. Drawn INSIDE the 52px — React Native borders do not add to
     * a view's size — so the circle's footprint, the flight bounds and the wave
     * geometry are all unchanged. `primary-foreground` is the token for
     * white-on-navy, which is exactly what this is.
     */
    borderWidth: DISC_RING,
    borderColor: colors['primary-foreground'],
    /*
     * A shadow is right here, under root CLAUDE.md §8: the circle genuinely
     * floats above the bar, which is the case that rule reserves shadows for.
     * Navy-tinted rather than black so it reads as the circle's own depth.
     */
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
        shadowColor: colors.primary,
      },
      default: {},
    }),
  },
  discIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The resting ends of the bar icon's animation — see `TabSlot`.
  barIconShown: {
    opacity: BAR_ICON_OPACITY,
  },
  barIconHidden: {
    opacity: 0,
  },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: TOP,
    height: BAR_HEIGHT,
    flexDirection: 'row',
    paddingHorizontal: BAR_PADDING_X,
  },
  slot: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
