import { View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts } from '@shared/theme/tokens';
import { BrandMark } from '@/components/shared/BrandMark';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useAppConfig } from '@/features/intro/useAppConfig';
import { LanguageOptions } from '@/features/language/LanguageOptions';
import { currentLanguage, setLanguage } from '@/lib/i18n';
import { useStatusBarStyle } from '@/lib/useStatusBarStyle';

/**
 * Pick a language — shown once, before sign-in, on the first launch after
 * install or update.
 *
 * **Both headings are on screen at once, in both languages.** This is the one
 * screen a student may reach in a language they cannot read, so translating it
 * would defeat it: whichever line they can read tells them what to do.
 *
 * Navy above, white below, matching sign-in — the first two screens of the app
 * read as one thing rather than two.
 *
 * Nothing is saved until Continue. Tapping an option applies the language live
 * (`LanguageOptions`), so the button's own label switches as proof.
 */
export default function LanguageScreen() {
  const insets = useSafeAreaInsets();
  const config = useAppConfig();

  useStatusBarStyle('light');

  return (
    <View className="flex-1 bg-surface">
      <View className="px-6 pb-10" style={{ paddingTop: insets.top + 48 }}>
        <BrandMark logoUrl={config.data?.logo_url} />

        <Text
          variant="none"
          className="mt-6 text-[24px] leading-9 text-white"
          style={{ fontFamily: fonts.poppins[700] }}
        >
          Choose your language
        </Text>
        <Text
          variant="none"
          className="mt-1 text-[20px] leading-8 text-surface-muted"
          style={{ fontFamily: fonts.sinhala[600] }}
        >
          ඔබේ භාෂාව තෝරන්න
        </Text>
      </View>

      <View
        className="flex-1 rounded-t-[16px] bg-background px-6 pt-8"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <LanguageOptions />

        <View className="mt-auto">
          <Button
            label="Continue  ·  ඉදිරියට"
            size="lg"
            fullWidth
            onPress={() => {
              /*
               * Saved here even when nothing was tapped, which is the common
               * case — most students will just press Continue. Without this the
               * launch gate would find no choice recorded and send them
               * straight back to this screen.
               *
               * `replace`, not `back`: the gate got here by `replace`, so there
               * is nothing behind this screen to go back to.
               */
              void setLanguage(currentLanguage()).finally(() => router.replace('/'));
            }}
          />

          <Text variant="caption" className="mt-3 text-center">
            You can change this later in Profile · පසුව Profile තුළින් වෙනස් කළ හැක
          </Text>
        </View>
      </View>
    </View>
  );
}
