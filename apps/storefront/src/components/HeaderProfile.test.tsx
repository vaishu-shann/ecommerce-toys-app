import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MeResponse } from '@romp/contracts';

const me = vi.hoisted(() => vi.fn<() => Promise<MeResponse>>());
const auth = vi.hoisted((): { current: { uid: string | null; ready: boolean } } => ({
  current: { uid: 'cust-1', ready: true },
}));

vi.mock('@/lib/account-api', () => ({
  accountApi: { me },
  AccountApiError: class AccountApiError extends Error {},
}));
vi.mock('@/lib/auth-context', () => ({ useAuth: () => auth.current }));

const { HeaderProfile } = await import('./HeaderProfile');

const profile: MeResponse = {
  uid: 'cust-1',
  displayName: 'Aditi Rao',
  primaryIdentifierType: 'email',
  emailPresent: true,
  phonePresent: false,
  orderCount: 1,
};

beforeEach(() => {
  me.mockReset().mockResolvedValue(profile);
  auth.current = { uid: 'cust-1', ready: true };
});

describe('HeaderProfile', () => {
  it('shows the first letter of the signed-in name', async () => {
    render(<HeaderProfile />);
    await waitFor(() => {
      expect(screen.getByText('A')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'Your account' })).toHaveAttribute('href', '/account');
  });

  it('keeps a round guest mark when signed out', () => {
    auth.current = { uid: null, ready: true };
    render(<HeaderProfile />);
    expect(screen.getByRole('link', { name: 'Your account' })).toBeInTheDocument();
    expect(screen.queryByText('A')).not.toBeInTheDocument();
    expect(me).not.toHaveBeenCalled();
  });
});
