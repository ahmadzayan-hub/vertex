import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, describe, it, expect, vi } from 'vitest';

import i18n from '@/utils/i18n';
import { LoginForm } from '@/components/auth/LoginForm';
import { AuthContext, type AuthContextValue } from '@/hooks/useAuth';

afterEach(cleanup);

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

function renderForm(configured: boolean, login = vi.fn().mockResolvedValue({ ok: true })) {
  const value = {
    user: null,
    profile: null,
    session: null,
    loading: false,
    login,
    logout: vi.fn(),
  } as unknown as AuthContextValue;
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter>
        <LoginForm configured={configured} />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
  return { login };
}

describe('LoginForm', () => {
  it('shows a configuration notice and never calls login when Supabase is missing', async () => {
    const { login } = renderForm(false);
    expect(screen.getByRole('status')).toHaveTextContent(/not connected to a Supabase project/i);

    await userEvent.type(screen.getByLabelText('Email address'), 'a@b.co');
    await userEvent.type(screen.getByLabelText('Password'), 'Password1');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(login).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/no Supabase project is configured/i);
  });

  it('calls login when Supabase is configured', async () => {
    const { login } = renderForm(true);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Email address'), 'a@b.co');
    await userEvent.type(screen.getByLabelText('Password'), 'Password1');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(login).toHaveBeenCalledWith('a@b.co', 'Password1');
  });

  it('toggles the password reset help instead of being a dead link', async () => {
    renderForm(true);
    const toggle = screen.getByRole('button', { name: 'Forgot password?' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/workspace administrator/i)).not.toBeInTheDocument();

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/workspace administrator/i)).toBeInTheDocument();
  });
});
