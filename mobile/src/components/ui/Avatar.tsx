import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';

import { cn } from '@/lib/cn';
import { Text } from './Text';

export interface AvatarProps {
  /** Absolute URL. Null when the student has not uploaded a photo. */
  uri?: string | null;
  /** Full name; initials are derived from it as the fallback. */
  name?: string | null;
  size?: number;
  className?: string;
}

/**
 * A student's photo, falling back to their initials.
 *
 * `expo-image` rather than React Native's `Image`: it caches to disk, so the
 * photo is not re-downloaded every time the Profile tab is opened — which
 * matters when students are paying for data.
 *
 * The fallback is not decoration. A photo can fail for reasons the student
 * cannot fix (the file was removed, the host is unreachable), and a broken-image
 * icon looks like the app is broken. Initials always look deliberate.
 */
export function Avatar({ uri, name, size = 80, className }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  const initials = (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  const showImage = Boolean(uri) && !failed;

  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className={cn('items-center justify-center overflow-hidden bg-primary', className)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={name ? `Profile photo of ${name}` : 'Profile photo'}
    >
      {showImage ? (
        <Image
          source={{ uri: uri as string }}
          style={{ width: size, height: size }}
          contentFit="cover"
          // Brief fade avoids the photo popping in over the initials.
          transition={150}
          cachePolicy="disk"
          onError={() => setFailed(true)}
        />
      ) : (
        <Text
          style={{ fontSize: size * 0.34, lineHeight: size * 0.42 }}
          className="font-bold text-primary-foreground"
        >
          {initials || '—'}
        </Text>
      )}
    </View>
  );
}
