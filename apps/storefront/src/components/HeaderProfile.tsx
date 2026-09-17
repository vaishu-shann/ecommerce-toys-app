'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { accountApi } from '@/lib/account-api';
import { useAuth } from '@/lib/auth-context';

import { accountAvatarLetter } from './account/account-nav';

/**
 * Round header avatar — first letter of the signed-in name, like a chat DP.
 *
 * Signed out, a silhouette on a muted circle still links to account so the control
 * never disappears. The letter comes from `GET /v1/account/me`, the same profile
 * the account rail uses, not a guessed Firebase display name.
 */
export function HeaderProfile() {
  const { uid } = useAuth();
  const [letter, setLetter] = useState<string | null>(null);

  useEffect(() => {
    if (uid === null) {
      setLetter(null);
      return;
    }
    let active = true;
    void accountApi
      .me()
      .then((profile) => {
        if (active) setLetter(accountAvatarLetter(profile.displayName));
      })
      .catch(() => {
        if (active) setLetter(null);
      });
    return () => {
      active = false;
    };
  }, [uid]);

  const signedIn = letter !== null;

  return (
    <Link href="/account" aria-label="Your account" className="header-action">
      <span className={signedIn ? 'header-avatar' : 'header-avatar header-avatar--guest'}>
        {signedIn ? letter : <GuestMark />}
      </span>
    </Link>
  );
}

function GuestMark() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true" fill="none">
      <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M4 16c1.4-2.8 3.8-4 6-4s4.6 1.2 6 4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
