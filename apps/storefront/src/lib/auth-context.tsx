'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { cartApi } from './cart-api';
import { onUidChanged } from './firebase-client';

/**
 * The app-wide customer auth state.
 *
 * One subscription to sign-in changes, shared through context, so every feature reads the same
 * `{ uid, ready }` rather than each wiring its own `onUidChanged` (the pattern the checkout page and
 * the bell used before this existed). `ready` is false until the first auth callback lands — and,
 * when that callback is a signed-in uid, until the leftover guest cart has been folded into the
 * account — so a page can show a spinner rather than flashing the signed-out state, and the bag
 * and checkout do not read `carts/{uid}` before merge has run.
 *
 * A client provider mounted in the root layout wraps the whole tree, header included, so the
 * notification bell and the account pages share one source of truth for the current uid.
 */

export interface AuthState {
  /** The signed-in customer's uid, or null when signed out (or the SDK is unconfigured). */
  readonly uid: string | null;
  /** False until the first auth state has resolved; true thereafter. */
  readonly ready: boolean;
}

const AuthContext = createContext<AuthState>({ uid: null, ready: false });

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [uid, setUid] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let generation = 0;
    return onUidChanged((next) => {
      const current = ++generation;
      void (async () => {
        if (next !== null) {
          try {
            await cartApi.merge();
          } catch {
            // Merge is best-effort: quote and cart GET also fold a leftover cookie server-side.
          }
        }
        if (current !== generation) return;
        setUid(next);
        setReady(true);
      })();
    });
    // Re-subscribe when this module hot-reloads so emulator Auth swaps are visible.
  }, []);

  const value = useMemo<AuthState>(() => ({ uid, ready }), [uid, ready]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** The current customer auth state, from the nearest `AuthProvider`. */
export function useAuth(): AuthState {
  return useContext(AuthContext);
}
