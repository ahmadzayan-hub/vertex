import { useEffect, useRef, useState } from 'react';

import { Link } from 'react-router-dom';

import { Logo } from '@/components/brand/Logo';
import { useCommandPalette } from '@/components/common/CommandPalette';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { LanguageSwitcher } from './LanguageSwitcher';

interface HeaderProps {
  pageTitle?: string;
  onMenuToggle?: () => void;
  menuOpen?: boolean;
}

export function Header({ pageTitle, onMenuToggle, menuOpen = false }: HeaderProps) {
  const { t } = useLanguage();
  const { user, profile, logout } = useAuth();
  const { open: openPalette } = useCommandPalette();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setUserMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [userMenuOpen]);

  const displayName = profile?.full_name || user?.email || '';

  return (
    <header
      role="banner"
      className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm md:px-6"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          aria-expanded={menuOpen}
          aria-controls="vertex-sidebar"
          className="vertex-btn-secondary md:hidden"
        >
          <span aria-hidden="true" className="text-xl leading-none">
            {menuOpen ? '✕' : '☰'}
          </span>
        </button>

        <Link to="/dashboard" className="focus:outline-none focus:ring-2 focus:ring-vertex-500 rounded">
          <Logo ariaLabel={t('app.name')} />
        </Link>
        <span className="hidden text-xs text-slate-500 md:inline">{t('app.tagline')}</span>
      </div>

      {pageTitle && (
        <h1 className="hidden truncate text-base font-semibold text-slate-700 md:block">
          {pageTitle}
        </h1>
      )}

      <div className="flex items-center gap-2 md:gap-3">
        {user && (
          <button
            type="button"
            onClick={openPalette}
            aria-label={t('common.search')}
            className="vertex-btn-secondary hidden items-center gap-2 px-3 py-1.5 text-xs sm:inline-flex"
          >
            <span aria-hidden="true">⌘K</span>
            <span>{t('common.search')}</span>
          </button>
        )}
        <LanguageSwitcher />

        {user && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-label={t('user.menu')}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              className="vertex-btn-secondary gap-2 px-3 py-1.5 text-sm"
            >
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-vertex-100 text-xs font-semibold uppercase text-vertex-700"
              >
                {(displayName[0] || '?').toUpperCase()}
              </span>
              <span className="hidden max-w-[10rem] truncate sm:inline">{displayName}</span>
            </button>

            {userMenuOpen && (
              <div
                role="menu"
                aria-label={t('user.menu')}
                className="absolute end-0 mt-2 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setUserMenuOpen(false);
                    void logout();
                  }}
                  className="block w-full px-4 py-2 text-start text-sm text-slate-700 hover:bg-slate-50 focus:bg-slate-50"
                >
                  {t('nav.logout')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
