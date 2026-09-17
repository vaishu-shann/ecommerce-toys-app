'use client';

import type { ReactNode } from 'react';

import { useAuth } from '@/lib/auth-context';

import { AccountHeading } from './AccountHeading';
import { SignedOut } from './SignedOut';

/**
 * Honest empty screens for account destinations that have no API yet.
 *
 * Payment methods, coins, referrals and kids profiles exist in the mock sidebar.
 * This store only charges UPI per order and does not persist cards, coin ledgers,
 * referral codes or child profiles — so these pages explain that, rather than
 * inventing balances.
 */
export function AccountPlaceholder({
  title,
  headingId,
  next,
  message,
  children,
}: {
  readonly title: string;
  readonly headingId: string;
  readonly next: string;
  readonly message: string;
  readonly children: ReactNode;
}) {
  const { uid, ready } = useAuth();

  if (!ready) return <p className="font-body text-text-muted">Loading…</p>;
  if (uid === null) return <SignedOut next={next} message={message} />;

  return (
    <section className="flex flex-col gap-4" aria-labelledby={headingId}>
      <AccountHeading id={headingId}>{title}</AccountHeading>
      <div className="account-panel p-6 sm:p-8">
        <div className="flex max-w-xl flex-col gap-3 font-body text-sm leading-relaxed text-text-secondary">
          {children}
        </div>
      </div>
    </section>
  );
}
