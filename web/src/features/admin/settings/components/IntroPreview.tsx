import { motion, type Variants } from 'framer-motion';
import type { IntroAnimation } from '@shared/types/companySettings';

interface IntroPreviewProps {
  logoUrl: string;
  greeting: string;
  animation: IntroAnimation;
  /** Changing it remounts the preview, which replays the animation. */
  replayKey: number;
}

/*
 * Kept in step with `mobile/src/features/intro/introAnimations.ts` — same
 * starting pose and same durations — so what the admin previews is what a
 * student's phone plays.
 */
const LOGO_VARIANTS: Record<IntroAnimation, Variants> = {
  fade: {
    from: { opacity: 0 },
    to: { opacity: 1, transition: { duration: 0.7 } },
  },
  zoom: {
    from: { opacity: 0, scale: 0.6 },
    to: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: 'easeOut' } },
  },
  slide_up: {
    from: { opacity: 0, y: 40 },
    to: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } },
  },
  pulse: {
    from: { opacity: 0, scale: 0.9 },
    to: { opacity: 1, scale: [0.9, 1, 1.08, 1], transition: { duration: 1.1, times: [0, 0.4, 0.7, 1] } },
  },
};

/** A phone-shaped stage playing the intro the way the student app will. */
export function IntroPreview({ logoUrl, greeting, animation, replayKey }: IntroPreviewProps) {
  const greetingVariants: Variants = {
    from: { opacity: 0, y: animation === 'slide_up' ? 16 : 0 },
    to: { opacity: 1, y: 0, transition: { delay: 0.35, duration: 0.6 } },
  };

  return (
    // Navy, like the app: its intro continues the native splash, which is navy.
    <div className="mx-auto aspect-9/16 w-full max-w-60 overflow-hidden rounded-3xl border-4 border-slate-800 bg-primary">

      <div
        key={`${replayKey}-${animation}`}
        className="flex size-full flex-col items-center justify-center gap-4 px-5 text-center"
      >
        <motion.img
          src={logoUrl}
          alt="Plan B logo"
          className="size-24 rounded-full bg-white object-cover"
          variants={LOGO_VARIANTS[animation]}
          initial="from"
          animate="to"
        />

        {greeting.trim() !== '' && (
          <motion.p
            className="text-sm leading-snug font-semibold text-white"
            variants={greetingVariants}
            initial="from"
            animate="to"
          >
            {greeting}
          </motion.p>
        )}
      </div>
    </div>
  );
}
