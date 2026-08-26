import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { VideoView } from 'expo-video';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useKeepAwake } from 'expo-keep-awake';
import { ChevronLeft, Pause, Play, RotateCcw, WifiOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDuration } from '@shared/lib/formatters';
import { colors } from '@shared/theme/tokens';
import { EmptyState } from '@/components/ui/EmptyState';
import { Text } from '@/components/ui/Text';
import { useNoSkipPlayer } from '@/features/player/useNoSkipPlayer';

/**
 * The lesson player.
 *
 * `nativeControls={false}` is mandatory, not stylistic: VideoView's native
 * controls include a drag-anywhere scrubber, which makes no-skip impossible.
 * Everything below is our own.
 *
 * Note there is no call to `player.enterFullscreen()` either — expo-video
 * re-enables native controls in fullscreen on every platform, which would hand
 * the student the same scrubber. Landscape is handled as an in-app layout
 * change instead.
 */
export default function LessonScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [controlsVisible, setControlsVisible] = useState(true);

  const {
    player,
    isLoading,
    isError,
    progress,
    maxReachedSeconds,
    durationSeconds,
    currentSeconds,
    isPlaying,
    blockedSeek,
    togglePlay,
    seekTo,
  } = useNoSkipPlayer(Number(id));

  // A lesson is 5–10 minutes of not touching the screen; without this the
  // device dims and locks mid-sentence.
  useKeepAwake();

  /* Auto-hide the controls while playing, the way every video app behaves. */
  useEffect(() => {
    if (!isPlaying || !controlsVisible) return;

    const timer = setTimeout(() => setControlsVisible(false), 3000);

    return () => clearTimeout(timer);
  }, [isPlaying, controlsVisible]);

  const duration = durationSeconds || 0;
  const playedPercent = duration > 0 ? (currentSeconds / duration) * 100 : 0;
  const unlockedPercent = duration > 0 ? Math.min((maxReachedSeconds / duration) * 100, 100) : 0;

  if (isError) {
    return (
      <View className="flex-1 justify-center bg-surface">
        <EmptyState
          icon={WifiOff}
          tone="danger"
          title={t('player.loadFailed')}
          body={t('player.needsConnection')}
          actionLabel={t('common.back')}
          onAction={() => router.back()}
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

        {/* Explains the clamp the moment it happens, so it reads as a rule, not a bug. */}
        {blockedSeek && (
          <View
            className="absolute left-4 right-4 items-center"
            style={{ top: insets.top + 56 }}
            pointerEvents="none"
          >
            <View className="rounded-lg bg-black/80 px-4 py-2.5">
              <Text className="text-center text-[13px] leading-5 text-white">
                {t('player.noSkip')}
              </Text>
            </View>
          </View>
        )}

        {controlsVisible && (
          <>
            {/* Top bar */}
            <View
              className="absolute left-0 right-0 flex-row items-center px-2"
              style={{ top: insets.top }}
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
                  accessibilityLabel="Rewind 10 seconds"
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

                {/*
                  Deliberately no "forward 10s" button. Offering a control that
                  is refused most of the time teaches students the app is broken.
                */}
                <View className="h-14 w-14" />
              </View>
            </View>

            {/* Seek bar */}
            <View
              className="absolute left-0 right-0 px-4"
              style={{ bottom: insets.bottom + 12 }}
            >
              <SeekBar
                playedPercent={playedPercent}
                unlockedPercent={unlockedPercent}
                duration={duration}
                maxReachedSeconds={maxReachedSeconds}
                onSeek={seekTo}
              />

              <View className="mt-2 flex-row justify-between">
                <Text className="text-[12px] font-medium text-white">
                  {formatDuration(currentSeconds)}
                </Text>
                <Text className="text-[12px] font-medium text-white/70">
                  {formatDuration(duration)}
                </Text>
              </View>
            </View>
          </>
        )}
      </Pressable>
    </View>
  );
}

/**
 * The seek bar.
 *
 * The locked region is not merely styled differently — it is a separate,
 * non-interactive view. Only the watched portion accepts a tap, so dragging
 * ahead is physically impossible rather than possible-then-corrected. The
 * clamp in the hook is the fallback for anything that slips through.
 */
function SeekBar({
  playedPercent,
  unlockedPercent,
  duration,
  maxReachedSeconds,
  onSeek,
}: {
  playedPercent: number;
  unlockedPercent: number;
  duration: number;
  maxReachedSeconds: number;
  onSeek: (seconds: number) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);

  return (
    <View
      className="h-8 justify-center"
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
    >
      {/* Full track — the part beyond `unlockedPercent` never receives touches. */}
      <View className="h-1.5 w-full overflow-hidden rounded-full bg-white/25" />

      {/* Watched-and-therefore-seekable region */}
      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel="Lesson position"
        accessibilityValue={{
          min: 0,
          max: Math.round(duration),
          now: Math.round(maxReachedSeconds),
        }}
        onPress={(event) => {
          if (trackWidth <= 0 || duration <= 0) return;

          const ratio = event.nativeEvent.locationX / trackWidth;

          onSeek(ratio * duration);
        }}
        style={{ width: `${unlockedPercent}%` }}
        className="absolute left-0 h-8 justify-center"
      >
        <View className="h-1.5 w-full rounded-full bg-white/45" />
      </Pressable>

      {/* Played fill */}
      <View
        pointerEvents="none"
        style={{ width: `${playedPercent}%` }}
        className="absolute left-0 h-1.5 rounded-full bg-accent"
      />

      {/* Playhead */}
      <View
        pointerEvents="none"
        style={{ left: `${playedPercent}%` }}
        className="absolute -ml-1.5 h-3 w-3 rounded-full bg-accent"
      />
    </View>
  );
}
