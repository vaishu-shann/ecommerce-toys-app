import Link from 'next/link';

import { CartBadge } from './CartBadge';

/**
 * Header cart control: icon plus a count badge on the corner.
 *
 * The count is a client island (`CartBadge`). The link stays a real `<a>` so the
 * bag remains reachable with JS off; an empty bag simply has no number.
 */
export function HeaderCart() {
  return (
    <Link href="/cart" aria-label="Your cart" className="header-action">
      <span className="relative inline-flex">
        <CartIcon />
        <CartBadge />
      </span>
    </Link>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true" fill="none">
      <path
        d="M3.5 4h1.2l.4 1.5L6.5 14h8.2l1.6-7.2H6.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="16.2" r="1.15" fill="currentColor" />
      <circle cx="13.6" cy="16.2" r="1.15" fill="currentColor" />
    </svg>
  );
}
