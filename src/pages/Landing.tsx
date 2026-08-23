import { Link } from 'react-router-dom';

import { Logo } from '@/components/brand/Logo';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

type LocaleItem = { title: string; body: string };
type LocaleStep = { title: string; body: string };

export default function Landing() {
  const { t, i18n } = useLanguage();
  const { user } = useAuth();
  const { canInstall, installed, install } = useInstallPrompt();

  const features = (i18n.getResource(i18n.language, 'common', 'landing.features.items') ?? []) as LocaleItem[];
  const steps = (i18n.getResource(i18n.language, 'common', 'landing.how.steps') ?? []) as LocaleStep[];

  const handleInstall = async () => {
    const result = await install();
    if (result.outcome !== 'accepted') {
      alert(t('landing.install.iosNote'));
    }
  };

  const primaryHref = user ? '/dashboard' : '/login';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a href="#main" className="skip-link">{t('app.skipToMain')}</a>

      <header role="banner" className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
          <Logo />
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link to={primaryHref} className="vertex-btn-primary text-xs">
              {user ? t('nav.dashboard') : t('landing.footer.login')}
            </Link>
          </div>
        </div>
      </header>

      <main id="main">
        <section
          aria-labelledby="hero-heading"
          className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50"
        >
          <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden="true">
            <div className="absolute inset-y-0 start-1/2 -translate-x-1/2 h-full w-[900px] rounded-full bg-gradient-to-tr from-vertex-100 via-transparent to-amber-100 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-4xl px-4 py-16 text-center md:px-8 md:py-24">
            <p className="text-xs font-semibold uppercase tracking-widest text-vertex-700">
              {t('landing.hero.eyebrow')}
            </p>
            <h1
              id="hero-heading"
              className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-5xl"
            >
              {t('landing.hero.title')}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 md:text-lg">
              {t('landing.hero.subtitle')}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to={primaryHref}
                className="vertex-btn-primary w-full px-6 py-3 text-base sm:w-auto"
              >
                {t('landing.hero.primaryCta')}
              </Link>
              <button
                type="button"
                onClick={handleInstall}
                disabled={!canInstall && !installed}
                className="vertex-btn-secondary w-full px-6 py-3 text-base sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
              >
                {installed ? t('landing.install.installed') : t('landing.hero.secondaryCta')}
              </button>
            </div>
            <p className="mt-6 text-xs text-slate-500">{t('landing.hero.trust')}</p>
          </div>
        </section>

        <section
          aria-labelledby="features-heading"
          className="border-t border-slate-200 bg-white"
        >
          <div className="mx-auto max-w-6xl px-4 py-14 md:px-8 md:py-20">
            <h2 id="features-heading" className="text-2xl font-bold text-slate-900 md:text-3xl">
              {t('landing.features.title')}
            </h2>
            <ol className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => (
                <li key={i} className="vertex-card p-5">
                  <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-vertex-50 text-vertex-700">
                    <span aria-hidden="true" className="text-base font-bold">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{f.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{f.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          aria-labelledby="how-heading"
          className="border-t border-slate-200 bg-slate-950 text-slate-100"
        >
          <div className="mx-auto max-w-6xl px-4 py-14 md:px-8 md:py-20">
            <h2 id="how-heading" className="text-2xl font-bold md:text-3xl">
              {t('landing.how.title')}
            </h2>
            <ol className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
              {steps.map((s, i) => (
                <li key={i} className="rounded-lg border border-slate-800 bg-slate-900 p-5">
                  <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-slate-900">
                    <span aria-hidden="true" className="text-sm font-extrabold">{i + 1}</span>
                  </div>
                  <h3 className="text-base font-bold text-white">{s.title}</h3>
                  <p className="mt-1 text-sm text-slate-300">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          aria-labelledby="install-heading"
          className="border-t border-slate-200 bg-white"
        >
          <div className="mx-auto max-w-4xl px-4 py-14 text-center md:px-8 md:py-20">
            <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-vertex-50">
              <Logo variant="mark" size={44} />
            </div>
            <h2 id="install-heading" className="text-2xl font-bold text-slate-900 md:text-3xl">
              {t('landing.install.title')}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600 md:text-base">
              {t('landing.install.subtitle')}
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to={primaryHref} className="vertex-btn-secondary px-6 py-3 text-base">
                {t('landing.install.webCta')}
              </Link>
              <button
                type="button"
                onClick={handleInstall}
                disabled={!canInstall && !installed}
                className="vertex-btn-primary px-6 py-3 text-base disabled:cursor-not-allowed disabled:opacity-60"
              >
                {installed ? t('landing.install.installed') : t('landing.install.androidCta')}
              </button>
            </div>
            <p className="mt-4 text-xs text-slate-500">{t('landing.install.iosNote')}</p>
          </div>
        </section>
      </main>

      <footer role="contentinfo" className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex items-center gap-3">
            <Logo variant="mark" size={28} />
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} VERTEX. {t('landing.footer.contact')}: BEYOND CONNECT GENERAL TRADING L.L.C.
            </p>
          </div>
          <nav aria-label={t('landing.footer.resources')} className="flex gap-4 text-xs text-slate-600">
            <a href="#features-heading">{t('landing.footer.features')}</a>
            <a href="#how-heading">{t('landing.footer.howItWorks')}</a>
            <Link to={primaryHref}>{t('landing.footer.login')}</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
