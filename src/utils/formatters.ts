import type { SupportedLanguage } from './i18n';

const localeMap: Record<SupportedLanguage, string> = {
  en: 'en-AE',
  ar: 'ar-AE',
};

export function formatCurrencyAED(value: number, lang: SupportedLanguage): string {
  return new Intl.NumberFormat(localeMap[lang], {
    style: 'currency',
    currency: 'AED',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(
  date: Date | string | number,
  lang: SupportedLanguage,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return new Intl.DateTimeFormat(localeMap[lang], options).format(d);
}

export function formatPercent(value: number, lang: SupportedLanguage): string {
  return new Intl.NumberFormat(localeMap[lang], {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value / 100);
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(password: string): {
  valid: boolean;
  reason?: 'tooShort' | 'weak';
} {
  if (password.length < 8) return { valid: false, reason: 'tooShort' };
  if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, reason: 'weak' };
  }
  return { valid: true };
}

export function formatRelative(
  isoOrDate: string | number | Date,
  lang: SupportedLanguage
): string {
  const d = typeof isoOrDate === 'string' || typeof isoOrDate === 'number' ? new Date(isoOrDate) : isoOrDate;
  const rtf = new Intl.RelativeTimeFormat(localeMap[lang], { numeric: 'auto' });
  const diffSec = Math.round((d.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 86400 * 7) return rtf.format(Math.round(diffSec / 86400), 'day');
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / (86400 * 7)), 'week');
  if (abs < 86400 * 365) return rtf.format(Math.round(diffSec / (86400 * 30)), 'month');
  return rtf.format(Math.round(diffSec / (86400 * 365)), 'year');
}
