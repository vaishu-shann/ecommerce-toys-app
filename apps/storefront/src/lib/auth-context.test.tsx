import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

/**
 * The auth context subscribes once to sign-in changes and shares `{ uid, ready }`. `onUidChanged`
 * is mocked so the test drives the auth state without the browser SDK. A signed-in uid also
 * triggers a guest-cart merge before `ready` flips, so the bag and checkout wait for fold-in.
 */

let listener: ((uid: string | null) => void) | null = null;
const onUidChanged = vi.hoisted(() => vi.fn());
const merge = vi.hoisted(() => vi.fn(() => Promise.resolve({ items: [] })));

vi.mock('./firebase-client', () => ({
  onUidChanged: (fn: (uid: string | null) => void) => {
    onUidChanged(fn);
    return () => {
      /* unsubscribe */
    };
  },
}));

vi.mock('./cart-api', () => ({
  cartApi: { merge },
}));

const { AuthProvider, useAuth } = await import('./auth-context');

function Probe() {
  const { uid, ready } = useAuth();
  return <span>{ready ? `uid:${uid ?? 'none'}` : 'loading'}</span>;
}

describe('AuthProvider', () => {
  it('starts not-ready, merges on sign-in, then reflects the resolved uid', async () => {
    merge.mockReset();
    merge.mockResolvedValue({ items: [] });
    onUidChanged.mockImplementation((fn: (uid: string | null) => void) => {
      listener = fn;
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    // Before the first callback lands, the state is loading.
    expect(screen.getByText('loading')).toBeInTheDocument();

    act(() => {
      listener?.('cust-1');
    });
    await waitFor(() => {
      expect(screen.getByText('uid:cust-1')).toBeInTheDocument();
    });
    expect(merge).toHaveBeenCalledTimes(1);

    act(() => {
      listener?.(null);
    });
    await waitFor(() => {
      expect(screen.getByText('uid:none')).toBeInTheDocument();
    });
    // Signing out does not merge.
    expect(merge).toHaveBeenCalledTimes(1);
  });

  it('still becomes ready when merge fails', async () => {
    merge.mockReset();
    merge.mockRejectedValue(new Error('network'));
    onUidChanged.mockImplementation((fn: (uid: string | null) => void) => {
      listener = fn;
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    act(() => {
      listener?.('cust-1');
    });
    await waitFor(() => {
      expect(screen.getByText('uid:cust-1')).toBeInTheDocument();
    });
  });
});
