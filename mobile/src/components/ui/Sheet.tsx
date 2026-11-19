import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X } from '@/components/icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@shared/theme/tokens';
import { Text } from './Text';

export interface SheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /**
   * Scroll the body. Turn this off when the content scrolls itself — a vertical
   * list nested in a vertical list fights for the same gesture on Android.
   */
  scroll?: boolean;
  /**
   * Lift the sheet above the keyboard, for a sheet whose main job is typing
   * (the sign-in code). `padding` on both platforms on purpose: the app is
   * edge-to-edge on Android, so the window no longer resizes for the keyboard,
   * and `KeyboardAvoidingView` measures the real overlap — where the OS did
   * resize, that overlap is zero and nothing is added twice.
   */
  avoidKeyboard?: boolean;
  /** One line under the title, for context the student needs before acting. */
  description?: string;
}

/**
 * A bottom sheet.
 *
 * Root CLAUDE.md §8: on mobile a modal IS a bottom sheet, so there is no
 * centred-dialog variant. It rises from the thumb end of the screen rather than
 * the middle, which is where a one-handed user can actually reach it.
 */
export function Sheet({
  visible,
  title,
  onClose,
  children,
  scroll = true,
  avoidKeyboard = false,
  description,
}: SheetProps) {
  const { t } = useTranslation();
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
      <KeyboardAvoidingView
        className="flex-1 justify-end bg-black/40"
        behavior="padding"
        enabled={avoidKeyboard}
      >
        {/* Tapping the scrim closes, as every native sheet does. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          className="flex-1"
          onPress={onClose}
        />

        <View
          className="max-h-[75%] rounded-t-[16px] bg-card"
          style={{ paddingBottom: insets.bottom + 8 }}
        >
          {/* Grabber, the universal "this drags/dismisses" affordance. */}
          <View className="items-center pt-3">
            <View className="h-1 w-10 rounded-full bg-border" />
          </View>

          <View className="flex-row items-center justify-between px-5 py-4">
            <View className="flex-1">
              <Text variant="heading">{title}</Text>
              {description ? (
                <Text variant="caption" className="mt-1 leading-5">
                  {description}
                </Text>
              ) : null}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              hitSlop={12}
              onPress={onClose}
              className="h-11 w-11 items-center justify-center rounded-full active:bg-muted"
            >
              <X size={20} color={colors['muted-foreground']} />
            </Pressable>
          </View>

          {scroll ? (
            <ScrollView
              className="px-5"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View className="px-5">{children}</View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
