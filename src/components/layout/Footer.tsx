import { useLanguage } from '@/hooks/useLanguage';

const APP_VERSION = '0.1.0';

export function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer
      role="contentinfo"
      className="border-t border-slate-200 bg-white px-4 py-4 text-xs text-slate-500 md:px-6"
    >
      <div className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
        <span>{t('footer.copyright', { year })}</span>
        <span>{t('footer.version', { version: APP_VERSION })}</span>
      </div>
    </footer>
  );
}
