'use client';

import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';

import type { FulfilmentStatus, OrderView } from '@romp/contracts';
import { formatMoney } from '@romp/contracts';
import { Button, ButtonLink, Card, Field } from '@romp/ui';

import { useAuth } from '@/lib/auth-context';
import { OrderApiError, orderApi } from '@/lib/order-api';
import { locale, mediaUrl, moneyFormat } from '@/lib/store';

/**
 * The order confirmation page body.
 *
 * A client island because an order is the customer's own record, read through the API with their
 * bearer token — a server render has no session for it in v1.0. The fetch waits for auth to be
 * ready so a hard navigation after Pay does not 401 before the ID token exists. After checkout it
 * renders the Playtime success layout from the live order: human id, lines, amounts, address city,
 * and a fulfilment timeline. While the order is still awaiting UPI, the QR and reference form stay
 * on this page — PayNest does not capture the payment; the customer pays here. "Payment captured"
 * is reserved for a verified `paid` order.
 */
export function OrderConfirmation({ orderId }: { readonly orderId: string }) {
  const { uid, ready } = useAuth();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || uid === null) return;
    let active = true;
    setLoading(true);
    setError(null);
    void orderApi
      .get(orderId)
      .then((view) => {
        if (active) setOrder(view);
      })
      .catch((cause: unknown) => {
        if (active) {
          setOrder(null);
          setError(cause instanceof OrderApiError ? cause.message : 'Could not load your order.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [orderId, ready, uid]);

  if (!ready || (uid !== null && loading)) {
    return <p className="font-body text-text-muted">Loading your order…</p>;
  }

  if (uid === null) {
    return (
      <Card className="p-8 text-center">
        <h1 className="font-display text-2xl text-text-primary">Sign in to see this order</h1>
        <p className="mt-2 font-body text-text-muted">
          Your confirmation is waiting — sign in with the same account you checked out with.
        </p>
        <ButtonLink href={`/account/sign-in?next=/orders/${orderId}`} className="mt-6">
          Sign in
        </ButtonLink>
      </Card>
    );
  }

  if (order === null) {
    return (
      <Card className="p-8 text-center">
        <h1 className="font-display text-2xl text-text-primary">We couldn’t find that order</h1>
        <p role="alert" className="mt-2 font-body text-text-muted">
          {error ?? 'This order is not available.'}
        </p>
      </Card>
    );
  }

  const paid = order.status === 'paid';
  const steps = timeline(order);

  return (
    <section aria-labelledby="order-heading" className="confirm-layout">
      <div>
        <p className="confirm-badge">{badgeLabel(order.status)}</p>
        <h1
          id="order-heading"
          className="mt-4 font-display text-4xl leading-[0.95] tracking-tight text-text-primary uppercase sm:text-5xl lg:text-6xl"
        >
          Playtime is
          <br />
          on its way
        </h1>
        <p className="mt-4 max-w-md font-body text-sm leading-relaxed text-text-secondary">
          {confirmationCopy(order)}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink
            href={`/account/orders/${order.orderId}`}
            size="lg"
            className="uppercase tracking-[0.08em]"
          >
            Track order
          </ButtonLink>
          <ButtonLink
            href="/listing"
            variant="outline"
            size="lg"
            className="uppercase tracking-[0.08em]"
          >
            Keep shopping
          </ButtonLink>
        </div>

        <ol className="confirm-timeline">
          {steps.map((step, index) => (
            <li key={step.label} className="confirm-tl-step">
              <div className="confirm-tl-rail">
                <span className="confirm-tl-dot" data-done={step.done ? 'true' : 'false'} />
                {index < steps.length - 1 ? <span className="confirm-tl-line" aria-hidden="true" /> : null}
              </div>
              <p className="font-body text-[11px] font-extrabold text-text-primary">{step.label}</p>
              <p className="font-body text-[11px] text-text-muted">{step.when}</p>
            </li>
          ))}
        </ol>

        <PaymentSection order={order} onSubmitted={setOrder} />
      </div>

      <aside className="flex flex-col gap-3">
        <div className="rounded-2xl bg-surface p-5">
          <h2 className="font-body text-[11px] font-bold tracking-[0.16em] text-text-primary uppercase">
            Order {displayHumanId(order.humanId)}
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            {order.items.map((item) => (
              <li key={item.variantId} className="flex items-center gap-3">
                <LineThumb name={item.name} imagePath={item.imagePath} />
                <div className="min-w-0 flex-1">
                  <p className="font-body text-[13px] leading-snug font-bold text-text-primary">
                    {item.name}
                    {item.variantName !== '' ? `, ${item.variantName}` : ''}
                  </p>
                  <p className="mt-1 font-body text-[11px] text-text-muted">Qty {item.qty}</p>
                </div>
                <p className="shrink-0 font-body text-[13px] font-bold text-text-primary">
                  {formatMoney(item.lineTotalMinor, moneyFormat)}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
            <p className="font-body text-[11px] font-bold tracking-[0.16em] text-text-muted uppercase">
              {paid ? 'Paid' : 'Payable'}
            </p>
            <p
              className={
                paid
                  ? 'font-body text-2xl font-bold text-primary'
                  : 'font-body text-2xl font-bold text-text-primary'
              }
            >
              {formatMoney(order.amounts.totalMinor, moneyFormat)}
            </p>
          </div>
          <p className="mt-2 font-body text-[11px] leading-relaxed text-text-muted">
            UPI
            {order.payment.upiRef !== null && order.payment.upiRef !== ''
              ? ` · ${order.payment.upiRef}`
              : ''}
            <br />
            {formatClock(order.payment.verifiedAt ?? order.payment.submittedAt ?? order.createdAt)}
          </p>
        </div>
      </aside>
    </section>
  );
}

function displayHumanId(humanId: string): string {
  return humanId.startsWith('#') ? humanId : `#${humanId}`;
}

function LineThumb({
  name,
  imagePath,
}: {
  readonly name: string;
  readonly imagePath: string | null;
}) {
  const src = mediaUrl(imagePath);
  if (src === null) {
    return (
      <div
        className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-surface-alt"
        aria-hidden="true"
      >
        <span className="font-body text-[11px] font-bold text-text-muted uppercase">
          {name.slice(0, 1)}
        </span>
      </div>
    );
  }
  return (
    <img src={src} alt="" width={48} height={48} className="size-12 shrink-0 rounded-lg object-cover" />
  );
}

function badgeLabel(status: OrderView['status']): string {
  switch (status) {
    case 'paid':
      return 'Payment captured';
    case 'pending_verification':
      return 'Payment under review';
    case 'payment_rejected':
      return 'Payment not matched';
    case 'expired':
      return 'Order expired';
    case 'cancelled':
      return 'Order cancelled';
    case 'refunded':
      return 'Refunded';
    case 'awaiting_payment':
      return 'Order confirmed';
  }
}

function confirmationCopy(order: OrderView): string {
  const ref = `#${order.humanId}`;
  const city = order.shippingAddress.city;
  switch (order.status) {
    case 'awaiting_payment':
      return `Order ${ref} is confirmed. Pay with the UPI QR below, then submit the reference so we can verify it.`;
    case 'pending_verification':
      return `Order ${ref} is confirmed. We are checking your payment. You will hear from us once it is confirmed.`;
    case 'paid':
      return `Order ${ref} is confirmed. We will text tracking when it leaves the ${city} hub.`;
    case 'payment_rejected':
      return `Order ${ref} needs a new payment reference. Check the QR and submit it again.`;
    case 'expired':
      return `Order ${ref} expired before payment arrived. Nothing was charged.`;
    case 'cancelled':
      return `Order ${ref} was cancelled.`;
    case 'refunded':
      return `Order ${ref} was refunded.`;
  }
}

/** Order statuses where the customer may submit (or resubmit) a payment reference. */
const AWAITING_PROOF: readonly OrderView['status'][] = ['awaiting_payment', 'payment_rejected'];

/**
 * The payment step, driven by the order's status.
 *
 * While the order is awaiting payment (or was rejected and may be resubmitted), it shows the UPI QR
 * — rendered from the server-minted payload — and a form to submit the transaction reference. Once a
 * reference is in, the success copy above already says we are checking it.
 */
function PaymentSection({
  order,
  onSubmitted,
}: {
  readonly order: OrderView;
  readonly onSubmitted: (order: OrderView) => void;
}) {
  const [upiRef, setUpiRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!AWAITING_PROOF.includes(order.status)) {
    return null;
  }

  const submit = (): void => {
    const trimmed = upiRef.trim();
    if (trimmed === '') {
      setError('Enter the UPI reference from your payment.');
      return;
    }
    setBusy(true);
    setError(null);
    void orderApi
      .submitPaymentProof(order.orderId, { upiRef: trimmed, screenshotPath: null })
      .then((result) => {
        onSubmitted({
          ...order,
          status: result.status,
          payment: { ...order.payment, upiRef: trimmed, submittedAt: result.submittedAt },
        });
      })
      .catch((cause: unknown) => {
        setError(
          cause instanceof OrderApiError
            ? cause.message
            : 'Could not submit your payment reference.',
        );
        setBusy(false);
      });
  };

  return (
    <div className="mt-8 rounded-2xl bg-surface p-5 sm:p-6">
      <h2 className="text-center font-body font-semibold text-text-primary">Scan to pay</h2>
      <div className="mt-4 flex flex-col items-center gap-4">
        <QRCodeSVG
          value={order.payment.qrPayload}
          size={220}
          marginSize={4}
          title={`UPI payment for order ${order.humanId}`}
          data-testid="upi-qr"
        />
        <p className="font-body text-lg font-bold text-text-primary">
          {formatMoney(order.amounts.totalMinor, moneyFormat)}
        </p>
        <p className="font-body text-sm text-text-muted">
          Open any UPI app and scan, or use the reference {order.humanId} when you pay.
        </p>
      </div>

      {order.status === 'payment_rejected' && order.payment.rejectionReason !== null ? (
        <p role="alert" className="mt-4 font-body text-sm text-danger">
          {order.payment.rejectionReason}
        </p>
      ) : null}

      <div className="mx-auto mt-4 flex w-full max-w-sm flex-col gap-3">
        <Field
          label="UPI transaction reference"
          hint="The reference your UPI app shows after you pay."
          value={upiRef}
          disabled={busy}
          onChange={(event) => {
            setUpiRef(event.target.value);
          }}
        />
        {error !== null ? (
          <p role="alert" className="font-body text-sm text-danger">
            {error}
          </p>
        ) : null}
        <Button onClick={submit} disabled={busy}>
          {busy ? 'Submitting…' : 'Submit payment reference'}
        </Button>
      </div>
    </div>
  );
}

interface TimelineStep {
  readonly label: string;
  readonly when: string;
  readonly done: boolean;
}

function timeline(order: OrderView): readonly TimelineStep[] {
  const status = order.fulfilment.status;
  return [
    { label: 'Order placed', when: formatClock(order.createdAt), done: true },
    {
      label: 'Packed',
      when: order.fulfilment.packedAt !== null ? formatClock(order.fulfilment.packedAt) : packedHint(order.createdAt),
      done: isAtLeast(status, 'packed'),
    },
    {
      label: 'Out for delivery',
      when:
        order.fulfilment.shippedAt !== null
          ? formatClock(order.fulfilment.shippedAt)
          : outHint(order.createdAt, order.deliverySpeed),
      done: isAtLeast(status, 'shipped'),
    },
    {
      label: 'Delivered',
      when:
        order.fulfilment.deliveredAt !== null
          ? formatClock(order.fulfilment.deliveredAt)
          : deliveredHint(order.createdAt, order.deliverySpeed),
      done: status === 'delivered',
    },
  ];
}

function isAtLeast(status: FulfilmentStatus, floor: 'packed' | 'shipped'): boolean {
  if (floor === 'packed') {
    return status === 'packed' || status === 'shipped' || status === 'delivered';
  }
  return status === 'shipped' || status === 'delivered';
}

function packedHint(createdAt: Date): string {
  const next = asDate(createdAt);
  next.setDate(next.getDate() + 1);
  return formatDay(next);
}

function outHint(createdAt: Date, speed: OrderView['deliverySpeed']): string {
  if (speed === 'express') return packedHint(createdAt);
  return formatDay(nextSaturday(createdAt));
}

function deliveredHint(createdAt: Date, speed: OrderView['deliverySpeed']): string {
  if (speed === 'express') return `${packedHint(createdAt)} by 9 pm`;
  return `${formatDay(nextSaturday(createdAt))} by 7 pm`;
}

function nextSaturday(from: Date): Date {
  const start = asDate(from);
  const daysUntilSaturday = (6 - start.getDay() + 7) % 7 || 7;
  const arrives = asDate(from);
  arrives.setDate(start.getDate() + daysUntilSaturday);
  return arrives;
}

function formatClock(value: Date): string {
  const at = asDate(value);
  const now = new Date();
  const time = at.toLocaleTimeString(locale.locale, { hour: 'numeric', minute: '2-digit' });
  if (at.toDateString() === now.toDateString()) {
    return `Today, ${time}`;
  }
  return `${formatDay(at)}, ${time}`;
}

function formatDay(value: Date): string {
  return asDate(value).toLocaleDateString(locale.locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/** JSON `GET /v1/orders/:id` sends ISO strings; the contract type is `Date`. */
function asDate(value: Date | string): Date {
  return value instanceof Date ? new Date(value.getTime()) : new Date(value);
}
