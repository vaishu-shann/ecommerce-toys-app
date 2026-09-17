'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';

import type { MeResponse } from '@romp/contracts';
import { Button } from '@romp/ui';

import { accountApi } from '@/lib/account-api';
import { useAuth } from '@/lib/auth-context';
import { signOutCustomer } from '@/lib/firebase-client';
import { features } from '@/lib/store';

import {
  ACCOUNT_PROFILE_HREF,
  accountInitials,
  isAccountNavActive,
  isProfileActive,
  visibleAccountNav,
} from './account-nav';

/**
 * Signed-in account chrome: the mock's left profile card plus the page body.
 *
 * Sign-in and register stay a dedicated stage (StoreShell already strips shop
 * chrome). Signed-out account pages render their own prompt, without an empty
 * sidebar. Profile, orders and the rest keep their existing API calls — this
 * shell only wraps them.
 */
export function AccountShell({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const isAuthStage = pathname === '/account/sign-in' || pathname === '/account/register';

  if (isAuthStage) return children;

  return <AccountFrame pathname={pathname}>{children}</AccountFrame>;
}

function AccountFrame({
  pathname,
  children,
}: {
  readonly pathname: string;
  readonly children: ReactNode;
}) {
  const { uid, ready } = useAuth();
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    if (uid === null) {
      setMe(null);
      return;
    }
    void accountApi
      .me()
      .then(setMe)
      .catch(() => {
        setMe(null);
      });
  }, [uid]);

  if (!ready || uid === null) return children;

  const displayName = me?.displayName ?? null;
  const initials = displayName === null ? '·' : accountInitials(displayName);
  const items = visibleAccountNav(features.wishlist);
  const profileCurrent = isProfileActive(pathname);

  const signOut = (): void => {
    void signOutCustomer().then(() => {
      router.push('/');
      router.refresh();
    });
  };

  return (
    <div className="account-frame">
      <aside className="account-rail">
        <Link
          href={ACCOUNT_PROFILE_HREF}
          className="account-identity"
          aria-current={profileCurrent ? 'page' : undefined}
        >
          <span className="account-avatar" aria-hidden="true">
            {initials}
          </span>
          <span className="min-w-0">
            <span className="account-name">{displayName ?? '…'}</span>
            <span className="account-meta">ROMP member</span>
          </span>
        </Link>

        <nav aria-label="Account" className="account-nav">
          {items.map((item) => {
            const current = isAccountNavActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="account-nav-link"
                aria-current={current ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {me !== null ? (
          <div className="account-stat">
            <div className="account-stat-value">{me.orderCount}</div>
            <div className="account-stat-label">Orders placed</div>
          </div>
        ) : null}

        <Button variant="ghost" size="sm" onClick={signOut} className="account-signout">
          Sign out
        </Button>
      </aside>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
