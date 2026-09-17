import type { FulfilmentStatus, OrderStatus, OrderView } from '@romp/contracts';
import { formatMoney } from '@romp/contracts';
import type { BadgeTone } from '@romp/ui';

/**
 * Customer-facing view helpers for order status.
 *
 * Pure and exhaustive over both machines, so a new status cannot ship without a customer-readable
 * label and a tone. The copy is the customer's vocabulary ("Waiting for payment", "On its way"), not
 * the backoffice's — this is what a shopper sees on their own order.
 */

export function orderStatusTone(status: OrderStatus): BadgeTone {
  switch (status) {
    case 'paid':
      return 'success';
    case 'pending_verification':
    case 'awaiting_payment':
      return 'warning';
    case 'payment_rejected':
      return 'danger';
    case 'refunded':
      return 'warning';
    case 'expired':
    case 'cancelled':
      return 'neutral';
  }
}

export function orderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'awaiting_payment':
      return 'Awaiting payment';
    case 'pending_verification':
      return 'Payment under review';
    case 'paid':
      return 'Paid';
    case 'payment_rejected':
      return 'Payment not matched';
    case 'expired':
      return 'Expired';
    case 'cancelled':
      return 'Cancelled';
    case 'refunded':
      return 'Refunded';
  }
}

export function fulfilmentStatusLabel(status: FulfilmentStatus): string {
  switch (status) {
    case 'unfulfilled':
      return 'Preparing';
    case 'packed':
      return 'Packed';
    case 'shipped':
      return 'On its way';
    case 'delivered':
      return 'Delivered';
    case 'on_hold':
      return 'On hold';
    case 'cancelled':
      return 'Cancelled';
  }
}

export type OrderListFilter = 'all' | 'transit' | 'returns';

export type OrderChipTone = 'packing' | 'delivered' | 'returned' | 'neutral';

export function matchesOrderFilter(order: OrderView, filter: OrderListFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'returns') {
    return (
      order.status === 'refunded' ||
      order.status === 'cancelled' ||
      order.fulfilment.status === 'cancelled'
    );
  }
  return (
    (order.status === 'paid' || order.status === 'pending_verification') &&
    (order.fulfilment.status === 'unfulfilled' ||
      order.fulfilment.status === 'packed' ||
      order.fulfilment.status === 'shipped' ||
      order.fulfilment.status === 'on_hold')
  );
}

export function orderProgressChip(order: OrderView): { label: string; tone: OrderChipTone } {
  if (order.status === 'refunded') return { label: 'Returned', tone: 'returned' };
  if (order.status === 'cancelled' || order.fulfilment.status === 'cancelled') {
    return { label: 'Cancelled', tone: 'returned' };
  }
  if (order.fulfilment.status === 'delivered') return { label: 'Delivered', tone: 'delivered' };
  if (order.fulfilment.status === 'shipped') return { label: 'In transit', tone: 'packing' };
  if (order.status === 'paid' || order.fulfilment.status === 'packed') {
    return { label: 'Packing', tone: 'packing' };
  }
  if (order.status === 'awaiting_payment' || order.status === 'payment_rejected') {
    return { label: 'Pay now', tone: 'neutral' };
  }
  if (order.status === 'pending_verification') return { label: 'Review', tone: 'neutral' };
  if (order.status === 'expired') return { label: 'Expired', tone: 'neutral' };
  return { label: orderStatusLabel(order.status), tone: 'neutral' };
}

export function orderLineSummary(order: OrderView): string {
  const first = order.items[0]?.name ?? 'Order';
  const extra = order.items.length - 1;
  if (extra <= 0) return first;
  return `${first} + ${extra} more`;
}

export function orderEtaCopy(
  order: OrderView,
  money: { readonly locale: string; readonly currency: string },
): string {
  if (order.status === 'refunded') {
    const amount = formatMoney(
      order.amounts.refundedMinor > 0 ? order.amounts.refundedMinor : order.amounts.totalMinor,
      money,
    );
    return `Refunded ${amount} on ${formatShortDate(order.updatedAt)}`;
  }
  if (order.fulfilment.status === 'delivered') {
    return order.fulfilment.deliveredAt === null
      ? 'Delivered'
      : `Delivered ${formatShortDate(order.fulfilment.deliveredAt)}`;
  }
  if (order.fulfilment.status === 'shipped') {
    if (order.fulfilment.trackingNo !== null) {
      const carrier = order.fulfilment.carrier ?? 'Courier';
      return `On its way · ${carrier} ${order.fulfilment.trackingNo}`;
    }
    return 'On its way';
  }
  if (order.fulfilment.status === 'packed') return 'Packed and ready to ship';
  if (order.status === 'paid' && order.fulfilment.status === 'unfulfilled') return 'Being packed';
  if (order.status === 'awaiting_payment') return 'Waiting for payment';
  if (order.status === 'pending_verification') return 'Payment under review';
  if (order.status === 'payment_rejected') return 'Payment not matched — you can try again';
  if (order.status === 'expired') return 'Payment window closed';
  if (order.status === 'cancelled' || order.fulfilment.status === 'cancelled') return 'Cancelled';
  if (order.fulfilment.status === 'on_hold') return 'On hold';
  return orderStatusLabel(order.status);
}

export function orderPrimaryCta(order: OrderView): { label: string; href: string } {
  const detail = `/account/orders/${order.orderId}`;
  if (order.status === 'awaiting_payment' || order.status === 'payment_rejected') {
    return { label: 'Pay', href: detail };
  }
  if (
    order.status === 'paid' &&
    (order.fulfilment.status === 'unfulfilled' ||
      order.fulfilment.status === 'packed' ||
      order.fulfilment.status === 'shipped' ||
      order.fulfilment.status === 'on_hold')
  ) {
    return { label: 'Track', href: detail };
  }
  if (order.fulfilment.status === 'delivered') {
    const productId = order.items[0]?.productId;
    if (productId !== undefined) return { label: 'Buy again', href: `/p/${productId}` };
  }
  return { label: 'Details', href: detail };
}

export function paymentMethodLabel(_method: OrderView['payment']['method']): string {
  return 'UPI';
}

export function formatPlacedDate(date: Date, locale: string): string {
  return asDate(date).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function displayHumanId(humanId: string): string {
  return humanId.startsWith('#') ? humanId : `#${humanId}`;
}

function formatShortDate(date: Date): string {
  return asDate(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** JSON order payloads send ISO strings; the contract type is `Date`. */
function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}
