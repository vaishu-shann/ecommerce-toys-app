'use client';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MeResponse } from '@romp/contracts';

const me = vi.hoisted(() => vi.fn<() => Promise<MeResponse>>());
const signOutCustomer = vi.hoisted(() => vi.fn<() => Promise<void>>());
const push = vi.hoisted(() => vi.fn());
const pathname = vi.hoisted(() => ({ current: '/account/orders' }));
const auth = vi.hoisted((): { current: { uid: string | null; ready: boolean } } => ({
  current: { uid: 'cust-1', ready: true },
}));

vi.mock('@/lib/account-api', () => ({
  accountApi: { me },
  AccountApiError: class AccountApiError extends Error {},
}));
vi.mock('@/lib/auth-context', () => ({ useAuth: () => auth.current }));
vi.mock('@/lib/firebase-client', () => ({ signOutCustomer }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  usePathname: () => pathname.current,
}));

const { AccountShell } = await import('./AccountShell');

const profile: MeResponse = {
  uid: 'cust-1',
  displayName: 'Aditi Rao',
  primaryIdentifierType: 'email',
  emailPresent: true,
  phonePresent: false,
  orderCount: 3,
};

beforeEach(() => {
  me.mockReset().mockResolvedValue(profile);
  signOutCustomer.mockReset().mockResolvedValue(undefined);
  push.mockReset();
  pathname.current = '/account/orders';
  auth.current = { uid: 'cust-1', ready: true };
});

describe('AccountShell', () => {
  it('renders the sidebar with the profile name and highlights Orders', async () => {
    render(
      <AccountShell>
        <p>Orders body</p>
      </AccountShell>,
    );

    expect(await screen.findByText('Aditi Rao')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Orders' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/orders placed/iu)).toBeInTheDocument();
  });

  it('signs out from the rail', async () => {
    const user = userEvent.setup();
    render(
      <AccountShell>
        <p>Body</p>
      </AccountShell>,
    );
    await user.click(await screen.findByRole('button', { name: 'Sign out' }));
    await waitFor(() => {
      expect(signOutCustomer).toHaveBeenCalled();
    });
  });

  it('skips the rail when signed out so the page prompt can show', () => {
    auth.current = { uid: null, ready: true };
    render(
      <AccountShell>
        <p>Sign in to see your orders.</p>
      </AccountShell>,
    );
    expect(screen.queryByRole('navigation', { name: 'Account' })).not.toBeInTheDocument();
    expect(screen.getByText(/sign in to see your orders/iu)).toBeInTheDocument();
  });
});
