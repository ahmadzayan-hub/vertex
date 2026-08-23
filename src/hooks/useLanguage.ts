import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/utils/i18n';

export function useLanguage() {
  const { t, i18n } = useTranslation();

  const language = (
    SUPPORTED_LANGUAGES.includes(i18n.resolvedLanguage as SupportedLanguage)
      ? (i18n.resolvedLanguage as SupportedLanguage)
      : 'en'
  );

  const setLanguage = useCallback(
    (lang: SupportedLanguage) => {
      void i18n.changeLanguage(lang);
    },
    [i18n],
  );

  return { language, setLanguage, t, i18n };
}
