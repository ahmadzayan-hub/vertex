import type { ReactNode } from 'react';

interface BiDiTextProps {
  children: ReactNode;
  /**
   * Force a direction for embedded latin/numeric content inside an RTL
   * paragraph (or vice versa). Defaults to "ltr" - useful for currency
   * amounts, contract refs, and email addresses inside Arabic UI.
   */
  dir?: 'ltr' | 'rtl';
  className?: string;
}

export function BiDiText({ children, dir = 'ltr', className }: BiDiTextProps) {
  return (
    <span dir={dir} className={`bidi-isolate ${className ?? ''}`}>
      {children}
    </span>
  );
}
