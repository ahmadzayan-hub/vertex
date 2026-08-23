import { Link } from 'react-router-dom';

import { Logo } from '@/components/brand/Logo';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';

export default function NotFound() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const primaryHref = user ? '/dashboard' : '/';

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <a href="#main" className="skip-link">{t('app.skipToMain')}</a>
      <header
        role="banner"
        className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6"
      >
        <Link
          to={primaryHref}
          className="focus:outline-none focus:ring-2 focus:ring-vertex-500 rounded"
        >
          <Logo ariaLabel={t('app.name')} />
        </Link>
        <LanguageSwitcher />
      </header>

      <main
        id="main"
        aria-labelledby="nf-heading"
        className="flex flex-1 items-center justify-center px-4 py-12"
      >
        <div className="vertex-card w-full max-w-md p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-vertex-600">
            404
          </p>
          <h1 id="nf-heading" className="mt-2 text-2xl font-bold text-slate-900">
            {t('errors.notFoundTitle')}
          </h1>
          <p className="mt-2 text-sm text-slate-600">{t('errors.notFoundSubtitle')}</p>
          <Link to={primaryHref} className="vertex-btn-primary mt-6 inline-flex">
            {t('errors.goHome')}
          </Link>
        </div>
      </main>
    </div>
  );
}
