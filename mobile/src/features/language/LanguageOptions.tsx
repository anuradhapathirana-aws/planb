import { View } from 'react-native';

import { fonts } from '@shared/theme/tokens';
import { Check } from '@/components/icons';
import { PressableCard } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';
import { setLanguage, SUPPORTED_LANGUAGES, type Language } from '@/lib/i18n';
import { useLanguage } from '@/lib/useLanguage';

/**
 * The language choice, shown on the first-launch screen and again in Profile.
 *
 * **Each option is labelled in its own language, never translated.** A student
 * who has landed in the wrong language has to recognise their own: "Sinhala"
 * written in English is no help to someone who cannot read the screen in front
 * of them, and "ඉංග්‍රීසි" is no help to someone who cannot read Sinhala. The
 * English name sits underneath the Sinhala one for the same reason.
 */
const OPTIONS: Record<Language, { name: string; subtitle?: string; family: string }> = {
  en: { name: 'English', family: fonts.poppins[600] },
  si: { name: 'සිංහල', subtitle: 'Sinhala', family: fonts.sinhala[600] },
};

/** Each language's name in its own script, for anywhere that shows the current one. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: OPTIONS.en.name,
  si: OPTIONS.si.name,
};

export function LanguageOptions({ onChange }: { onChange?: (language: Language) => void }) {
  const current = useLanguage();

  return (
    <View className="gap-3">
      {SUPPORTED_LANGUAGES.map((language) => {
        const option = OPTIONS[language];
        const selected = current === language;

        return (
          <PressableCard
            key={language}
            accessibilityLabel={option.subtitle ? `${option.name} (${option.subtitle})` : option.name}
            // A radio, not a button: a screen reader should say which one is on.
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => {
              // Applied immediately, so the screen changes under the student's
              // finger and they can see they picked the right one.
              void setLanguage(language);
              onChange?.(language);
            }}
            className={cn(
              'min-h-[64px] flex-row items-center gap-3 px-4 py-3',
              selected && 'border-primary bg-primary-soft',
            )}
          >
            <View className="flex-1">
              {/*
                Each name is drawn in the face for ITS OWN script, not the app's
                current one — `Text` resolves the family from the active
                language, which would set "සිංහල" in Poppins while the app is in
                English. The glyphs would still appear (the OS substitutes per
                glyph) but at the wrong weight, so the two options would not
                look like a matched pair.
              */}
              <Text
                variant="none"
                className="text-[17px] leading-7 text-primary"
                style={{ fontFamily: option.family }}
              >
                {option.name}
              </Text>

              {option.subtitle ? (
                <Text variant="caption" style={{ fontFamily: fonts.poppins[400] }}>
                  {option.subtitle}
                </Text>
              ) : null}
            </View>

            {selected ? (
              <View className="h-6 w-6 items-center justify-center rounded-full bg-primary">
                <Check size={14} color="#ffffff" />
              </View>
            ) : (
              <View className="h-6 w-6 rounded-full border border-border" />
            )}
          </PressableCard>
        );
      })}
    </View>
  );
}
