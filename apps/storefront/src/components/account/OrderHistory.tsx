'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import type { OrderView } from '@romp/contracts';
import { formatMoney } from '@romp/contracts';

import { accountApi } from '@/lib/account-api';
import { useAuth } from '@/lib/auth-context';
import { content, locale, mediaUrl, moneyFormat } from '@/lib/store';

import { AccountEmpty, AccountHeading } from './AccountHeading';
import {
  displayHumanId,
  formatPlacedDate,
  matchesOrderFilter,
  orderEtaCopy,
  orderLineSummary,
  orderPrimaryCta,
  orderProgressChip,
  paymentMethodLabel,
  type OrderListFilter,
} from './order-view';
import { SignedOut } from './SignedOut';

const FILTERS: readonly { id: OrderListFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'transit', label: 'In transit' },
  { id: 'returns', label: 'Returns' },
];

/**
 * The customer's order history — their own orders, newest first, each linking to its detail.
 *
 * Reads through the API (`GET /v1/orders`), which filters on the caller's uid server-side. The empty
 * state is the store's own "no orders yet" copy. Signed out, the shared prompt.
 */
export function OrderHistory() {
  const { uid, ready } = useAuth();
  const [orders, setOrders] = useState<readonly OrderView[] | null>(null);
  const [filter, setFilter] = useState<OrderListFilter>('all');

  useEffect(() => {
    if (uid === null) {
      setOrders(null);
      return;
    }
    void accountApi
      .listOrders()
      .then((response) => {
        setOrders(response.orders);
      })
      .catch(() => {
        setOrders([]);
      });
  }, [uid]);

  const visible = useMemo(
    () => (orders === null ? [] : orders.filter((order) => matchesOrderFilter(order, filter))),
    [orders, filter],
  );

  if (!ready) return <p className="font-body text-text-muted">Loading…</p>;
  if (uid === null)
    return <SignedOut next="/account/orders" message="Sign in to see your orders." />;

  const empty = content.emptyStates.emptyOrders;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="orders-heading">
      <AccountHeading
        id="orders-heading"
        actions={
          orders !== null && orders.length > 0 ? (
            <div className="account-filter-row" role="group" aria-label="Filter orders">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="account-filter"
                  aria-pressed={filter === item.id}
                  onClick={() => {
                    setFilter(item.id);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null
        }
      >
        Your orders
      </AccountHeading>

      {orders === null ? (
        <p className="font-body text-text-muted">Loading…</p>
      ) : orders.length === 0 ? (
        <AccountEmpty title={empty.title} body={empty.body} />
      ) : visible.length === 0 ? (
        <AccountEmpty
          title="Nothing in this view"
          body="Try All to see every order, or place a new one from Explore."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((order) => (
            <li key={order.orderId}>
              <OrderCard order={order} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function OrderCard({ order }: { readonly order: OrderView }) {
  const chip = orderProgressChip(order);
  const cta = orderPrimaryCta(order);
  const detailHref = `/account/orders/${order.orderId}`;
  const first = order.items[0];
  const thumb = mediaUrl(first?.imagePath ?? null);
  const letter = (first?.name ?? 'O').slice(0, 1);

  return (
    <article className="account-order">
      <header className="account-order-head">
        <dl className="account-order-meta">
          <div>
            <dt>Order</dt>
            <dd>
              <Link href={detailHref}>{displayHumanId(order.humanId)}</Link>
            </dd>
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
        <span className={`account-chip account-chip--${chip.tone}`}>{chip.label}</span>
      </header>

      <div className="account-order-body">
        <div className="account-thumb">
          {thumb === null ? (
            <span aria-hidden="true">{letter}</span>
          ) : (
            <Image src={thumb} alt="" width={56} height={56} className="size-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="account-order-items">{orderLineSummary(order)}</p>
          <p className="account-eta">{orderEtaCopy(order, moneyFormat)}</p>
        </div>
        <div className="account-order-actions">
          <Link href={detailHref} className="account-btn-ghost">
            Invoice
          </Link>
          <Link href={cta.href} className="account-btn-lime">
            {cta.label}
          </Link>
        </div>
      </div>
    </article>
  );
}
