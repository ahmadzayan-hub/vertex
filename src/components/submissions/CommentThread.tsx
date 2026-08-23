import { useState } from 'react';

import { EmptyState } from '@/components/common/EmptyState';
import { useLanguage } from '@/hooks/useLanguage';
import { useComments } from '@/hooks/useComments';
import { formatRelative } from '@/utils/formatters';
import type { Comment } from '@/types';

interface Props {
  submissionId: string;
  comments: Comment[];
  onChange: () => void | Promise<void>;
}

export function CommentThread({ submissionId, comments, onChange }: Props) {
  const { t, language } = useLanguage();
  const { send, toggleResolved, submitting, error } = useComments(onChange);
  const [text, setText] = useState('');

  const handleSend = async () => {
    const ok = await send(submissionId, text);
    if (ok) setText('');
  };

  return (
    <section aria-label={t('comments.title')} className="space-y-3">
      {comments.length === 0 ? (
        <EmptyState title={t('comments.empty')} />
      ) : (
        <ol className="space-y-2">
          {comments.map((c) => (
            <li
              key={c.id}
              className={`rounded-md border p-3 text-sm ${
                c.resolved ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'
              }`}
            >
              <p className="text-slate-800">{c.comment_text}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>{formatRelative(c.created_at, language)}</span>
                <button
                  type="button"
                  onClick={() => toggleResolved(c.id, !c.resolved)}
                  className="font-semibold text-vertex-600 hover:text-vertex-700"
                >
                  {c.resolved ? t('comments.unresolve') : t('comments.resolve')}
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="space-y-2">
        <label htmlFor="new-comment" className="sr-only">
          {t('comments.placeholder')}
        </label>
        <textarea
          id="new-comment"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('comments.placeholder')}
          rows={2}
          className="vertex-input"
        />
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            className="vertex-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleSend}
            disabled={submitting || !text.trim()}
          >
            {submitting ? t('comments.sending') : t('comments.send')}
          </button>
        </div>
      </div>
    </section>
  );
}
