'use client';

import { useAuth } from '@/lib/auth-context';

import { AccountHeading } from './AccountHeading';
import { SignedOut } from './SignedOut';

const STATS = [
  { label: 'Invites sent', value: '0' },
  { label: 'Signed up', value: '0' },
  { label: 'First orders', value: '0' },
  { label: 'Coins earned', value: '0' },
] as const;

/**
 * Refer & earn — mock layout, honest contents.
 *
 * There is no referral-code or invite API, so the hero matches the mock chrome, the personal
 * code and friend list stay empty, and the stats stay zero rather than inventing a code or
 * invitees.
 */
export function ReferView() {
  const { uid, ready } = useAuth();

  if (!ready) return <p className="font-body text-text-muted">Loading…</p>;
  if (uid === null)
    return <SignedOut next="/account/refer" message="Sign in to see referrals." />;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="refer-heading">
      <AccountHeading id="refer-heading">Refer & earn</AccountHeading>

      <article className="account-panel px-6 py-6 sm:px-7 sm:py-7">
        <div className="account-refer-hero">
          <div className="min-w-0 flex-1">
            <h2 className="account-refer-title">
              Give ₹200,
              <br />
              get 200 coins
            </h2>
            <p className="account-refer-body">
              Referral rewards are not live yet. When they are, you will share a code from this
              page — we will not invent one until the programme exists.
            </p>
            <div className="account-refer-code-row">
              <p className="account-code-chip">Your code soon</p>
              <button type="button" className="account-btn-lime" disabled>
                Copy code
              </button>
            </div>
            <div className="account-share-row">
              <button type="button" className="account-share" disabled>
                Share on WhatsApp
              </button>
              <button type="button" className="account-share" disabled>
                Copy link
              </button>
              <button type="button" className="account-share" disabled>
                Email invite
              </button>
            </div>
          </div>
          <dl className="account-refer-stats">
            {STATS.map((stat) => (
              <div key={stat.label} className="account-refer-stat">
                <dt>{stat.label}</dt>
                <dd>{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </article>

      <article className="account-panel overflow-hidden">
        <h2 className="account-panel-kicker">Friends you invited</h2>
        <p className="px-6 py-8 font-body text-sm text-text-muted sm:px-7">
          No invites yet. Friends you refer will list here with whether they signed up or
          ordered.
        </p>
        <p className="account-panel-foot">
          Coins are credited once a referred order ships — when this programme is live.
        </p>
      </article>
    </section>
  );
}
