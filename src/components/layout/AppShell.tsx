import { useState, type ReactNode } from 'react';

import { useLanguage } from '@/hooks/useLanguage';

import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';

interface AppShellProps {
  pageTitle?: string;
  children: ReactNode;
}

export function AppShell({ pageTitle, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <a href="#main" className="skip-link">
        {t('app.skipToMain')}
      </a>
      <Header
        pageTitle={pageTitle}
        menuOpen={sidebarOpen}
        onMenuToggle={() => setSidebarOpen((v) => !v)}
      />
      <div className="flex flex-1">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main
          id="main"
          aria-label="Main content"
          className="flex-1 px-4 py-6 md:px-8 md:py-8"
        >
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}
