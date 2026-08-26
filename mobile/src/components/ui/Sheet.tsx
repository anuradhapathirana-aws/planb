import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@shared/theme/tokens';
import { Text } from './Text';

export interface SheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * A bottom sheet.
 *
 * Root CLAUDE.md §8: on mobile a modal IS a bottom sheet, so there is no
 * centred-dialog variant. It rises from the thumb end of the screen rather than
 * the middle, which is where a one-handed user can actually reach it.
 */
export function Sheet({ visible, title, onClose, children }: SheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      // Android's hardware back must close the sheet, not the screen behind it.
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 justify-end bg-black/40">
        {/* Tapping the scrim closes, as every native sheet does. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          className="flex-1"
          onPress={onClose}
        />

        <View
          className="max-h-[75%] rounded-t-[24px] bg-card"
          style={{ paddingBottom: insets.bottom + 8 }}
        >
          {/* Grabber, the universal "this drags/dismisses" affordance. */}
          <View className="items-center pt-3">
            <View className="h-1 w-10 rounded-full bg-border" />
          </View>

          <View className="flex-row items-center justify-between px-5 py-4">
            <Text variant="heading" className="flex-1">
              {title}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={12}
              onPress={onClose}
              className="h-11 w-11 items-center justify-center rounded-full active:bg-muted"
            >
              <X size={20} color={colors['muted-foreground']} />
            </Pressable>
          </View>

          <ScrollView
            className="px-5"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
