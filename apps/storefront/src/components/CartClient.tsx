'use client';

import { useEffect, useState } from 'react';

import type { CartView, Money } from '@romp/contracts';
import { addMoney, formatMoney, money } from '@romp/contracts';
import { Button, ButtonLink, cn } from '@romp/ui';

import { accountApi } from '@/lib/account-api';
import { useAuth } from '@/lib/auth-context';
import { CartApiError, cartApi } from '@/lib/cart-api';
import { commerce, content, features, locale, mediaUrl, moneyFormat } from '@/lib/store';

/**
 * The cart page body.
 *
 * A client island because the cart is per-visitor and never cached: it waits for auth to resolve
 * (so a leftover guest cart can merge into the account) then fetches the current cart. The API
 * resolves the guest cookie or the signed-in uid and re-renders from the `CartView` every mutation
 * returns. Quantity, remove and gift-wrap still go through `cartApi`; this file only changes how
 * that view is laid out.
 *
 * The order summary's delivery line is display-only from store config (free over the threshold).
 * Checkout still quotes the charged amount. Promo codes are chrome matching the bag mock — they do
 * not change the subtotal, because the cart API does not apply coupons.
 */

const PROMO_CODES = [
  { code: 'MONSOON20', hint: '20% off, min ₹1,999' },
  { code: 'DIWALI25', hint: '25% off, min ₹2,499' },
  { code: 'STEM10', hint: '10% off, no minimum' },
] as const;

type CartLine = CartView['items'][number];

export function CartClient() {
  const { ready } = useAuth();
  const [cart, setCart] = useState<CartView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoInput, setPromoInput] = useState('');
  const [promoNote, setPromoNote] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    void cartApi
      .get()
      .then((view) => {
        if (active) setCart(view);
      })
      .catch(() => {
        if (active) setError('Could not load your bag.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ready]);

  const run = (action: Promise<CartView>): void => {
    setBusy(true);
    setError(null);
    void action
      .then((view) => {
        setCart(view);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof CartApiError ? cause.message : 'Could not update your bag.');
      })
      .finally(() => {
        setBusy(false);
      });
  };

  if (loading) {
    return <p className="font-body text-text-muted">Loading your bag…</p>;
  }

  if (cart === null || cart.items.length === 0) {
    return (
      <div className="rounded-2xl bg-surface px-6 py-16 text-center">
        <h1 className="font-display text-3xl tracking-tight text-text-primary uppercase">
          {content.emptyStates.emptyCart.title}
        </h1>
        <p className="mt-3 font-body text-text-secondary">{content.emptyStates.emptyCart.body}</p>
        <ButtonLink href="/listing" className="mt-6">
          Keep shopping
        </ButtonLink>
      </div>
    );
  }

  const wrapFee =
    cart.giftWrap && features.giftWrap ? commerce.giftWrapFeeMinor : money(0);
  const deliveryFree = cart.subtotalMinor >= commerce.freeShippingThresholdMinor;
  const displayTotal = addMoney(cart.subtotalMinor, wrapFee);
  const gstMinor = inclusiveGst(displayTotal, locale.gstRateBasisPoints);

  return (
    <section aria-labelledby="cart-heading" className="flex flex-col gap-8">
      <h1
        id="cart-heading"
        className="font-display text-4xl leading-none tracking-tight text-text-primary uppercase sm:text-5xl"
      >
        Your bag ({cart.itemCount})
      </h1>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20.5rem] lg:gap-8">
        <div className="flex flex-col gap-3 rounded-2xl bg-surface p-3 sm:p-4">
          <ul className="flex flex-col gap-3">
            {cart.items.map((item) => (
              <CartLine
                key={item.variantId}
                item={item}
                busy={busy}
                onQty={(qty) => {
                  run(
                    cartApi.add({
                      productId: item.productId as never,
                      variantId: item.variantId as never,
                      qty,
                      mode: 'set',
                    }),
                  );
                }}
                onRemove={() => {
                  run(cartApi.remove(item.variantId));
                }}
              />
            ))}
          </ul>

          {features.giftWrap ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-alt/60 px-4 py-4">
              <div className="min-w-0">
                <p className="font-body text-sm font-bold text-text-primary">
                  Add gift wrap + handwritten note
                </p>
                <p className="mt-1 font-body text-xs text-text-muted">
                  Recycled kraft paper, ribbon, and your message in ink
                </p>
              </div>
              <Button
                variant={cart.giftWrap ? 'outline' : 'primary'}
                size="sm"
                disabled={busy}
                aria-pressed={cart.giftWrap}
                onClick={() => {
                  run(cartApi.setGiftWrap(!cart.giftWrap));
                }}
              >
                {cart.giftWrap
                  ? 'Added'
                  : `Add ${formatMoney(commerce.giftWrapFeeMinor, moneyFormat)}`}
              </Button>
            </div>
          ) : null}
        </div>

        <aside className="flex flex-col gap-3">
          <div className="rounded-2xl bg-surface p-5">
            <h2 className="font-body text-[11px] font-bold tracking-[0.16em] text-text-muted uppercase">
              Order summary
            </h2>
            <dl className="mt-4 flex flex-col gap-2 font-body text-sm">
              <SummaryRow label="Subtotal" value={formatMoney(cart.subtotalMinor, moneyFormat)} />
              <SummaryRow
                label="Delivery"
                value={deliveryFree ? 'Free' : 'At checkout'}
                emphasize={deliveryFree}
              />
              {wrapFee > 0 ? (
                <SummaryRow label="Gift wrap" value={formatMoney(wrapFee, moneyFormat)} />
              ) : null}
            </dl>
            <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
              <div>
                <p className="font-body text-[11px] font-bold tracking-[0.16em] text-text-muted uppercase">
                  Total
                </p>
                <p className="mt-1 font-body text-[11px] text-text-muted">
                  Incl. {formatMoney(gstMinor, moneyFormat)} GST
                </p>
              </div>
              <p className="font-body text-2xl font-bold text-text-primary">
                {formatMoney(displayTotal, moneyFormat)}
              </p>
            </div>
            <ButtonLink href="/checkout" fullWidth className="mt-5 uppercase tracking-[0.08em]">
              Checkout
            </ButtonLink>
            <ButtonLink
              href="/listing"
              variant="outline"
              fullWidth
              className="mt-2 uppercase tracking-[0.08em]"
            >
              Keep shopping
            </ButtonLink>
          </div>

          <form
            className="flex gap-2 rounded-2xl bg-surface p-3"
            onSubmit={(event) => {
              event.preventDefault();
              const code = promoInput.trim().toUpperCase();
              if (code === '') {
                setPromoNote(null);
                return;
              }
              setPromoNote('Promo codes apply at checkout.');
            }}
          >
            <label className="sr-only" htmlFor="cart-promo">
              Promo code
            </label>
            <input
              id="cart-promo"
              value={promoInput}
              onChange={(event) => {
                setPromoInput(event.target.value);
                setPromoNote(null);
              }}
              placeholder="Code"
              autoComplete="off"
              className={cn(
                'min-h-11 min-w-0 flex-1 rounded-pill border border-border-strong bg-transparent px-4',
                'font-body text-sm font-bold tracking-[0.08em] text-text-primary uppercase',
                'placeholder:text-text-muted placeholder:normal-case placeholder:tracking-normal placeholder:font-medium',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
              )}
            />
            <Button type="submit" variant="outline" size="sm">
              Apply
            </Button>
          </form>
          {promoNote !== null ? (
            <p className="px-1 font-body text-xs text-text-muted">{promoNote}</p>
          ) : null}

          <div className="rounded-2xl bg-surface p-5">
            <h2 className="font-body text-[11px] font-bold tracking-[0.16em] text-text-muted uppercase">
              Codes you can try
            </h2>
            <ul className="mt-3 flex flex-col gap-2 font-body text-sm text-text-secondary">
              {PROMO_CODES.map((promo) => (
                <li key={promo.code}>
                  <button
                    type="button"
                    className="text-left hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                    onClick={() => {
                      setPromoInput(promo.code);
                      setPromoNote(null);
                    }}
                  >
                    <span className="font-bold tracking-wide text-text-primary">{promo.code}</span>
                    <span> — {promo.hint}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {error !== null ? (
        <p role="alert" className="font-body text-sm text-danger">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function CartLine({
  item,
  busy,
  onQty,
  onRemove,
}: {
  readonly item: CartLine;
  readonly busy: boolean;
  readonly onQty: (qty: number) => void;
  readonly onRemove: () => void;
}) {
  const image = mediaUrl(item.imagePathSnapshot);
  const maxQty = commerce.maxQtyPerLine;

  return (
    <li className="flex gap-4 rounded-xl bg-surface-alt/40 p-3 sm:p-4">
      {image !== null ? (
        <img
          src={image}
          alt=""
          width={96}
          height={96}
          className="size-20 shrink-0 rounded-lg object-cover sm:size-24"
        />
      ) : (
        <div
          className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-surface-alt sm:size-24"
          aria-hidden="true"
        >
          <span className="font-body text-[10px] font-bold tracking-[0.16em] text-text-muted uppercase">
            Photo
          </span>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-body font-bold text-text-primary">{item.nameSnapshot}</p>
          <p className="mt-0.5 font-body text-xs text-text-muted">
            {item.variantNameSnapshot}
            {item.sku !== '' ? ` · ${item.sku}` : ''}
          </p>
          <p
            className={cn(
              'mt-1 font-body text-xs font-bold',
              item.inStock ? 'text-primary' : 'text-text-muted',
            )}
          >
            {item.inStock ? 'In stock' : content.product.outOfStock}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center rounded-pill border border-border-strong">
              <button
                type="button"
                aria-label={`Decrease quantity of ${item.nameSnapshot}`}
                disabled={busy || item.qty <= 1}
                onClick={() => {
                  onQty(item.qty - 1);
                }}
                className="inline-flex size-9 items-center justify-center font-body text-lg text-text-primary disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              >
                −
              </button>
              <span className="min-w-6 text-center font-body text-sm font-bold text-text-primary">
                {item.qty}
              </span>
              <button
                type="button"
                aria-label={`Increase quantity of ${item.nameSnapshot}`}
                disabled={busy || item.qty >= maxQty}
                onClick={() => {
                  onQty(item.qty + 1);
                }}
                className="inline-flex size-9 items-center justify-center font-body text-lg text-text-primary disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              >
                +
              </button>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={onRemove}
              aria-label={`Remove ${item.nameSnapshot}`}
              className="font-body text-sm text-text-muted hover:text-text-primary disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              Remove
            </button>
            {features.wishlist ? <SaveForLater productId={item.productId} /> : null}
          </div>
        </div>

        <div className="shrink-0 text-left sm:text-right">
          <p className="font-body text-lg font-bold text-text-primary">
            {formatMoney(item.lineSubtotalMinor, moneyFormat)}
          </p>
          <p className="font-body text-xs text-text-muted">
            {formatMoney(item.priceMinorSnapshot, moneyFormat)} each
          </p>
        </div>
      </div>
    </li>
  );
}

function SaveForLater({ productId }: { readonly productId: string }) {
  const { uid, ready } = useAuth();
  const linkClass =
    'font-body text-sm text-text-muted hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

  if (!ready || uid === null) {
    return (
      <a
        href={`/account/sign-in?next=${encodeURIComponent(`/p/${productId}`)}`}
        className={linkClass}
      >
        Save for later
      </a>
    );
  }

  return (
    <button
      type="button"
      className={linkClass}
      onClick={() => {
        void accountApi.addToWishlist(productId);
      }}
    >
      Save for later
    </button>
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

/** GST already included in the displayed total (prices are tax-inclusive). */
function inclusiveGst(totalMinor: number, basisPoints: number): Money {
  return money(Math.round((totalMinor * basisPoints) / (10_000 + basisPoints)));
}
