'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import type { OrderView } from '@romp/contracts';
import { formatMoney } from '@romp/contracts';
import { buildWhatsappLink } from '@romp/store-config';

import { useAuth } from '@/lib/auth-context';
import { OrderApiError, orderApi } from '@/lib/order-api';
import { contact, locale, moneyFormat } from '@/lib/store';

import { AccountHeading } from './AccountHeading';
import {
  displayHumanId,
  formatPlacedDate,
  fulfilmentStatusLabel,
  orderEtaCopy,
  orderProgressChip,
  paymentMethodLabel,
} from './order-view';
import { SignedOut } from './SignedOut';

/**
 * One of the customer's own orders, with tracking and a WhatsApp support link.
 *
 * Reads through the API (`GET /v1/orders/:id`), which is owner-or-staff — a foreign order is a 404,
 * the same as one that does not exist. The support CTA is a WhatsApp deep link **pre-filled with the
 * order's human number** (`buildWhatsappLink(contact, humanId)`), so a customer messaging about this
 * order opens a chat that already names it — support is WhatsApp because the platform sends no email
 * (ADR-0007). Signed out, the shared prompt.
 */
export function AccountOrderDetail({ orderId }: { readonly orderId: string }) {
  const { uid, ready } = useAuth();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (uid === null) {
      setOrder(null);
      return;
    }
    void orderApi
      .get(orderId)
      .then((view) => {
        setOrder(view);
      })
      .catch((cause: unknown) => {
        if (cause instanceof OrderApiError && cause.status === 404) setNotFound(true);
      });
  }, [uid, orderId]);

  if (!ready) return <p className="font-body text-text-muted">Loading…</p>;
  if (uid === null)
    return <SignedOut next={`/account/orders/${orderId}`} message="Sign in to see this order." />;
  if (notFound) return <p className="font-body text-text-muted">We could not find that order.</p>;
  if (order === null) return <p className="font-body text-text-muted">Loading…</p>;

  const supportHref = buildWhatsappLink(contact, order.humanId);
  const chip = orderProgressChip(order);

  return (
    <section className="flex flex-col gap-4" aria-labelledby="order-heading">
      <AccountHeading
        id="order-heading"
        actions={<span className={`account-chip account-chip--${chip.tone}`}>{chip.label}</span>}
      >
        {order.humanId}
      </AccountHeading>

      <article className="account-order">
        <header className="account-order-head">
          <dl className="account-order-meta">
            <div>
              <dt>Order</dt>
              <dd>{displayHumanId(order.humanId)}</dd>
            </div>
            <div>
              <dt>Placed</dt>
              <dd>{formatPlacedDate(order.createdAt, locale.locale)}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>{formatMoney(order.amounts.totalMinor, moneyFormat)}</dd>
            </div>
            <div>
              <dt>Paid by</dt>
              <dd>{paymentMethodLabel(order.payment.method)}</dd>
            </div>
          </dl>
        </header>

        <div className="flex flex-col gap-3 p-[14px_18px]">
          <h2 className="font-body text-[10px] font-extrabold tracking-[0.12em] text-text-muted uppercase">
            Items
          </h2>
          <ul className="flex flex-col gap-2">
            {order.items.map((item) => (
              <li key={item.variantId} className="flex items-center justify-between gap-3">
                <span className="font-body text-[13.5px] font-bold text-text-primary">
                  {item.name}
                  <span className="ml-2 font-body text-sm font-normal text-text-muted">
                    {item.variantName}
                  </span>
                </span>
                <span className="font-body text-sm text-text-primary">
                  {item.qty} × {formatMoney(item.unitPriceMinor, moneyFormat)}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="font-body text-sm font-semibold text-text-primary">Total</span>
            <span className="font-display text-xl text-text-primary">
              {formatMoney(order.amounts.totalMinor, moneyFormat)}
            </span>
          </div>
        </div>
      </article>

      <div className="account-panel flex flex-col gap-2 p-5 sm:p-6">
        <h2 className="font-body text-[10px] font-extrabold tracking-[0.12em] text-text-muted uppercase">
          Delivery
        </h2>
        <p className="font-body text-text-secondary">
          {fulfilmentStatusLabel(order.fulfilment.status)}
        </p>
        {order.fulfilment.carrier !== null && order.fulfilment.trackingNo !== null ? (
          <p className="font-body text-sm text-text-muted">
            {order.fulfilment.carrier} · {order.fulfilment.trackingNo}
          </p>
        ) : (
          <p className="account-eta">{orderEtaCopy(order, moneyFormat)}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/account/orders" className="account-btn-ghost">
          All orders
        </Link>
        <a
          href={supportHref}
          target="_blank"
          rel="noreferrer"
          className="account-btn-lime inline-flex"
        >
          Chat about this order on WhatsApp
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    </section>
  );
}
