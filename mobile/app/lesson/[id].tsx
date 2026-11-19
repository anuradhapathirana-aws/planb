import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View, type GestureResponderEvent } from 'react-native';
import { VideoView } from 'expo-video';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useKeepAwake } from 'expo-keep-awake';
import {
  AlertTriangle,
  ChevronLeft,
  Lock,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  VideoOff,
  WifiOff,
} from '@/components/icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDuration } from '@shared/lib/formatters';
import { colors } from '@shared/theme/tokens';
import { EmptyState } from '@/components/ui/EmptyState';
import { Text } from '@/components/ui/Text';
import { useLessonPlayer } from '@/features/player/useLessonPlayer';
import { useRotationUnlocked } from '@/lib/useRotationUnlocked';

/**
 * The lesson player. Students may skip anywhere — drag or tap the bar, or use
 * the 10-second buttons.
 *
 * `nativeControls={false}` stays: the native controls differ per platform and
 * bring their own fullscreen and picture-in-picture, and our own controls are
 * what keep the screen consistent and branded. Everything below is our own.
 *
 * There is no call to `player.enterFullscreen()` either — expo-video
 * re-enables native controls in fullscreen. Landscape is handled as an in-app layout
 * change instead: this screen is the only one in the app that follows the
 * phone's rotation, and the video simply fills whatever shape it lands in.
 */
export default function LessonScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [controlsVisible, setControlsVisible] = useState(true);
  // While a finger is on the seek bar the controls must not auto-hide under it.
  const [scrubbing, setScrubbing] = useState(false);

  const {
    player,
    isLoading,
    isError,
    errorKind,
    retry,
    progress,
    durationSeconds,
    currentSeconds,
    isPlaying,
    togglePlay,
    seekTo,
  } = useLessonPlayer(Number(id));

  // A lesson is 5–10 minutes of not touching the screen; without this the
  // device dims and locks mid-sentence.
  useKeepAwake();

  // Turn the phone, turn the video. Portrait is restored on the way out, so the
  // course page behind this screen is never left sideways.
  useRotationUnlocked();

  /* Auto-hide the controls while playing, the way every video app behaves. */
  useEffect(() => {
    if (!isPlaying || !controlsVisible || scrubbing) return;

    const timer = setTimeout(() => setControlsVisible(false), 3000);

    return () => clearTimeout(timer);
  }, [isPlaying, controlsVisible, scrubbing]);

  const duration = durationSeconds || 0;

  if (isError) {
    /*
     * Say what is actually wrong. The first version of this screen blamed the
     * network for everything, which sent a student with perfect signal off to
     * restart their router when the real answer was that Plan B had not
     * uploaded the video yet.
     */
    const { icon, title, body, retryable } = {
      'not-ready': {
        icon: VideoOff,
        title: t('player.notReadyTitle'),
        body: t('player.notReadyBody'),
        retryable: false,
      },
      offline: {
        icon: WifiOff,
        title: t('player.offlineTitle'),
        body: t('player.offlineBody'),
        retryable: true,
      },
      blocked: {
        icon: Lock,
        title: t('player.blockedTitle'),
        body: t('player.blockedBody'),
        retryable: false,
      },
      unknown: {
        icon: AlertTriangle,
        title: t('player.unknownTitle'),
        body: t('player.unknownBody'),
        retryable: true,
      },
      none: {
        icon: AlertTriangle,
        title: t('player.unknownTitle'),
        body: t('player.unknownBody'),
        retryable: true,
      },
    }[errorKind];

    return (
      <View className="flex-1 justify-center bg-background">
        <EmptyState
          icon={icon}
          // Only "offline" and "unknown" are worth retrying; a missing video
          // will still be missing however many times you tap.
          tone={errorKind === 'not-ready' ? 'neutral' : 'danger'}
          title={title}
          body={body}
          actionLabel={retryable ? t('common.retry') : t('common.back')}
          onAction={() => (retryable ? void retry() : router.back())}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" hidden={isPlaying && !controlsVisible} />

      <Pressable className="flex-1" onPress={() => setControlsVisible((visible) => !visible)}>
        <VideoView
          player={player}
          style={{ flex: 1 }}
          contentFit="contain"
          // The whole reason this screen exists. Do not enable.
          nativeControls={false}
          allowsPictureInPicture={false}
        />

        {isLoading && (
          <View className="absolute inset-0 items-center justify-center">
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        )}

        {controlsVisible && (
          <>
            {/* Top bar */}
            <View
              className="absolute left-0 right-0 flex-row items-center"
              // In landscape the notch is beside the screen, not above it, so the
              // back button has to clear `insets.left` — `px-2` alone would put it
              // under the cutout on the phones that have one.
              style={{ top: insets.top, paddingLeft: insets.left + 8, paddingRight: insets.right + 8 }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.back')}
                hitSlop={12}
                onPress={() => router.back()}
                className="h-11 w-11 items-center justify-center rounded-full active:bg-white/10"
              >
                <ChevronLeft size={26} color="#ffffff" />
              </Pressable>

              {progress?.is_watched && (
                <View className="ml-auto mr-3 rounded-full bg-success px-3 py-1">
                  <Text className="text-[11px] font-semibold text-white">
                    {t('courses.watched')}
                  </Text>
                </View>
              )}
            </View>

            {/* Centre transport */}
            <View className="absolute inset-0 items-center justify-center" pointerEvents="box-none">
              <View className="flex-row items-center gap-8">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('player.rewind', { seconds: 10 })}
                  hitSlop={12}
                  onPress={() => seekTo(currentSeconds - 10)}
                  className="h-14 w-14 items-center justify-center rounded-full bg-black/40 active:bg-black/60"
                >
                  <RotateCcw size={24} color="#ffffff" />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                  onPress={togglePlay}
                  className="h-[72px] w-[72px] items-center justify-center rounded-full bg-white/95 active:bg-white"
                >
                  {isPlaying ? (
                    <Pause size={30} color={colors.primary} fill={colors.primary} />
                  ) : (
                    <Play size={30} color={colors.primary} fill={colors.primary} />
                  )}
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('player.forward', { seconds: 10 })}
                  hitSlop={12}
                  onPress={() => seekTo(currentSeconds + 10)}
                  className="h-14 w-14 items-center justify-center rounded-full bg-black/40 active:bg-black/60"
                >
                  <RotateCw size={24} color="#ffffff" />
                </Pressable>
              </View>
            </View>

            {/* Seek bar */}
            <View
              className="absolute left-0 right-0"
              style={{
                bottom: insets.bottom + 12,
                paddingLeft: insets.left + 16,
                paddingRight: insets.right + 16,
              }}
            >
              <SeekBar
                currentSeconds={currentSeconds}
                duration={duration}
                onSeek={seekTo}
                onScrubbingChange={setScrubbing}
              />
            </View>
          </>
        )}
      </Pressable>
    </View>
  );
}

/**
 * The seek bar: tap anywhere to jump, or drag the playhead.
 *
 * Built on the responder system rather than a slider package (none is in the
 * stack). While a finger is down the bar previews the drag position and only
 * seeks on release, so the video isn't asked to seek dozens of times a second.
 * Positions come from `pageX` against the bar's own left edge, measured at the
 * touch, so a finger that drifts off the bar keeps scrubbing correctly.
 */
function SeekBar({
  currentSeconds,
  duration,
  onSeek,
  onScrubbingChange,
}: {
  currentSeconds: number;
  duration: number;
  onSeek: (seconds: number) => void;
  onScrubbingChange: (scrubbing: boolean) => void;
}) {
  const { t } = useTranslation();
  const [trackWidth, setTrackWidth] = useState(0);
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  // Mirrors `dragRatio` for the release handler, which must not read a stale render.
  const dragRatioRef = useRef<number | null>(null);
  const trackLeft = useRef(0);

  const ratioAt = (pageX: number) =>
    trackWidth > 0 ? Math.min(1, Math.max(0, (pageX - trackLeft.current) / trackWidth)) : 0;

  const setDrag = (ratio: number | null) => {
    dragRatioRef.current = ratio;
    setDragRatio(ratio);
  };

  const onGrant = (event: GestureResponderEvent) => {
    const { pageX, locationX } = event.nativeEvent;
    trackLeft.current = pageX - locationX;
    setDrag(ratioAt(pageX));
    onScrubbingChange(true);
  };

  const onRelease = () => {
    const ratio = dragRatioRef.current;
    if (ratio !== null) onSeek(ratio * duration);
    setDrag(null);
    onScrubbingChange(false);
  };

  const onCancel = () => {
    setDrag(null);
    onScrubbingChange(false);
  };

  const shownSeconds = dragRatio !== null ? dragRatio * duration : currentSeconds;
  const shownPercent = duration > 0 ? Math.min(100, (shownSeconds / duration) * 100) : 0;
  const ready = trackWidth > 0 && duration > 0;

  return (
    <View>
      <View
        className="h-8 justify-center"
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => ready}
        onMoveShouldSetResponder={() => ready}
        // Once scrubbing, keep the gesture — don't let the screen take it back.
        onResponderTerminationRequest={() => false}
        onResponderGrant={onGrant}
        onResponderMove={(event) => setDrag(ratioAt(event.nativeEvent.pageX))}
        onResponderRelease={onRelease}
        onResponderTerminate={onCancel}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={t('player.position')}
        accessibilityValue={{
          min: 0,
          max: Math.round(duration),
          now: Math.round(currentSeconds),
          text: `${formatDuration(currentSeconds)} / ${formatDuration(duration)}`,
        }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) =>
          onSeek(currentSeconds + (event.nativeEvent.actionName === 'increment' ? 10 : -10))
        }
      >
        {/* Children never take touches, so every touch lands on the bar itself. */}
        <View pointerEvents="none" className="h-1.5 w-full rounded-full bg-white/30" />

        <View
          pointerEvents="none"
          style={{ width: `${shownPercent}%` }}
          className="absolute left-0 h-1.5 rounded-full bg-accent"
        />

        {/* Playhead — grows while held, so the student can see what they're dragging. */}
        <View
          pointerEvents="none"
          style={{ left: `${shownPercent}%` }}
          className={
            dragRatio !== null
              ? 'absolute -ml-2.5 h-5 w-5 rounded-full bg-accent'
              : 'absolute -ml-1.5 h-3 w-3 rounded-full bg-accent'
          }
        />
      </View>

      <View className="mt-2 flex-row justify-between">
        <Text className="text-[12px] font-medium text-white">{formatDuration(shownSeconds)}</Text>
        <Text className="text-[12px] font-medium text-white/70">{formatDuration(duration)}</Text>
      </View>
    </View>
  );
}
