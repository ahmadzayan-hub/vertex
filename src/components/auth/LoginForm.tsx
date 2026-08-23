import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { validateEmail, validatePassword } from '@/utils/formatters';

interface LocationState {
  from?: { pathname?: string };
}

export function LoginForm() {
  const { t } = useLanguage();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from?.pathname ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!validateEmail(email)) {
      setError(t('errors.invalidEmail'));
      return;
    }
    const pw = validatePassword(password);
    if (!pw.valid) {
      setError(
        pw.reason === 'tooShort' ? t('errors.passwordTooShort') : t('errors.passwordWeak'),
      );
      return;
    }

    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if (!result.ok) {
      setError(t('errors.loginFailed'));
      return;
    }
    navigate(from, { replace: true });
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-describedby={error ? 'login-error' : undefined}>
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
            {t('auth.email')}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.emailPlaceholder')}
            className="vertex-input"
            aria-invalid={error ? 'true' : 'false'}
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
            {t('auth.password')}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.passwordPlaceholder')}
            className="vertex-input"
            aria-describedby="password-hint"
            aria-invalid={error ? 'true' : 'false'}
          />
          <p id="password-hint" className="mt-1 text-xs text-slate-500">
            {t('auth.passwordHint')}
          </p>
        </div>

        {error && (
          <div
            id="login-error"
            role="alert"
            className="rounded-lg border border-status-red/40 bg-red-50 px-3 py-2 text-sm text-status-red"
          >
            {error}
          </div>
        )}

        <button type="submit" className="vertex-btn-primary w-full" disabled={submitting}>
          {submitting ? t('auth.loggingIn') : t('auth.login')}
        </button>

        <div className="text-center">
          <a
            href="#"
            className="text-sm text-vertex-600 hover:underline focus-visible:underline"
            onClick={(e) => e.preventDefault()}
          >
            {t('auth.forgot')}
          </a>
        </div>
      </div>
    </form>
  );
}
