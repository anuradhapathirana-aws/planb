import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, RadialGradient, Stop } from 'react-native-svg';

import { colors } from '@shared/theme/tokens';
import { Text } from '@/components/ui/Text';

export interface CoinMarkProps {
  /** Three or four characters at most — it has to fit inside the rim. */
  code: string;
  size?: number;
}

/**
 * A struck gold coin with a currency code on it.
 *
 * **Drawn, never bitmapped** — the same call `BrandMark` and the carousel's
 * built-in slides make. Shipping it as a PNG would cost real bundle size, need
 * three densities, and still go soft on a tall screen. This is a couple of
 * kilobytes and sharp at any size.
 *
 * It reads as a real coin rather than a gold disc because it carries the four
 * things a minted coin actually has, in the order light hits them:
 *
 * 1. **A milled (reeded) edge** — the ridges around the rim of a pound or a
 *    dirham. Drawn as ONE dashed circle stroke rather than forty little lines:
 *    the dash pattern lays the ticks out evenly around the circumference for
 *    free, and there is no loop to keep in step with the radius.
 * 2. **A raised inner face**, separated from the edge by a groove. That step is
 *    what makes the flat SVG read as having a thickness.
 * 3. **A radial sheen** lit from the upper left, so the metal turns from pale
 *    gold where the light lands to full `accent` in the shadow — the direction
 *    every other lit surface in the app uses.
 * 4. **A specular highlight**, a soft white ellipse raked across the top-left.
 *    It is the one thing that separates polished metal from coloured plastic.
 *
 * **All of it is built from `accent`, `accent-soft` and `primary` at varying
 * opacity.** No new colour was added for the shadows: navy at low opacity over
 * gold darkens it toward bronze, which is what a shaded edge actually looks
 * like, and it keeps the coin inside the palette (root CLAUDE.md §8).
 *
 * The code is set in `primary` navy — ~6:1 on gold, and the right way round:
 * white on gold is ~2.6:1 and fails. Latin "AED" rather than the dirham glyph
 * د.إ on purpose: the app's font stack is Inter plus Noto Sans Sinhala, neither
 * of which covers Arabic, so the glyph would render as tofu on any device
 * without a fallback face.
 */
export function CoinMark({ code, size = 40 }: CoinMarkProps) {
  /*
   * Unique per instance, and the colons stripped. `react-native-svg` resolves
   * `url(#id)` against a SHARED registry, so two coins declaring the same id is
   * asking for one to resolve against the other's def. And `useId` returns
   * `:r0:` — a colon inside `url(#...)` is not something an SVG id reference can
   * carry, so the fill would silently fail and the coin would render as a hole.
   */
  const instance = useId().replace(/:/g, '');
  const faceId = `coin-face-${instance}`;
  const edgeId = `coin-edge-${instance}`;

  return (
    <View style={{ width: size, height: size }}>
      {/*
        A fixed 40-unit viewBox whatever the rendered size, so every radius and
        stroke width below is one set of numbers rather than a function of
        `size`. The whole thing scales as a unit.
      */}
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Defs>
          {/* The edge: brightest at the top-left, turning over into shadow at the
              bottom-right, which is what gives the rim its curvature. */}
          <LinearGradient id={edgeId} x1="0.15" y1="0" x2="0.85" y2="1">
            <Stop offset="0" stopColor={colors['accent-soft']} />
            <Stop offset="0.5" stopColor={colors.accent} />
            <Stop offset="1" stopColor={colors.accent} />
          </LinearGradient>

          {/* The face, lit from the same direction but as a radial — a flat
              surface catching light off-centre rather than a curved one. */}
          <RadialGradient id={faceId} cx="0.36" cy="0.3" r="0.78">
            <Stop offset="0" stopColor={colors['accent-soft']} />
            <Stop offset="0.55" stopColor={colors.accent} />
            <Stop offset="1" stopColor={colors.accent} />
          </RadialGradient>
        </Defs>

        {/* 1. The coin's body. */}
        <Circle cx="20" cy="20" r="19.5" fill={`url(#${edgeId})`} />

        {/*
          2. The milled edge. One dashed stroke, not forty lines: `strokeDasharray`
          walks the circumference and lays the ridges out evenly on its own. At
          r=18.4 the circumference is ~115.6 units, so a 1.2/1.5 pattern gives
          roughly 43 ridges — dense enough to read as knurling at 40px and still
          resolve as individual ticks when the converter screen draws it larger.
        */}
        <Circle
          cx="20"
          cy="20"
          r="18.4"
          fill="none"
          stroke={colors.primary}
          strokeOpacity={0.22}
          strokeWidth={2.2}
          strokeDasharray="1.2 1.5"
        />

        {/* 3. The outer edge line — the turn of the metal, not a drawn border.
               It has to hold the coin's silhouette on a LIGHT card as well as on
               the navy converter hero, and pale gold on near-white has almost no
               edge of its own, so this carries it. Low enough to still read as
               shading rather than as an outline. */}
        <Circle
          cx="20"
          cy="20"
          r="19.3"
          fill="none"
          stroke={colors.primary}
          strokeOpacity={0.26}
          strokeWidth={1}
        />

        {/* 4. The raised face. */}
        <Circle cx="20" cy="20" r="15.2" fill={`url(#${faceId})`} />

        {/* 5. The groove around it — the step from face down to edge. */}
        <Circle
          cx="20"
          cy="20"
          r="15.2"
          fill="none"
          stroke={colors.primary}
          strokeOpacity={0.24}
          strokeWidth={0.9}
        />

        {/* 6. The catch-light on the top of that step, opposite the groove's
               shadow. Two thin arcs would be more correct; at this size a single
               pale ring reads better than either. */}
        <Circle
          cx="20"
          cy="20"
          r="14.3"
          fill="none"
          stroke={colors['accent-soft']}
          strokeOpacity={0.5}
          strokeWidth={0.8}
        />

        {/*
          7. The specular highlight — polished metal, not coloured plastic. Raked
          to match the two gradients' light direction, and kept off the centre so
          it never sits behind the currency code and washes it out.
        */}
        <Ellipse
          cx="14"
          cy="12"
          rx="7.5"
          ry="3.6"
          fill={colors['primary-foreground']}
          opacity={0.34}
          transform="rotate(-38 14 12)"
        />
      </Svg>

      {/* Overlaid rather than an SVG <Text>: react-native-svg text does not
          resolve the app's font family reliably across platforms, and this word
          has to match the rest of the UI. */}
      <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
        <Text
          // Scaled off `size` so the coin works at any diameter without a second
          // set of numbers to keep in step.
          style={{ fontSize: size * 0.24, lineHeight: size * 0.4 }}
          className="font-bold text-primary"
        >
          {code}
        </Text>
      </View>
    </View>
  );
}
