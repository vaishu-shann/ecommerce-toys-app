import { OrderConfirmation } from '@/components/OrderConfirmation';

/**
 * The order confirmation page: `/orders/{id}`.
 *
 * Dynamic and never cached — an order is the customer's own record, read through the API with their
 * session. The page is a thin server shell; `OrderConfirmation` fetches the order and renders the
 * confirmation (and the UPI QR while payment is still due) client-side, because the read is
 * authenticated and per-customer.
 *
 * Width comes from the root `main` (`w-[90%]`), same as checkout — this page does not nest a second
 * landmark or pinch the success layout into a narrower column.
 */
export const dynamic = 'force-dynamic';

interface OrderPageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { id } = await params;
  return <OrderConfirmation orderId={id} />;
}
