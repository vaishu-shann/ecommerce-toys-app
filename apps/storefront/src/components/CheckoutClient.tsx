'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import type { CheckoutQuoteResponse, DeliverySpeed } from '@romp/contracts';
import { formatMoney } from '@romp/contracts';
import { Button, ButtonLink, cn } from '@romp/ui';

import { useAuth } from '@/lib/auth-context';
import { OrderApiError, orderApi } from '@/lib/order-api';
import { brand, commerce, locale, moneyFormat } from '@/lib/store';
import { useCheckoutSession } from '@/lib/use-checkout';
import type { CheckoutAddress } from '@/lib/use-checkout';

/**
 * The checkout page body.
 *
 * A client island because it acts as the signed-in customer: it waits for auth (and a leftover
 * guest-cart merge) to settle, reads saved addresses through the client SDK, requests a live quote
 * from the API, then walks Shipping → Payment → Review. Placement still happens on Review — that
 * is when stock is reserved and the UPI QR is minted — and confirmation is where the customer
 * actually pays. Continue-to-payment only advances the step. UPI is the live method; cards,
 * netbanking, wallets, EMI and COD are shown as in the mock but not selectable, because this
 * storefront does not charge them.
 */

type CheckoutStep = 'shipping' | 'payment' | 'review';

const STEPS: readonly { readonly id: CheckoutStep; readonly n: number; readonly label: string }[] =
  [
    { id: 'shipping', n: 1, label: 'Shipping' },
    { id: 'payment', n: 2, label: 'Payment' },
    { id: 'review', n: 3, label: 'Review' },
  ];

const UPI_APPS = ['GPay', 'PhonePe', 'Paytm', 'BHIM'] as const;

const OTHER_METHODS: readonly {
  readonly label: string;
  readonly badge?: string;
}[] = [
  { label: 'Credit / debit card', badge: 'No-cost EMI' },
  { label: 'Netbanking' },
  { label: 'Wallets' },
  { label: 'EMI · 3–24 mo' },
  { label: 'Cash on delivery', badge: '₹49 fee' },
];

export function CheckoutClient() {
  const router = useRouter();
  const { ready: authReady } = useAuth();
  const { uid, ready, addresses } = useCheckoutSession();

  const [addressId, setAddressId] = useState<string | null>(null);
  const [deliverySpeed, setDeliverySpeed] = useState<DeliverySpeed>('standard');
  const [isGift, setIsGift] = useState(false);
  const [step, setStep] = useState<CheckoutStep>('shipping');
  const [upiApp, setUpiApp] = useState<(typeof UPI_APPS)[number]>('GPay');
  const [upiId, setUpiId] = useState('');
  const [verifyNote, setVerifyNote] = useState<string | null>(null);
  const [quote, setQuote] = useState<CheckoutQuoteResponse | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const first = addresses[0];
    if (addressId === null && first !== undefined) {
      setAddressId(first.id);
    }
  }, [addresses, addressId]);

  const refreshQuote = useCallback(
    (speed: DeliverySpeed): void => {
      if (uid === null) return;
      setQuoting(true);
      setError(null);
      void orderApi
        .quote({ deliverySpeed: speed })
        .then((next) => {
          setQuote(next);
        })
        .catch((cause: unknown) => {
          setQuote(null);
          setError(cause instanceof OrderApiError ? cause.message : 'Could not price your bag.');
        })
        .finally(() => {
          setQuoting(false);
        });
    },
    [uid],
  );

  useEffect(() => {
    if (authReady && ready && uid !== null && addresses.length > 0) refreshQuote(deliverySpeed);
  }, [authReady, ready, uid, addresses.length, deliverySpeed, refreshQuote]);

  const place = (): void => {
    if (addressId === null) return;
    setPlacing(true);
    setError(null);
    void orderApi
      .place({ addressId: addressId as never, deliverySpeed, isGift, giftMessage: null })
      .then((placed) => {
        router.push(`/orders/${placed.orderId}`);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof OrderApiError ? cause.message : 'Could not place your order.');
        setPlacing(false);
      });
  };

  if (!authReady || !ready) {
    return <p className="font-body text-text-muted">Loading checkout…</p>;
  }

  if (uid === null) {
    return (
      <Gate
        title="Sign in to check out"
        body="You need to be signed in to place an order."
        action={{ href: '/account/sign-in?next=/checkout', label: 'Sign in' }}
      />
    );
  }

  if (addresses.length === 0) {
    return (
      <Gate
        title="Add a delivery address"
        body="You need a saved address before you can check out."
        action={{ href: '/account/addresses', label: 'Add an address' }}
      />
    );
  }

  const itemCount = quote?.lines.reduce((sum, line) => sum + line.qty, 0) ?? 0;
  const standardFree =
    quote !== null
      ? quote.subtotalMinor >= commerce.freeShippingThresholdMinor
      : true;
  const canAdvance = !placing && !quoting && quote !== null && addressId !== null;
  const selectedAddress = addresses.find((address) => address.id === addressId) ?? addresses[0];

  return (
    <section aria-labelledby="checkout-heading" className="flex flex-col gap-6">
      <h1 id="checkout-heading" className="sr-only">
        Checkout
      </h1>
      <CheckoutStepper current={step} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20.5rem] lg:gap-8">
        {step === 'shipping' ? (
          <ShippingStep
            addresses={addresses}
            addressId={addressId}
            deliverySpeed={deliverySpeed}
            isGift={isGift}
            placing={placing}
            error={error}
            standardFree={standardFree}
            canAdvance={canAdvance}
            onSelectAddress={setAddressId}
            onSelectSpeed={setDeliverySpeed}
            onToggleGift={setIsGift}
            onContinue={() => {
              setStep('payment');
            }}
          />
        ) : null}
        {step === 'payment' ? (
          <PaymentStep
            upiApp={upiApp}
            upiId={upiId}
            verifyNote={verifyNote}
            error={error}
            onSelectApp={setUpiApp}
            onUpiId={setUpiId}
            onVerify={() => {
              setVerifyNote(
                'UPI IDs are not pre-checked here. You pay the QR after you place the order.',
              );
            }}
            onBack={() => {
              setStep('shipping');
              setVerifyNote(null);
            }}
            onReview={() => {
              setStep('review');
              setVerifyNote(null);
            }}
          />
        ) : null}
        {step === 'review' ? (
          <ReviewStep
            address={selectedAddress}
            quote={quote}
            deliverySpeed={deliverySpeed}
            paymentSummary={paymentSummary(upiApp, upiId)}
            placing={placing}
            error={error}
            canPlace={canAdvance}
            onChangeAddress={() => {
              setStep('shipping');
            }}
            onChangePayment={() => {
              setStep('payment');
            }}
            onBack={() => {
              setStep('payment');
            }}
            onPlace={place}
          />
        ) : null}

        <BagAside quote={quote} quoting={quoting} itemCount={itemCount} />
      </div>

      {placing ? (
        <PaymentProcessing
          total={quote !== null ? formatMoney(quote.totalMinor, moneyFormat) : ''}
        />
      ) : null}
    </section>
  );
}

function ShippingStep({
  addresses,
  addressId,
  deliverySpeed,
  isGift,
  placing,
  error,
  standardFree,
  canAdvance,
  onSelectAddress,
  onSelectSpeed,
  onToggleGift,
  onContinue,
}: {
  readonly addresses: readonly CheckoutAddress[];
  readonly addressId: string | null;
  readonly deliverySpeed: DeliverySpeed;
  readonly isGift: boolean;
  readonly placing: boolean;
  readonly error: string | null;
  readonly standardFree: boolean;
  readonly canAdvance: boolean;
  readonly onSelectAddress: (id: string) => void;
  readonly onSelectSpeed: (speed: DeliverySpeed) => void;
  readonly onToggleGift: (value: boolean) => void;
  readonly onContinue: () => void;
}) {
  return (
    <div className="rounded-2xl bg-surface p-4 sm:p-6">
      <h2 className="font-display text-3xl tracking-tight text-text-primary uppercase sm:text-4xl">
        Where should it go?
      </h2>

      <fieldset className="mt-5 flex flex-col gap-2">
        <legend className="sr-only">Deliver to</legend>
        {addresses.map((address) => (
          <AddressOption
            key={address.id}
            address={address}
            checked={address.id === addressId}
            disabled={placing}
            onSelect={() => {
              onSelectAddress(address.id);
            }}
          />
        ))}
      </fieldset>

      <Link
        href="/account/addresses"
        className="mt-3 inline-flex min-h-11 items-center font-body text-sm font-bold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      >
        + Add a new address
      </Link>

      <fieldset className="mt-8">
        <legend className="font-body text-[11px] font-bold tracking-[0.16em] text-text-muted uppercase">
          Delivery speed
        </legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <SpeedOption
            speed="standard"
            title={`Standard · ${standardFree ? 'Free' : formatMoney(commerce.standardShippingFeeMinor, moneyFormat)}`}
            hint={standardHint()}
            checked={deliverySpeed === 'standard'}
            disabled={placing}
            onSelect={() => {
              onSelectSpeed('standard');
            }}
          />
          <SpeedOption
            speed="express"
            title={`Express · ${formatMoney(commerce.expressFeeMinor, moneyFormat)}`}
            hint="Tomorrow by 9 pm"
            checked={deliverySpeed === 'express'}
            disabled={placing}
            onSelect={() => {
              onSelectSpeed('express');
            }}
          />
        </div>
      </fieldset>

      <label className="mt-6 flex cursor-pointer items-center gap-3 font-body text-sm text-text-primary">
        <input
          type="checkbox"
          className="size-4 shrink-0 accent-primary"
          checked={isGift}
          disabled={placing}
          onChange={(event) => {
            onToggleGift(event.target.checked);
          }}
        />
        It&apos;s a gift — hide prices on the invoice
      </label>

      {error !== null ? (
        <p role="alert" className="mt-4 font-body text-sm text-danger">
          {error}
        </p>
      ) : null}

      <Button
        onClick={onContinue}
        disabled={!canAdvance}
        className="mt-6 uppercase tracking-[0.08em]"
      >
        Continue to payment
      </Button>
    </div>
  );
}

function PaymentStep({
  upiApp,
  upiId,
  verifyNote,
  error,
  onSelectApp,
  onUpiId,
  onVerify,
  onBack,
  onReview,
}: {
  readonly upiApp: (typeof UPI_APPS)[number];
  readonly upiId: string;
  readonly verifyNote: string | null;
  readonly error: string | null;
  readonly onSelectApp: (app: (typeof UPI_APPS)[number]) => void;
  readonly onUpiId: (value: string) => void;
  readonly onVerify: () => void;
  readonly onBack: () => void;
  readonly onReview: () => void;
}) {
  return (
    <div className="rounded-2xl bg-surface p-4 sm:p-6">
      <h2 className="font-display text-3xl tracking-tight text-text-primary uppercase sm:text-4xl">
        How would you like to pay?
      </h2>
      <p className="mt-2 font-body text-xs text-text-muted">
        Secured by PayNest · 128-bit encrypted · PCI-DSS
      </p>

      <div className="checkout-pay-layout mt-5">
        <div className="checkout-pay-methods" role="group" aria-label="Payment method">
          <button type="button" className="checkout-pay-method" aria-pressed="true">
            <span>UPI</span>
            <span className="checkout-pay-badge">Instant</span>
          </button>
          {OTHER_METHODS.map((method) => (
            <button
              key={method.label}
              type="button"
              className="checkout-pay-method"
              disabled
              title="Not available — this storefront charges UPI"
            >
              <span>{method.label}</span>
              {method.badge !== undefined ? (
                <span className="checkout-pay-badge">{method.badge}</span>
              ) : null}
            </button>
          ))}
        </div>

        <div>
          <h3 className="font-body text-[11px] font-bold tracking-[0.16em] text-text-muted uppercase">
            Pay by UPI
          </h3>
          <div className="checkout-upi-apps mt-3" role="group" aria-label="UPI app">
            {UPI_APPS.map((app) => (
              <button
                key={app}
                type="button"
                className="checkout-upi-app"
                aria-pressed={upiApp === app}
                onClick={() => {
                  onSelectApp(app);
                }}
              >
                {app}
              </button>
            ))}
          </div>
          <p className="mt-4 font-body text-[11px] font-bold tracking-[0.16em] text-text-muted uppercase">
            Or enter UPI ID
          </p>
          <div className="checkout-upi-row">
            <label className="sr-only" htmlFor="checkout-upi-id">
              UPI ID
            </label>
            <input
              id="checkout-upi-id"
              value={upiId}
              onChange={(event) => {
                onUpiId(event.target.value);
              }}
              placeholder="name@upi"
              autoComplete="off"
              className="checkout-upi-input"
            />
            <Button type="button" size="sm" onClick={onVerify} className="uppercase tracking-[0.08em]">
              Verify
            </Button>
          </div>
          {verifyNote !== null ? (
            <p className="mt-2 font-body text-xs text-text-muted">{verifyNote}</p>
          ) : null}
          <div className="checkout-qr-slot">
            <div className="checkout-qr-box" aria-hidden="true" />
            <p className="font-body text-xs text-text-muted">
              Or scan the QR in any UPI app. The QR is created when you place the order.
            </p>
          </div>
        </div>
      </div>

      {error !== null ? (
        <p role="alert" className="mt-4 font-body text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="outline" onClick={onBack} className="uppercase tracking-[0.08em]">
          Back
        </Button>
        <Button onClick={onReview} className="uppercase tracking-[0.08em]">
          Review order
        </Button>
      </div>
    </div>
  );
}

function ReviewStep({
  address,
  quote,
  deliverySpeed,
  paymentSummary,
  placing,
  error,
  canPlace,
  onChangeAddress,
  onChangePayment,
  onBack,
  onPlace,
}: {
  readonly address: CheckoutAddress | undefined;
  readonly quote: CheckoutQuoteResponse | null;
  readonly deliverySpeed: DeliverySpeed;
  readonly paymentSummary: string;
  readonly placing: boolean;
  readonly error: string | null;
  readonly canPlace: boolean;
  readonly onChangeAddress: () => void;
  readonly onChangePayment: () => void;
  readonly onBack: () => void;
  readonly onPlace: () => void;
}) {
  const itemCount = quote?.lines.reduce((sum, line) => sum + line.qty, 0) ?? 0;
  const payable = quote !== null ? formatMoney(quote.totalMinor, moneyFormat) : null;

  return (
    <div className="rounded-2xl bg-surface p-4 sm:p-6">
      <h2 className="checkout-review-title font-display text-3xl tracking-tight text-text-primary uppercase sm:text-4xl">
        Check and confirm
      </h2>

      <div className="mt-5 flex flex-col gap-3">
        <div className="checkout-review-card">
          <div className="min-w-0 flex-1">
            <p className="checkout-review-kicker">Deliver to</p>
            {address !== undefined ? (
              <p className="mt-2 font-body text-[13px] leading-relaxed font-semibold text-text-primary">
                {formatShipTo(address)}
                <br />
                {deliveryLine(deliverySpeed, quote)}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="checkout-change"
            aria-label="Change delivery address"
            onClick={onChangeAddress}
            disabled={placing}
          >
            Change
          </button>
        </div>

        <div className="checkout-review-card">
          <div className="min-w-0 flex-1">
            <p className="checkout-review-kicker">Paying with</p>
            <p className="mt-2 font-body text-[13px] font-semibold text-text-primary">{paymentSummary}</p>
          </div>
          <button
            type="button"
            className="checkout-change"
            aria-label="Change payment method"
            onClick={onChangePayment}
            disabled={placing}
          >
            Change
          </button>
        </div>

        <div className="checkout-review-panel">
          <p className="checkout-review-kicker">
            {itemCount} item{itemCount === 1 ? '' : 's'}
          </p>
          {quote !== null ? (
            <ul className="mt-3 flex flex-col">
              {quote.lines.map((line) => (
                <li key={line.variantId} className="flex items-center gap-3 py-2">
                  <div className="size-11 shrink-0 rounded-lg bg-surface-alt" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-[13px] leading-snug font-bold text-text-primary">
                      {line.name}
                    </p>
                    <p className="mt-1 font-body text-[11px] text-text-muted">
                      Qty {line.qty}
                      {line.variantName !== '' ? ` · ${line.variantName}` : ''}
                    </p>
                  </div>
                  <p className="shrink-0 font-body text-[13px] font-bold text-text-primary">
                    {formatMoney(line.lineTotalMinor, moneyFormat)}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {error !== null ? (
        <p role="alert" className="mt-4 font-body text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={onBack} disabled={placing} className="uppercase tracking-[0.08em]">
          Back
        </Button>
        <Button
          onClick={onPlace}
          disabled={!canPlace || payable === null}
          loading={placing}
          className="uppercase tracking-[0.08em]"
        >
          {payable !== null ? `Pay ${payable}` : 'Pay'}
        </Button>
      </div>
      <p className="mt-3 font-body text-[11px] leading-relaxed text-text-muted">
        By paying you agree to {brand.name}&apos;s{' '}
        <Link href="/policies/returns" className="text-text-secondary hover:underline">
          returns
        </Link>{' '}
        and{' '}
        <Link href="/policies/privacy" className="text-text-secondary hover:underline">
          privacy policy
        </Link>
        . Card data is tokenised; {brand.name} never stores it.
      </p>
    </div>
  );
}

function PaymentProcessing({ total }: { readonly total: string }) {
  return createPortal(
    <div
      className="checkout-pay-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-pay-title"
    >
      <div className="checkout-pay-modal">
        <div className="flex w-full items-center justify-between">
          <p id="checkout-pay-title" className="font-body text-[13px] font-extrabold tracking-wide text-text-primary">
            PayNest
          </p>
          <p className="font-body text-[10px] font-semibold tracking-[0.1em] text-text-muted uppercase">
            Secure · 256-bit
          </p>
        </div>
        <div className="checkout-pay-spin" aria-hidden="true" />
        <p className="text-center font-body text-sm font-bold text-text-primary">Waiting for your UPI app</p>
        <p className="text-center font-body text-[12px] leading-relaxed text-text-muted">
          Do not press back or refresh.{total !== '' ? ` Charging ${total}.` : ''}
        </p>
        <div className="checkout-pay-bar" aria-hidden="true">
          <div className="checkout-pay-bar-fill" />
        </div>
      </div>
    </div>,
    document.body,
  );
}

function BagAside({
  quote,
  quoting,
  itemCount,
}: {
  readonly quote: CheckoutQuoteResponse | null;
  readonly quoting: boolean;
  readonly itemCount: number;
}) {
  return (
    <aside className="flex flex-col gap-3">
      <div className="rounded-2xl bg-surface p-5">
        <h2 className="font-body text-[11px] font-bold tracking-[0.16em] text-text-muted uppercase">
          {itemCount > 0 ? `${itemCount} item${itemCount === 1 ? '' : 's'} in bag` : 'Your bag'}
        </h2>
        {quote !== null ? (
          <>
            <ul className="mt-4 flex flex-col gap-3">
              {quote.lines.map((line) => (
                <li key={line.variantId} className="flex items-center gap-3">
                  <div className="size-10 shrink-0 rounded-md bg-surface-alt" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body text-sm font-bold text-text-primary">
                      {line.name}
                      {line.variantName !== '' ? `, ${line.variantName}` : ''}
                    </p>
                    <p className="font-body text-xs text-text-muted">× {line.qty}</p>
                  </div>
                  <p className="shrink-0 font-body text-sm font-bold text-text-primary">
                    {formatMoney(line.lineTotalMinor, moneyFormat)}
                  </p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 flex flex-col gap-2 border-t border-border pt-4 font-body text-sm">
              <SummaryRow label="Subtotal" value={formatMoney(quote.subtotalMinor, moneyFormat)} />
              {quote.giftWrapMinor > 0 ? (
                <SummaryRow
                  label="Gift wrap"
                  value={formatMoney(quote.giftWrapMinor, moneyFormat)}
                />
              ) : null}
              <SummaryRow
                label="Delivery"
                value={
                  quote.shippingMinor === 0
                    ? 'Free'
                    : formatMoney(quote.shippingMinor, moneyFormat)
                }
                emphasize={quote.shippingMinor === 0}
              />
            </dl>
            <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
              <p className="font-body text-[11px] font-bold tracking-[0.16em] text-text-muted uppercase">
                Payable
              </p>
              <p
                className="font-body text-2xl font-bold text-text-primary"
                data-testid="checkout-total"
              >
                {formatMoney(quote.totalMinor, moneyFormat)}
              </p>
            </div>
          </>
        ) : (
          <p className="mt-4 font-body text-sm text-text-muted">
            {quoting ? 'Pricing your bag…' : 'Your bag total will appear here.'}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-primary/40 bg-surface p-4">
        <p className="font-body text-[11px] font-bold tracking-[0.12em] text-primary uppercase">
          Paynest secure checkout
        </p>
        <p className="mt-1 font-body text-xs text-text-secondary">
          UPI, cards, netbanking, wallets and EMI. 3-D Secure on every card payment.
        </p>
      </div>
    </aside>
  );
}

function Gate({
  title,
  body,
  action,
}: {
  readonly title: string;
  readonly body: string;
  readonly action: { readonly href: string; readonly label: string };
}) {
  return (
    <div className="rounded-2xl bg-surface px-6 py-16 text-center">
      <h1 className="font-display text-3xl tracking-tight text-text-primary uppercase">{title}</h1>
      <p className="mt-3 font-body text-text-secondary">{body}</p>
      <ButtonLink href={action.href} className="mt-6">
        {action.label}
      </ButtonLink>
    </div>
  );
}

function CheckoutStepper({ current }: { readonly current: CheckoutStep }) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);

  return (
    <ol className="flex items-center gap-3 sm:gap-4">
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li
            key={step.label}
            className="flex min-w-0 items-center gap-3 sm:gap-4"
            aria-current={active ? 'step' : undefined}
          >
            <div className="flex items-center gap-2">
              {done ? (
                <span className="checkout-step-check" aria-hidden="true">
                  <svg viewBox="0 0 16 16" className="size-3.5" fill="none">
                    <path
                      d="M3.5 8.2 6.4 11l6.1-7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              ) : (
                <span
                  className={cn(
                    'inline-flex size-7 items-center justify-center rounded-full font-body text-xs font-bold',
                    active
                      ? 'bg-primary text-primary-on'
                      : 'border border-border-strong text-text-muted',
                  )}
                  aria-hidden="true"
                >
                  {step.n}
                </span>
              )}
              <span
                className={cn(
                  'font-body text-[11px] font-bold tracking-[0.16em] uppercase',
                  active || done ? 'text-text-primary' : 'text-text-muted',
                )}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 ? (
              <span className="hidden h-px w-10 bg-border sm:block md:w-16" aria-hidden="true" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function AddressOption({
  address,
  checked,
  disabled,
  onSelect,
}: {
  readonly address: CheckoutAddress;
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly onSelect: () => void;
}) {
  const lines = [
    address.line1,
    address.line2,
    `${address.city}, ${address.state} ${address.pincode}`,
  ]
    .filter((part) => part !== null && part !== '')
    .join(', ');
  const phone = formatPhone(address.phone);

  const cardClass = cn(
    'flex items-start justify-between gap-3 rounded-xl border px-4 py-3.5',
    checked ? 'border-primary bg-surface-alt/30' : 'border-transparent bg-surface-alt/50',
  );
  const details = (
    <span className="min-w-0">
      <span className="block font-body text-sm font-bold text-text-primary">
        {address.recipientName}
        {address.label !== '' ? ` · ${address.label}` : ''}
      </span>
      <span className="mt-1 block font-body text-sm text-text-muted">
        {lines}
        {phone !== '' ? ` · ${phone}` : ''}
      </span>
    </span>
  );
  const radio = (
    <input
      type="radio"
      name="checkout-address"
      className="sr-only"
      checked={checked}
      disabled={disabled}
      onChange={onSelect}
    />
  );

  if (checked) {
    return (
      <div className={cardClass}>
        <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
          {radio}
          {details}
        </label>
        <Link
          href="/account/addresses"
          className="shrink-0 font-body text-sm font-bold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          Edit
        </Link>
      </div>
    );
  }

  return (
    <label className={cn(cardClass, 'cursor-pointer')}>
      {radio}
      {details}
      <span className="shrink-0 pt-0.5 font-body text-sm text-text-muted">Select</span>
    </label>
  );
}

function SpeedOption({
  speed,
  title,
  hint,
  checked,
  disabled,
  onSelect,
}: {
  readonly speed: DeliverySpeed;
  readonly title: string;
  readonly hint: string;
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly onSelect: () => void;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer flex-col rounded-xl border px-4 py-3.5',
        checked ? 'border-primary bg-surface-alt/30' : 'border-transparent bg-surface-alt/50',
      )}
    >
      <input
        type="radio"
        name="delivery-speed"
        className="sr-only"
        value={speed}
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
      />
      <span className="font-body text-sm font-bold text-text-primary">{title}</span>
      <span className="mt-1 font-body text-xs text-text-muted">{hint}</span>
    </label>
  );
}

function SummaryRow({
  label,
  value,
  emphasize = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly emphasize?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-text-secondary">{label}</dt>
      <dd className={emphasize ? 'font-bold text-primary' : 'font-medium text-text-primary'}>
        {value}
      </dd>
    </div>
  );
}

function paymentSummary(upiApp: (typeof UPI_APPS)[number], upiId: string): string {
  const id = upiId.trim();
  return id === '' ? `UPI · ${upiApp}` : `UPI · ${id}`;
}

function formatShipTo(address: CheckoutAddress): string {
  const street = [address.line1, address.line2].filter(
    (part): part is string => part !== null && part !== '',
  ).join(', ');
  return `${address.recipientName} · ${street}, ${address.city}`;
}

function deliveryLine(speed: DeliverySpeed, quote: CheckoutQuoteResponse | null): string {
  const when = speed === 'express' ? 'Tomorrow by 9 pm' : deliveryDateLabel();
  const ship =
    quote === null ? 'Standard' : quote.shippingMinor === 0 ? 'Free' : formatMoney(quote.shippingMinor, moneyFormat);
  return `${ship} delivery · ${when}`;
}

function standardHint(now = new Date()): string {
  return `Arrives ${deliveryDateLabel(now)}`;
}

function deliveryDateLabel(now = new Date()): string {
  const daysUntilSaturday = (6 - now.getDay() + 7) % 7 || 7;
  const arrives = new Date(now);
  arrives.setDate(now.getDate() + daysUntilSaturday);
  return arrives.toLocaleDateString(locale.locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return phone;
}
