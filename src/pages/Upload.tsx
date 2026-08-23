import { AppShell } from '@/components/layout/AppShell';
import { UploadWizard } from '@/components/submissions/UploadWizard';
import { useLanguage } from '@/hooks/useLanguage';

export default function Upload() {
  const { t } = useLanguage();
  return (
    <AppShell pageTitle={t('upload.title')}>
      <section aria-labelledby="upload-heading" className="space-y-4">
        <header>
          <h2 id="upload-heading" className="text-2xl font-bold text-slate-900">
            {t('upload.title')}
          </h2>
          <p className="mt-1 text-sm text-slate-600">{t('upload.subtitle')}</p>
        </header>
        <UploadWizard />
      </section>
    </AppShell>
  );
}
