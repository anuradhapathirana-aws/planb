import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type AnimationPlaybackControls,
  type MotionValue,
} from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

import { portalNav } from '@/components/layout/siteNav';
import { useActivePortalTab } from '@/components/layout/portal/useActivePortalTab';
import {
  BAR_HEIGHT,
  BAR_ICON,
  BAR_ICON_OPACITY,
  BAR_PADDING_X,
  BOTTOM_PADDING,
  DISC,
  DISC_DROP,
  DISC_ICON,
  DISC_RING,
  FLIGHT_LIFT,
  SIDE_INSET,
  TOP,
  WAVE_HEIGHT,
  interpolateClamped,
  shoulderFor,
  tabCentre,
  wavePath,
} from '@/components/layout/portal/tabBarGeometry';

const COUNT = portalNav.length;

/** The trip in progress — which glyphs the circle crossfades between. */
interface Trip {
  from: number;
  to: number;
}

/**
 * The portal's phone tab bar: the mobile app's floating navy bar, where the open
 * tab rides a raised, white-ringed circle cradled in a wave of the bar. Hidden
 * from `md` up, where `PortalTopNav` takes over.
 *
 * **One number drives it all**, as in the app: `position`, the circle's place
 * along the bar as a fractional tab index. The wave's centre, the circle's `x`,
 * each bar icon's visibility and the circle's glyph are all read off it, so they
 * cannot drift apart mid-flight. The app's rest/trip split (needed because
 * Android detaches native views) has no web equivalent and is not copied.
 *
 * **Icons only, like the app**, so each link's `aria-label` is the only name a
 * screen reader gets. They are links, not ARIA tabs: each one changes the URL.
 *
 * **Reduce motion is honoured** — the circle moves straight to the new tab.
 *
 * It floats over the page, so the page must end with `TAB_BAR_CLEARANCE` of
 * bottom padding; `PortalLayout` applies it once for every portal page.
 */
export function PortalTabBar() {
  const { t } = useTranslation();
  const active = useActivePortalTab();
  const reduceMotion = useReducedMotion();

  const barRef = useRef<HTMLDivElement>(null);
  const width = useMotionValue(0);
  const position = useMotionValue(active ?? 0);
  const lift = useMotionValue(0);
  const scale = useMotionValue(1);
  const wave = useMotionValue(1);
  // 0 on a page that belongs to no tab: no circle, no wave, every icon shown.
  const presence = useMotionValue(active === null ? 0 : 1);

  const [trip, setTrip] = useState<Trip | null>(null);
  const previous = useRef(active);

  // Measured rather than computed from the viewport, so the bar is right inside
  // any container and through a rotation.
  useEffect(() => {
    const element = barRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => width.set(entry?.contentRect.width ?? 0));
    observer.observe(element);

    return () => observer.disconnect();
  }, [width]);

  useEffect(() => {
    const origin = previous.current;
    previous.current = active;
    presence.set(active === null ? 0 : 1);

    if (active === null || origin === active) return;

    // First tab page after a tab-less one, or reduce motion: no trip, just land.
    if (origin === null || reduceMotion) {
      position.set(active);
      lift.set(0);
      scale.set(1);
      wave.set(1);
      setTrip(null);
      return;
    }

    // Longer for a longer trip, capped well under a second — this is navigation.
    const travel = (360 + 70 * Math.abs(active - origin)) / 1000;
    const running: AnimationPlaybackControls[] = [];
    let cancelled = false;
    const run = (controls: AnimationPlaybackControls) => {
      running.push(controls);
      return controls;
    };
    const then = (controls: AnimationPlaybackControls, next: () => AnimationPlaybackControls) => {
      void controls.then(() => {
        if (!cancelled) run(next());
      });
    };

    setTrip({ from: origin, to: active });

    void run(animate(position, active, { duration: travel, ease: [0.65, 0, 0.35, 1] })).then(() => {
      if (!cancelled) setTrip(null);
    });

    // Up and out of the bar on the way, dropped in with a bounce on arrival.
    then(run(animate(lift, -FLIGHT_LIFT, { duration: travel * 0.45, ease: 'easeOut' })), () =>
      animate(lift, 0, { type: 'spring', damping: 9, stiffness: 190 }),
    );
    then(run(animate(scale, 0.86, { duration: travel * 0.45 })), () =>
      animate(scale, 1, { type: 'spring', damping: 8, stiffness: 200 }),
    );

    // The wave lets go of the circle as it leaves and swells back just before it lands.
    then(run(animate(wave, 0, { duration: 0.14 })), () =>
      animate(wave, 1, {
        type: 'spring',
        damping: 10,
        stiffness: 170,
        delay: Math.max(0, travel * 0.7 - 0.14),
      }),
    );

    // A newer tap stops this trip; the next one starts from wherever it left the circle.
    return () => {
      cancelled = true;
      running.forEach((controls) => controls.stop());
    };
  }, [active, reduceMotion, position, lift, scale, wave, presence]);

  const outline = useTransform([width, position, wave, presence], ([w, p, h, v]: number[]) =>
    wavePath(w!, tabCentre(w!, COUNT, p!), WAVE_HEIGHT * h! * v!, shoulderFor(w!, COUNT)),
  );
  const discX = useTransform([width, position], ([w, p]: number[]) => tabCentre(w!, COUNT, p!) - DISC / 2);

  const activeIcon = active === null ? null : portalNav[active]?.icon;

  return (
    <nav
      aria-label={t('site.portal.title')}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden"
      style={{ paddingInline: SIDE_INSET, paddingBottom: BOTTOM_PADDING }}
    >
      <div ref={barRef} className="relative" style={{ height: TOP + BAR_HEIGHT }}>
        {/* Navy-tinted shadow drawn from the path's own alpha, so it follows the wave. */}
        <svg
          aria-hidden="true"
          className="absolute inset-0 size-full drop-shadow-[0_6px_14px_color-mix(in_srgb,var(--primary)_14%,transparent)]"
        >
          <motion.path d={outline} className="fill-primary" />
        </svg>

        <motion.div
          aria-hidden="true"
          className="absolute left-0 rounded-full border-primary-foreground bg-primary shadow-[0_6px_10px_color-mix(in_srgb,var(--primary)_35%,transparent)]"
          style={{
            top: TOP + DISC_DROP - DISC / 2,
            width: DISC,
            height: DISC,
            borderWidth: DISC_RING,
            x: discX,
            y: lift,
            scale,
            opacity: presence,
          }}
        >
          {trip ? (
            [trip.from, trip.to].map((index) => (
              <DiscGlyph
                key={`${trip.from}-${trip.to}-${index}`}
                icon={portalNav[index]?.icon}
                index={index}
                trip={trip}
                position={position}
              />
            ))
          ) : activeIcon ? (
            <GlyphFrame>{renderIcon(activeIcon, DISC_ICON)}</GlyphFrame>
          ) : null}
        </motion.div>

        <ul
          className="pointer-events-auto absolute inset-x-0 flex"
          style={{ top: TOP, height: BAR_HEIGHT, paddingInline: BAR_PADDING_X }}
        >
          {portalNav.map((item, index) => (
            <li key={item.to} className="flex flex-1">
              <TabLink
                to={item.to}
                end={item.end}
                label={t(item.labelKey)}
                icon={item.icon}
                index={index}
                position={position}
                presence={presence}
                current={index === active}
              />
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

interface TabLinkProps {
  to: string;
  end?: boolean;
  label: string;
  icon: LucideIcon;
  index: number;
  position: MotionValue<number>;
  presence: MotionValue<number>;
  current: boolean;
}

/**
 * One tab's link and its dimmed icon in the bar. The icon's presence is its
 * distance from the circle — gone under it, back once the circle is a tab away —
 * which gives the tab being left its icon back and makes every icon in between
 * duck as the circle passes over. The bar is 54px tall, so no target is under 44.
 */
function TabLink({ to, end, label, icon, index, position, presence, current }: TabLinkProps) {
  const distance = useTransform(position, (p) => Math.abs(p - index));
  const opacity = useTransform([distance, presence], ([d, v]: number[]) =>
    v === 0 ? BAR_ICON_OPACITY : interpolateClamped(d!, [0.2, 0.75], [0, BAR_ICON_OPACITY]),
  );
  const y = useTransform(distance, (d) => interpolateClamped(d, [0.2, 0.75], [10, 0]));
  const scale = useTransform(distance, (d) => interpolateClamped(d, [0.2, 0.75], [0.4, 1]));

  return (
    <NavLink
      to={to}
      end={end}
      aria-label={label}
      // The circle, not NavLink's own matching, marks where the student is.
      aria-current={current ? 'page' : undefined}
      className="flex flex-1 items-center justify-center rounded-2xl text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <motion.span aria-hidden="true" className="flex" style={{ opacity, y, scale }}>
        {renderIcon(icon, BAR_ICON)}
      </motion.span>
    </NavLink>
  );
}

interface DiscGlyphProps {
  icon: LucideIcon | undefined;
  index: number;
  trip: Trip;
  position: MotionValue<number>;
}

/**
 * One of the two glyphs the circle crossfades between mid-trip. It does not show
 * the icons of tabs it passes over — those are still in the bar, ducking.
 */
function DiscGlyph({ icon, index, trip, position }: DiscGlyphProps) {
  const opacity = useTransform(position, (p) => {
    const span = trip.to - trip.from;
    const progress = span === 0 ? 1 : Math.min(1, Math.max(0, (p - trip.from) / span));
    const arriving = interpolateClamped(progress, [0.35, 0.65], [0, 1]);

    return index === trip.to ? arriving : 1 - arriving;
  });

  if (!icon) return null;

  return <GlyphFrame opacity={opacity}>{renderIcon(icon, DISC_ICON)}</GlyphFrame>;
}

function GlyphFrame({ children, opacity }: { children: React.ReactNode; opacity?: MotionValue<number> }) {
  return (
    <motion.span
      className="absolute inset-0 flex items-center justify-center text-primary-foreground"
      style={opacity ? { opacity } : undefined}
    >
      {children}
    </motion.span>
  );
}

function renderIcon(Icon: LucideIcon, size: number) {
  return <Icon size={size} strokeWidth={2} aria-hidden="true" />;
}
