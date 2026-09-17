import { CartClient } from '@/components/CartClient';

/**
 * The cart page: `/cart`.
 *
 * Dynamic and never cached — a cart is per-visitor, and there is nothing to prerender. The page
 * itself is a thin server shell; the cart is fetched client-side by `CartClient` because it is
 * reached through the API by the signed guest cookie (or the signed-in uid), which a server render
 * has no session for in v1.0. Client auth (Task 20) will let a signed-in cart also render
 * server-side, but the API read is correct for the guest case today.
 *
 * Width comes from the root `main` (`w-[90%]`), same as listing and PDP — this page does not nest a
 * second landmark or pinch the bag into a narrower column.
 */
export const dynamic = 'force-dynamic';

export default function CartPage() {
  return <CartClient />;
}
