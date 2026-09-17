import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The register form creates the account through the API, signs in with the same credentials, and
 * surfaces the server's message on failure (a taken identifier). Password strength is assessed with
 * the real `@romp/core` policy, so a weak password blocks submission before a round trip.
 */

const register = vi.hoisted(() =>
  vi.fn<() => Promise<{ uid: string; loginEmail: string; primaryIdentifierType: string }>>(),
);
const signIn = vi.hoisted(() => vi.fn<(loginEmail: string, password: string) => Promise<void>>());
const push = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());

vi.mock('@/lib/account-api', () => ({
  accountApi: { register },
  AccountApiError: class AccountApiError extends Error {
    status: number;
    code: string;
    constructor(status: number, code: string, detail: string) {
      super(detail);
      this.name = 'AccountApiError';
      this.status = status;
      this.code = code;
    }
  },
}));
vi.mock('@/lib/firebase-client', () => ({ signInWithLoginEmail: signIn }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));

const { RegisterForm } = await import('./RegisterForm');

const STRONG = 'copper lantern drift meadow';

beforeEach(() => {
  register.mockReset();
  signIn.mockReset();
  push.mockReset();
  refresh.mockReset();
});

async function fill(user: ReturnType<typeof userEvent.setup>, password: string): Promise<void> {
  await user.type(screen.getByLabelText(/your name/iu), 'Asha');
  await user.type(screen.getByLabelText(/email or mobile/iu), 'asha@example.com');
  await user.type(screen.getByLabelText(/password/iu), password);
}

describe('RegisterForm', () => {
  it('registers, signs in and navigates to the account', async () => {
    register.mockResolvedValue({
      uid: 'cust-1',
      loginEmail: 'asha@example.com',
      primaryIdentifierType: 'email',
    });
    signIn.mockResolvedValue();
    const user = userEvent.setup();
    render(<RegisterForm />);

    await fill(user, STRONG);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith(
        expect.objectContaining({ identifier: 'asha@example.com', displayName: 'Asha' }),
      );
    });
    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('asha@example.com', STRONG);
    });
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/account');
    });
  });

  it('surfaces the server message when the identifier is taken', async () => {
    const { AccountApiError } = await import('@/lib/account-api');
    register.mockRejectedValue(
      new AccountApiError(409, 'IDENTIFIER_TAKEN', 'That is already registered.'),
    );
    const user = userEvent.setup();
    render(<RegisterForm />);

    await fill(user, STRONG);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('That is already registered.')).toBeInTheDocument();
  });

  it('tells the customer to sign in when Auth fails after a created account', async () => {
    register.mockResolvedValue({
      uid: 'cust-1',
      loginEmail: 'asha@example.com',
      primaryIdentifierType: 'email',
    });
    signIn.mockRejectedValue(Object.assign(new Error('network'), { code: 'auth/invalid-api-key' }));
    const user = userEvent.setup();
    render(<RegisterForm />);

    await fill(user, STRONG);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByText(/could not reach sign-in/iu),
    ).toBeInTheDocument();
  });

  it('blocks a weak password before any API call', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await fill(user, 'aaa');
    // The submit button is disabled while the password is weak; the strength suggestion shows.
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
    expect(register).not.toHaveBeenCalled();
  });
});
