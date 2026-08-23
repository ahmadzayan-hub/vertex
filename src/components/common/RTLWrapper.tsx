import type { ReactNode } from 'react';
import { useRTL } from '@/hooks/useRTL';

interface RTLWrapperProps {
  children: ReactNode;
}

/**
 * Mounts useRTL so that <html dir> and <html lang> follow the active i18n
 * language. Renders children unchanged.
 */
export function RTLWrapper({ children }: RTLWrapperProps) {
  useRTL();
  return <>{children}</>;
}
