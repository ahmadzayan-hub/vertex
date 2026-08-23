import { useLanguage } from '@/hooks/useLanguage';

export function LoadingSpinner({ label }: { label?: string }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-vertex-600"
        aria-hidden="true"
      />
      <span>{label ?? t('common.loading')}</span>
    </div>
  );
}
