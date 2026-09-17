'use client';

import { type ReactNode, useState } from 'react';

import type { VariantOption } from '@romp/contracts';
import { formatMoney, money } from '@romp/contracts';
import { Badge, cn } from '@romp/ui';

import { commerce } from '@/lib/store';

import { AddToCartButton } from './AddToCartButton';

/**
 * Variant selection, price and availability — the buy box.
 *
 * A client island, because the selected variant is state and it drives three things at
 * once: the displayed price, the availability line and whether the add-to-cart button is
 * live. Deriving all three from one `selected` index is what keeps them from disagreeing —
 * a price for one variant beside an "out of stock" for another is the classic buy-box bug.
 *
 * Only *active* variants are offered. An inactive variant still resolves (an old order can
 * reprint), but it is not something a customer can pick, so it never appears here.
 *
 * Availability is a boolean, never a count: the `VariantOption` carries `inStock` only,
 * because the exact number is staff-only and, more honestly, changes between this render
 * and checkout. Out of stock replaces the add button with a disabled state and a word, so
 * the state reaches a screen reader and someone who cannot see the muted styling.
 *
 * Quantity is local UI state passed into the existing add-to-cart call as `qty`. It is
 * capped at the store's `maxQtyPerLine` — the same ceiling the API already enforces.
 */
export interface VariantSelectorProps {
  /** The product the variants belong to — the cart write addresses the variant by both. */
  readonly productId: string;
  readonly variants: readonly VariantOption[];
  /** The buy-box copy, from store config. */
  readonly labels: {
    readonly selectVariant: string;
    readonly addToCart: string;
    readonly outOfStock: string;
  };
  /** Locale and currency for price formatting, from store config. */
  readonly moneyFormat: { readonly locale: string; readonly currency: string };
  /** Wishlist control, composed by the page so this island does not own that write. */
  readonly saveAction?: ReactNode;
  readonly deliveryLabel?: string | undefined;
  readonly returnsLabel?: string | undefined;
}

const PAYMENT_HINTS = ['UPI', 'Cards', 'Netbanking', 'EMI', 'COD'] as const;

export function VariantSelector({
  productId,
  variants,
  labels,
  moneyFormat,
  saveAction,
  deliveryLabel,
  returnsLabel,
}: VariantSelectorProps) {
  const options = variants.filter((variant) => variant.active);
  const [selectedId, setSelectedId] = useState<string | null>(options[0]?.id ?? null);
  const [qty, setQty] = useState(1);

  const selected = options.find((variant) => variant.id === selectedId) ?? options[0] ?? null;

  // No selectable variant at all — an active product always has one (the schema enforces
  // it), but a defensive empty state beats a crash if that invariant is ever violated.
  if (selected === null) {
    return <p className="font-body text-text-muted">{labels.outOfStock}</p>;
  }

  const hasDiscount = selected.mrpMinor > selected.priceMinor;
  const savePercent = hasDiscount
    ? Math.round((1 - selected.priceMinor / selected.mrpMinor) * 100)
    : 0;
  const instalment = money(Math.floor(selected.priceMinor / 3));
  const maxQty = commerce.maxQtyPerLine;

  return (
    <div className="flex flex-col gap-5">
      {options.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="font-body text-[11px] font-bold tracking-[0.16em] text-text-muted uppercase">
            {labels.selectVariant}
          </legend>
          <div className="flex flex-wrap gap-2">
            {options.map((variant) => {
              const isSelected = variant.id === selected.id;
              return (
                <label
                  key={variant.id}
                  className={cn(
                    'cursor-pointer rounded-pill border px-4 py-2 font-body text-sm font-bold',
                    'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring',
                    isSelected
                      ? 'border-primary bg-primary text-primary-on'
                      : 'border-border-strong text-text-secondary hover:text-text-primary',
                  )}
                >
                  <input
                    type="radio"
                    name="variant"
                    value={variant.id}
                    checked={isSelected}
                    onChange={() => {
                      setSelectedId(variant.id);
                    }}
                    className="sr-only"
                  />
                  {variant.name}
                  {!variant.inStock && (
                    <span className="ml-1 font-semibold opacity-70">· {labels.outOfStock}</span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="font-body text-3xl font-bold text-text-primary">
            {formatMoney(selected.priceMinor, moneyFormat)}
          </span>
          {hasDiscount && (
            <span className="font-body text-lg text-text-muted line-through">
              {formatMoney(selected.mrpMinor, moneyFormat)}
            </span>
          )}
          {savePercent > 0 ? (
            <Badge tone="accent">Save {String(savePercent)}%</Badge>
          ) : null}
        </div>
        <p className="font-body text-xs text-text-muted">
          Inclusive of tax · or 3 × {formatMoney(instalment, moneyFormat)}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-pill border border-border-strong">
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={qty <= 1}
            onClick={() => {
              setQty((current) => Math.max(1, current - 1));
            }}
            className="inline-flex size-11 items-center justify-center font-body text-lg text-text-primary disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            −
          </button>
          <span className="min-w-6 text-center font-body text-sm font-bold text-text-primary">
            {qty}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            disabled={qty >= maxQty}
            onClick={() => {
              setQty((current) => Math.min(maxQty, current + 1));
            }}
            className="inline-flex size-11 items-center justify-center font-body text-lg text-text-primary disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            +
          </button>
        </div>

        <div className="min-w-[12rem] flex-1">
          <AddToCartButton
            productId={productId}
            variantId={selected.id}
            inStock={selected.inStock}
            label={labels.addToCart}
            qty={qty}
            priceCaption={formatMoney(selected.priceMinor, moneyFormat)}
          />
        </div>

        {saveAction}
      </div>

      {!selected.inStock ? (
        <p className="font-body text-sm text-text-muted">
          <Badge tone="neutral">{labels.outOfStock}</Badge>
        </p>
      ) : null}

      <ul className="flex flex-wrap gap-x-4 gap-y-1 font-body text-[11px] font-bold tracking-[0.12em] text-text-muted uppercase">
        {PAYMENT_HINTS.map((hint) => (
          <li key={hint}>{hint}</li>
        ))}
      </ul>

      {(deliveryLabel !== undefined || returnsLabel !== undefined) && (
        <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
          {deliveryLabel !== undefined ? (
            <p className="font-body text-[11px] font-bold tracking-[0.14em] text-text-secondary uppercase">
              {deliveryLabel}
            </p>
          ) : (
            <span />
          )}
          {returnsLabel !== undefined ? (
            <p className="font-body text-[11px] font-bold tracking-[0.14em] text-text-secondary uppercase">
              {returnsLabel}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
