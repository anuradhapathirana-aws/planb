import { Check, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { changeLanguage, currentLanguage, SUPPORTED_LANGUAGES, type Language } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * English / Sinhala.
 *
 * Switching does more than swap interface strings: `lib/i18n.ts` invalidates the
 * whole query cache, because course and section titles were fetched under the
 * old `Accept-Language` header and the SERVER is what picks the column (root
 * CLAUDE.md §8). That refetch happens in the background, so the page re-labels
 * itself rather than blanking.
 */
export function LanguageSwitcher({
  className,
  /**
   * True in the navy public header. Only the trigger is inverted — the dropdown
   * itself opens on a light surface either way, so its items need no variant.
   */
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  const { t, i18n } = useTranslation();
  // Read from i18n rather than a local state, so the tick follows a change made
  // anywhere else (the portal's Profile page also switches language).
  const active = currentLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'gap-1.5',
            onDark && 'text-white hover:bg-white/10 hover:text-white',
            className,
          )}
          aria-label={t('site.lang.label')}
        >
          <Globe className="size-4" aria-hidden="true" />
          <span className="uppercase">{i18n.language.slice(0, 2)}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-40">
        {SUPPORTED_LANGUAGES.map((language: Language) => (
          <DropdownMenuItem key={language} onSelect={() => void changeLanguage(language)}>
            <Check className={cn('size-4', language === active ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
            {t(`site.lang.${language}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
