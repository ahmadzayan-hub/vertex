import { NavLink } from 'react-router-dom';

import { useLanguage } from '@/hooks/useLanguage';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { t } = useLanguage();

  const items: NavItem[] = [
    { to: '/dashboard', label: t('nav.dashboard'), icon: '▦' },
    { to: '/upload', label: t('nav.upload'), icon: '⤴' },
    { to: '/kpi', label: t('kpiPage.title'), icon: '◎' },
    { to: '/obligations', label: t('obligationsPage.title'), icon: '◈' },
    { to: '/insurance', label: t('insurancePage.title'), icon: '◇' },
    { to: '/projects', label: t('nav.projects'), icon: '▣' },
    { to: '/analytics', label: t('analyticsPage.title'), icon: '◉' },
    { to: '/reports', label: t('reportsPage.title'), icon: '☷' },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-20 bg-slate-900/40 md:hidden"
        />
      )}

      <aside
        id="vertex-sidebar"
        aria-label={t('nav.main')}
        className={[
          'fixed top-16 z-30 h-[calc(100vh-4rem)] w-72 transform overflow-y-auto border-slate-200 bg-white transition-transform duration-200 ease-in-out',
          'inset-inline-start-0 border-inline-end',
          open ? 'translate-x-0' : 'rtl:translate-x-full ltr:-translate-x-full',
          'md:sticky md:top-16 md:translate-x-0 md:w-64 lg:w-72',
        ].join(' ')}
      >
        <nav aria-label={t('nav.main')} className="px-3 py-4">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition',
                      'focus-visible:ring-2 focus-visible:ring-vertex-500 focus-visible:ring-offset-2',
                      isActive
                        ? 'bg-vertex-50 text-vertex-700'
                        : 'text-slate-700 hover:bg-slate-50',
                    ].join(' ')
                  }
                >
                  <span aria-hidden="true" className="text-base">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}
