import { Navigate } from 'react-router-dom';

import { LoginForm } from '@/components/auth/LoginForm';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { Logo } from '@/components/brand/Logo';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';

export default function Login() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <a href="#main" className="skip-link">
        {t('app.skipToMain')}
      </a>
      <header
        role="banner"
        className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6"
      >
        <Logo ariaLabel={t('app.name')} />
        <LanguageSwitcher />
      </header>

      <main id="main" aria-label="Login" className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="vertex-card w-full max-w-md p-6 md:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-slate-900">{t('auth.welcome')}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('auth.welcomeSubtitle')}</p>
          </div>
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
