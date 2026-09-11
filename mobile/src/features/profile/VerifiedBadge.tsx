import { View } from 'react-native';
import { ShieldCheck } from '@/components/icons';
import { useTranslation } from 'react-i18next';

import { colors } from '@shared/theme/tokens';

/**
 * The gold shield that sits after a student's name on their profile.
 *
 * **It is decoration, and it is not derived from any verification state.** Every
 * signed-in student gets it, at the client's direction — there is no
 * `verified_at` column, no admin toggle, and nothing a student could fail. Do
 * not start reading it as a claim about a particular student, and above all do
 * not gate anything on it: there is no entitlement here to check.
 *
 * If Plan B later wants it to mean something, the honest shape is a column plus
 * an admin control plus an `is_verified` field on `StudentProfileResource`, and
 * this component takes a prop. Deriving it in the app from `registered_at` or
 * `email_verified_at` would NOT work — both are set for every student who has
 * ever signed in, so the badge would still be universal while looking earned.
 *
 * **`accessibilityLabel` is load-bearing now, not a nicety.** The word "Verified"
 * used to sit beside the shield and carry the meaning for anyone who could not
 * read a ~2.5:1 gold glyph; the client removed it, so this label is the only
 * remaining thing that says what the shield is. Never drop it, and keep it
 * translated — an unlabelled icon here is silent to a screen reader.
 */
export function VerifiedBadge() {
  const { t } = useTranslation();

  return (
    <View accessible accessibilityLabel={t('profile.verified')} className="shrink-0">
      <ShieldCheck size={16} color={colors.accent} strokeWidth={2} />
    </View>
  );
}
