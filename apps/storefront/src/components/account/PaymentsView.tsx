'use client';

import { useAuth } from '@/lib/auth-context';

import { AccountHeading } from './AccountHeading';
import { SignedOut } from './SignedOut';

/**
 * Payment methods — mock layout, honest contents.
 *
 * The storefront charges each order with a UPI QR. There is no saved-card or saved-UPI API, so
 * this page renders the mock's instrument list empty rather than inventing banks, last-four
 * digits or a default card.
 */
export function PaymentsView() {
  const { uid, ready } = useAuth();

  if (!ready) return <p className="font-body text-text-muted">Loading…</p>;
  if (uid === null)
    return <SignedOut next="/account/payments" message="Sign in to see how you pay." />;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="payments-heading">
      <AccountHeading id="payments-heading">Payment methods</AccountHeading>

      <ul className="flex flex-col gap-2.5">
        <li>
          <p className="account-panel px-6 py-7 font-body text-sm text-text-muted">
            No cards or UPI IDs are saved on your account. Each order is paid with a UPI QR
            generated at checkout for that total.
          </p>
        </li>
      </ul>

      <p className="account-pay-add">+ Add a card or UPI ID</p>
      <p className="account-footnote">
        Pay from the order itself when a QR is waiting. We do not store card numbers or UPI IDs.
      </p>
    </section>
  );
}
