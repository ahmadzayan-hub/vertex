import { useEffect, useState } from 'react';

import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { useLanguage } from '@/hooks/useLanguage';
import { signedUrlFor } from '@/services/storage';

interface Props {
  filePath: string;
  mimeType?: string | null;
  documentName?: string;
}

function inferKind(name: string, mime?: string | null): 'pdf' | 'image' | 'text' | 'other' {
  const lower = name.toLowerCase();
  if (mime === 'application/pdf' || lower.endsWith('.pdf')) return 'pdf';
  if ((mime && mime.startsWith('image/')) || /\.(png|jpe?g|webp|gif)$/.test(lower)) return 'image';
  if (
    (mime && (mime.startsWith('text/') || mime === 'application/json')) ||
    /\.(txt|csv|json)$/.test(lower)
  ) {
    return 'text';
  }
  return 'other';
}

export function FilePreview({ filePath, mimeType, documentName }: Props) {
  const { t } = useLanguage();
  const [url, setUrl] = useState<string | null>(null);
  const [textBody, setTextBody] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const kind = inferKind(documentName ?? filePath, mimeType);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setTextBody(null);
    setError(null);
    signedUrlFor(filePath)
      .then(async (signedUrl) => {
        if (cancelled) return;
        setUrl(signedUrl);
        if (kind === 'text') {
          try {
            const res = await fetch(signedUrl);
            const body = await res.text();
            if (!cancelled) setTextBody(body.slice(0, 40000));
          } catch (err) {
            if (!cancelled) setError(err instanceof Error ? err.message : 'preview failed');
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'preview failed');
      });
    return () => {
      cancelled = true;
    };
  }, [filePath, kind]);

  if (error) return <EmptyState title={error} />;
  if (!url) return <LoadingSpinner label={t('submission.preview.loading')} />;

  if (kind === 'pdf') {
    return (
      <div className="h-[70vh] w-full overflow-hidden rounded-md border border-slate-200">
        <object data={url} type="application/pdf" className="h-full w-full">
          <p className="p-4 text-sm">{t('submission.preview.notSupported')}</p>
        </object>
      </div>
    );
  }
  if (kind === 'image') {
    return (
      <div className="flex justify-center rounded-md border border-slate-200 bg-slate-50 p-4">
        <img src={url} alt={documentName ?? 'preview'} className="max-h-[70vh] max-w-full" />
      </div>
    );
  }
  if (kind === 'text' && textBody !== null) {
    return (
      <pre className="max-h-[70vh] overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800">
        {textBody}
      </pre>
    );
  }
  return (
    <EmptyState
      title={t('submission.preview.notSupported')}
      action={
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="vertex-btn-primary inline-block"
        >
          {t('submission.preview.download')}
        </a>
      }
    />
  );
}
