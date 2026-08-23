import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { useLanguage } from '@/hooks/useLanguage';
import { formatRelative } from '@/utils/formatters';
import type { ActivityEvent } from '@/types';

interface Props {
  events: ActivityEvent[];
}

const DOT: Record<string, string> = {
  submission_uploaded: 'bg-vertex-500',
  finding_created: 'bg-amber-500',
  comment_added: 'bg-slate-400',
};

export function RecentActivity({ events }: Props) {
  const { t, language } = useLanguage();
  if (events.length === 0) {
    return <EmptyState title={t('dashboard.widgets.recentActivityEmpty')} />;
  }
  return (
    <ol className="divide-y divide-slate-100">
      {events.map((e) => (
        <li key={e.event_id} className="flex items-start gap-3 py-3">
          <span
            aria-hidden="true"
            className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${DOT[e.event_type] ?? 'bg-slate-400'}`}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-800">
              <Link
                to={`/submissions/${e.submission_id}`}
                className="hover:text-vertex-700 focus:outline-none focus:ring-2 focus:ring-vertex-500"
              >
                {t(`dashboard.activity.${e.event_type}`)}: {e.title}
              </Link>
            </p>
            <p className="text-xs text-slate-500">{formatRelative(e.occurred_at, language)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
