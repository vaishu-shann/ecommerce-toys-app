'use client';

import { useAuth } from '@/lib/auth-context';

import { AccountHeading } from './AccountHeading';
import { SignedOut } from './SignedOut';

/**
 * ROMP coins — mock layout, honest contents.
 *
 * There is no coin ledger API, so the balance is zero and the history is empty rather than
 * inventing rewards, redemptions or a rupee conversion.
 */
export function CoinsView() {
  const { uid, ready } = useAuth();

  if (!ready) return <p className="font-body text-text-muted">Loading…</p>;
  if (uid === null)
    return <SignedOut next="/account/coins" message="Sign in to see ROMP coins." />;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="coins-heading">
      <AccountHeading id="coins-heading">ROMP coins</AccountHeading>

      <article className="account-panel px-6 py-6 sm:px-7 sm:py-7">
        <div className="account-coin-head">
          <p className="account-coin-value">0</p>
          <p className="account-coin-caption">
            coins · not issued
            <br />
            on this storefront yet
          </p>
        </div>
        <hr className="account-rule" />
        <p className="font-body text-sm text-text-muted">
          When coins go live, your balance and every credit or redemption will list here.
        </p>
      </article>
    </section>
  );
}
