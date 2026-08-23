import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/**
 * Wraps the `beforeinstallprompt` event so the UI can show a custom install
 * button that fires the browser's native install dialog. On iOS Safari the
 * event never fires, so `install()` resolves without action and the UI should
 * fall back to the manual "Add to Home Screen" instructions.
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const installedHandler = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    if (window.matchMedia('(display-mode: standalone)').matches) setInstalled(true);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return { outcome: 'dismissed' as const };
    await deferred.prompt();
    const result = await deferred.userChoice;
    setDeferred(null);
    return result;
  }, [deferred]);

  return {
    canInstall: deferred !== null && !installed,
    installed,
    install,
  };
}
