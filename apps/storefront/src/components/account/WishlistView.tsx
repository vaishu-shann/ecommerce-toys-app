'use client';

import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@romp/ui';

import { AccountApiError, accountApi } from '@/lib/account-api';
import { useAuth } from '@/lib/auth-context';
import { firestoreClient } from '@/lib/firebase-client';
import { content } from '@/lib/store';

import { AccountEmpty, AccountHeading } from './AccountHeading';
import { SignedOut } from './SignedOut';

/**
 * The customer's saved toys.
 *
 * Reads the wishlist directly from Firestore under the rules; removal goes through the API. The list
 * holds product IDs (the document ID is the product ID), each linking to its page. The empty state
 * is the store's own copy. Rendered only where the store has the wishlist feature on — the page
 * gates it.
 */
export function WishlistView() {
  const { uid, ready } = useAuth();
  const [productIds, setProductIds] = useState<readonly string[]>([]);
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const db = firestoreClient();
    if (uid === null || db === null) {
      setProductIds([]);
      return;
    }
    const snap = await getDocs(
      query(collection(db, 'users', uid, 'wishlist'), orderBy('addedAt', 'desc')),
    );
    setProductIds(snap.docs.map((doc) => doc.id));
  }, [uid]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!ready) return <p className="font-body text-text-muted">Loading…</p>;
  if (uid === null)
    return <SignedOut next="/account/wishlist" message="Sign in to see your saved toys." />;

  const empty = content.emptyStates.emptyWishlist;

  const remove = (productId: string): void => {
    setPending(productId);
    void accountApi
      .removeFromWishlist(productId)
      .then(() => load())
      .catch((cause: unknown) => {
        if (!(cause instanceof AccountApiError)) throw cause;
      })
      .finally(() => {
        setPending(null);
      });
  };

  return (
    <section className="flex flex-col gap-4" aria-labelledby="wishlist-heading">
      <AccountHeading id="wishlist-heading">Wishlist</AccountHeading>

      {productIds.length === 0 ? (
        <AccountEmpty title={empty.title} body={empty.body} />
      ) : (
        <ul className="flex flex-col gap-3">
          {productIds.map((productId) => (
            <li key={productId}>
              <article className="account-panel flex items-center justify-between gap-3 p-4 sm:p-5">
                <Link
                  href={`/p/${productId}`}
                  className="font-body text-[13.5px] font-bold text-text-primary hover:text-primary"
                >
                  {productId}
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  loading={pending === productId}
                  disabled={pending !== null}
                  onClick={() => {
                    remove(productId);
                  }}
                >
                  Remove
                </Button>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
