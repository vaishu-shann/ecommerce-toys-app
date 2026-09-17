'use client';

import Link from 'next/link';

import { useAuth } from '@/lib/auth-context';
import { content } from '@/lib/store';
import { useNotifications } from '@/lib/use-notifications';

import { AccountEmpty, AccountHeading } from './AccountHeading';
import { SignedOut } from './SignedOut';

/**
 * The full notification feed page.
 *
 * The navbar bell shows the newest few; this is the whole window, using the same live subscription
 * (`useNotifications`). Opening one marks it read — the one field the rules let a customer change.
 * The empty state and copy are the store's own.
 */
export function NotificationsFeed() {
  const { uid, ready } = useAuth();
  const { notifications, markRead } = useNotifications(uid);

  if (!ready) return <p className="font-body text-text-muted">Loading…</p>;
  if (uid === null)
    return <SignedOut next="/account/notifications" message="Sign in to see your updates." />;

  const empty = content.emptyStates.emptyNotifications;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="notifications-heading">
      <AccountHeading id="notifications-heading">Notifications</AccountHeading>

      {notifications.length === 0 ? (
        <AccountEmpty title={empty.title} body={empty.body} />
      ) : (
        <ul className="flex flex-col gap-3">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <Link
                href={notification.link}
                onClick={() => {
                  markRead(notification.id);
                }}
                className="account-panel flex flex-col gap-1 p-5 hover:border-border-strong"
              >
                <span className="flex items-center gap-2">
                  {!notification.read ? (
                    <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-primary" />
                  ) : null}
                  <span className="font-body text-[13.5px] font-bold text-text-primary">
                    {notification.title}
                  </span>
                </span>
                <span className="font-body text-sm text-text-muted">{notification.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
