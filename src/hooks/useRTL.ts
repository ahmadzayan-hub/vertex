import { useEffect } from 'react';
import { useLanguage } from './useLanguage';
import { RTL_LANGUAGES } from '@/utils/i18n';

export type Direction = 'rtl' | 'ltr';

export function useRTL() {
  const { language } = useLanguage();
  const isRTL = RTL_LANGUAGES.has(language);
  const dir: Direction = isRTL ? 'rtl' : 'ltr';

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('dir', dir);
    root.setAttribute('lang', language);
  }, [dir, language]);

  return { isRTL, dir, language };
}
