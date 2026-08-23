import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';

import { supabase } from '@/utils/supabase';
import { useLanguage } from '@/hooks/useLanguage';

interface Hit {
  kind: 'route' | 'project' | 'submission';
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

interface PaletteCtx {
  open: () => void;
}
const Ctx = createContext<PaletteCtx>({ open: () => {} });
// eslint-disable-next-line react-refresh/only-export-components
export const useCommandPalette = () => useContext(Ctx);

const ROUTE_HITS: Hit[] = [
  { kind: 'route', id: 'r-dashboard', title: 'Dashboard', href: '/dashboard' },
  { kind: 'route', id: 'r-upload', title: 'Upload submission', href: '/upload' },
  { kind: 'route', id: 'r-kpi', title: 'KPI tracker', href: '/kpi' },
  { kind: 'route', id: 'r-obligations', title: 'Obligations', href: '/obligations' },
  { kind: 'route', id: 'r-insurance', title: 'Insurance renewals', href: '/insurance' },
  { kind: 'route', id: 'r-projects', title: 'Projects', href: '/projects' },
  { kind: 'route', id: 'r-analytics', title: 'Analytics', href: '/analytics' },
  { kind: 'route', id: 'r-reports', title: 'Reports', href: '/reports' },
];

function includesCI(hay: string, needle: string): boolean {
  return hay.toLowerCase().includes(needle.toLowerCase());
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[]>(ROUTE_HITS);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => {
    setVisible(false);
    setQuery('');
    setActive(0);
  }, []);

  // Global keybinding: Cmd/Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isK = e.key.toLowerCase() === 'k';
      if (isK && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setVisible((v) => !v);
        return;
      }
      if (e.key === 'Escape') setVisible(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (visible) requestAnimationFrame(() => inputRef.current?.focus());
  }, [visible]);

  // Query runs against Supabase for matching projects + submissions. Debounced
  // via a small timer; routes come from the static list above.
  useEffect(() => {
    if (!visible) return;
    if (!query.trim()) {
      setHits(ROUTE_HITS);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const q = query.trim();
    const handle = window.setTimeout(async () => {
      const [projRes, subRes] = await Promise.all([
        supabase
          .from('projects')
          .select('id, name, contract_ref')
          .or(`name.ilike.%${q}%,contract_ref.ilike.%${q}%`)
          .limit(6),
        supabase
          .from('submissions')
          .select('id, document_name, project_id')
          .ilike('document_name', `%${q}%`)
          .limit(6),
      ]);
      if (cancelled) return;
      const local = ROUTE_HITS.filter((h) => includesCI(h.title, q));
      const projects: Hit[] = (projRes.data ?? []).map((p) => ({
        kind: 'project',
        id: `p-${p.id}`,
        title: p.name,
        subtitle: p.contract_ref,
        href: `/projects/${p.id}`,
      }));
      const submissions: Hit[] = (subRes.data ?? []).map((s) => ({
        kind: 'submission',
        id: `s-${s.id}`,
        title: s.document_name,
        subtitle: 'Submission',
        href: `/submissions/${s.id}`,
      }));
      setHits([...local, ...projects, ...submissions]);
      setActive(0);
      setLoading(false);
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query, visible]);

  const goto = useCallback(
    (hit: Hit) => {
      close();
      navigate(hit.href);
    },
    [navigate, close]
  );

  const kindLabel = useMemo(
    () => ({ route: t('common.search'), project: t('project.title'), submission: t('submission.title') }),
    [t]
  );

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      {visible && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('common.search')}
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 p-4 sm:p-16"
          onClick={close}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-200 p-3">
              <label htmlFor="cp-input" className="sr-only">
                {t('common.search')}
              </label>
              <input
                id="cp-input"
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, hits.length - 1)); }
                  if (e.key === 'ArrowUp')   { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
                  if (e.key === 'Enter')     {
                    const hit = hits[active];
                    if (hit) goto(hit);
                  }
                }}
                placeholder={t('common.search')}
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-vertex-500"
                autoComplete="off"
              />
            </div>
            <ul role="listbox" aria-label={t('common.search')} className="max-h-80 overflow-auto p-2">
              {hits.length === 0 && !loading && (
                <li className="px-3 py-6 text-center text-sm text-slate-500">
                  {t('common.unknown')}
                </li>
              )}
              {hits.map((hit, idx) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={idx === active}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => goto(hit)}
                    className={`flex w-full items-start gap-3 rounded-md px-3 py-2 text-start text-sm transition ${
                      idx === active ? 'bg-vertex-50 text-vertex-900' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] font-semibold uppercase text-slate-600"
                    >
                      {hit.kind[0]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{hit.title}</span>
                      {hit.subtitle && (
                        <span className="block truncate text-xs text-slate-500">
                          {kindLabel[hit.kind]} · {hit.subtitle}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
              <span>↑ ↓ · Enter · Esc</span>
              <span>{loading ? t('common.loading') : `${hits.length}`}</span>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
