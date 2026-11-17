import { useEffect, useMemo, useState } from 'react';

import { Highlight } from '@/components/shared/Highlight';
import { splitHighlight } from '@/lib/splitHighlight';
import { cn } from '@/lib/utils';

/** How fast one character appears. */
const CHAR_MS = 45;
/**
 * The most the whole heading may take. Slides advance every 7s, so a long
 * heading types faster instead of eating the time the visitor needs to read it.
 */
const MAX_TOTAL_MS = 1800;

interface Glyph {
  char: string;
  accent: boolean;
}

/**
 * Splits text into what a reader sees as single characters.
 *
 * **Not `text.split('')`.** A Sinhala letter is often a consonant plus a vowel
 * sign — two code points drawn as one glyph. Typing them one at a time would show
 * a bare consonant and then have it change shape, which looks broken.
 */
function toGlyphs(text: string): Glyph[] {
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

  return splitHighlight(text).flatMap((part, index) =>
    Array.from(segmenter.segment(part), ({ segment }) => ({ char: segment, accent: index % 2 === 1 })),
  );
}

/** Joins neighbouring glyphs of the same colour back into one span each. */
function toRuns(glyphs: Glyph[]): Glyph[] {
  const runs: Glyph[] = [];

  for (const glyph of glyphs) {
    const last = runs.at(-1);
    if (last && last.accent === glyph.accent) last.char += glyph.char;
    else runs.push({ ...glyph });
  }

  return runs;
}

/**
 * The hero `<h1>`, typed out each time its slide becomes the active one.
 *
 * **The whole heading is in the layout from the first frame.** The part not yet
 * typed is `visibility: hidden`, not missing, so every line wraps where it will
 * finish and the hero never grows as letters arrive — a jumping hero is what
 * makes a visitor mis-tap (see `HeroSlider`). It also means a half-typed word
 * never starts on one line and jumps to the next.
 *
 * **Screen readers and crawlers get the plain heading.** The typed copy is
 * `aria-hidden`; a visually hidden copy carries the real text, so a screen reader
 * reads the sentence once rather than whatever fraction was typed when it got
 * there, and the prerendered HTML still has the full `<h1>`.
 *
 * Under `prefers-reduced-motion` it is simply the finished heading.
 */
export function TypingHeading({
  text,
  isActive,
  reduceMotion,
  className,
}: {
  text: string;
  isActive: boolean;
  reduceMotion: boolean;
  className?: string;
}) {
  const glyphs = useMemo(() => toGlyphs(text), [text]);
  const animate = isActive && !reduceMotion;
  const [typed, setTyped] = useState(animate ? 0 : glyphs.length);

  /*
   * Restart from zero during render, when the slide becomes active (or its text
   * changes, e.g. a language switch). Doing it here rather than in an effect
   * means the reset lands before the browser paints, so the incoming slide never
   * flashes its finished heading for a frame and then wipes it. A slide that
   * goes inactive keeps its text, so it fades out whole rather than blanking.
   */
  const runKey = animate ? text : null;
  const [lastRunKey, setLastRunKey] = useState(runKey);
  if (runKey !== lastRunKey) {
    setLastRunKey(runKey);
    if (runKey !== null) setTyped(0);
  }

  useEffect(() => {
    if (!animate) return;

    const step = Math.min(CHAR_MS, MAX_TOTAL_MS / Math.max(glyphs.length, 1));
    const timer = window.setInterval(() => {
      setTyped((count) => {
        if (count + 1 >= glyphs.length) window.clearInterval(timer);
        return Math.min(count + 1, glyphs.length);
      });
    }, step);

    return () => window.clearInterval(timer);
  }, [animate, glyphs]);

  // Reduced motion, or an inactive slide whose text changed: just the full heading.
  const visible = animate ? typed : glyphs.length;
  const shown = toRuns(glyphs.slice(0, visible));
  const hidden = toRuns(glyphs.slice(visible));

  return (
    <h1 className={className}>
      <span className="sr-only">
        <Highlight text={text} />
      </span>

      <span aria-hidden="true">
        {shown.map((run, index) => (
          <span key={`s${index}`} className={cn(run.accent && 'text-accent')}>
            {run.char}
          </span>
        ))}

        {/*
          Zero-width anchor, so the caret sits at the typing point without
          taking up space — a caret that had width would push the line's last
          word onto the next line and back again as it blinks.
        */}
        {isActive && !reduceMotion ? (
          <span className="relative">
            <span className="absolute top-[0.1em] left-0.5 h-[0.95em] w-0.75 animate-caret-blink rounded-full bg-accent" />
          </span>
        ) : null}

        {hidden.map((run, index) => (
          <span key={`h${index}`} className="invisible">
            {run.char}
          </span>
        ))}
      </span>
    </h1>
  );
}
