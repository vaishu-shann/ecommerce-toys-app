'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth-context';
import { cartApi } from '@/lib/cart-api';

/**
 * The header's bag count.
 *
 * A client island that waits for auth to resolve, fetches the cart's item count, and shows it as a
 * small badge on the bag icon. Waiting for `ready` keeps the count on the uid cart after a leftover
 * guest bag has been folded in, rather than racing a cookie GET against an empty account cart. It
 * is best-effort and quiet: if the fetch fails, or the cart is empty, nothing renders — a missing
 * badge is a smaller problem than a broken header. A full live subscription across tabs is a later
 * refinement; for v1.0 the count is accurate on load and after a navigation, which is when it
 * matters.
 */
export function CartBadge({ className }: { readonly className?: string } = {}) {
  const { ready } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    void cartApi
      .get()
      .then((view) => {
        if (active) setCount(view.itemCount);
      })
      .catch(() => {
        // A header badge is not worth surfacing an error for.
      });
    return () => {
      active = false;
    };
  }, [ready]);

  if (count <= 0) return null;

  return (
    <span
      aria-label={`${String(count)} item${count === 1 ? '' : 's'} in your cart`}
      className={
        className ??
        'absolute -top-1.5 -right-1.5 inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-pill bg-primary px-1 font-body text-[10px] font-extrabold leading-none text-primary-on'
      }
    >
      {count}
    </span>
  );
}
