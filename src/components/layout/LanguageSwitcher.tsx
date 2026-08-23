import { useLanguage } from '@/hooks/useLanguage';

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
  const next = language === 'en' ? 'ar' : 'en';
  const label = next === 'ar' ? t('language.switchToArabic') : t('language.switchToEnglish');

  return (
    <button
      type="button"
      onClick={() => setLanguage(next)}
      aria-label={label}
      title={label}
      className="vertex-btn-secondary px-3 py-1.5 text-sm font-semibold"
    >
      <span aria-hidden="true">{next === 'ar' ? 'العربية' : 'English'}</span>
      <span className="sr-only">{label}</span>
    </button>
  );
}
