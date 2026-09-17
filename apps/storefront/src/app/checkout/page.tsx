import { CheckoutClient } from '@/components/CheckoutClient';

/**
 * The checkout page: `/checkout`.
 *
 * Dynamic and never cached — it acts as the signed-in customer, pricing their own cart and placing
 * their own order. The page is a thin server shell; `CheckoutClient` does the work client-side
 * because both the cart and the order path are reached through the API with the customer's session,
 * which a server render has no access to in v1.0.
 *
 * Width comes from the root `main` (`w-[90%]`), same as the bag — this page does not nest a second
 * landmark or pinch checkout into a narrower column.
 */
export const dynamic = 'force-dynamic';

export default function CheckoutPage() {
  return <CheckoutClient />;
}
