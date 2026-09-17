'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';

import { money } from '@romp/contracts';

import {
  LISTING_PRICE_MAX,
  LISTING_PRICE_MIN,
  applyListingParamChanges,
  listingHref,
  pathForCategories,
} from '@/lib/listing';
import { content, formatMoney, moneyFormat } from '@/lib/store';

/**
 * Faceted filters for a listing page.
 *
 * A client island: it writes the URL the same way `ListingControls` does, so the
 * filters are shareable and the server listing re-renders from the new params.
 *
 * Labels for Age / Price / Category / the "All" chip / "In stock only" / "No small
 * parts" are UI chrome, like "Search" — they describe the control, not the store.
 * Safety labels that are brand voice (`BIS certified`, `BPA-free`) come from config.
 *
 * Safety checkboxes are URL-only in v1.0: the search port has no safety dimension, so
 * they do not change which products come back. They stay in the query string so a
 * later engine can honour them without a new UI.
 */

export interface ListingSidebarProps {
  readonly lockedAge: string | undefined;
  readonly lockedCategory: string | undefined;
  readonly selectedCategories: readonly string[];
  readonly minPrice: number | undefined;
  readonly maxPrice: number | undefined;
  readonly inStockOnly: boolean;
  readonly bis: boolean;
  readonly smallParts: boolean;
  readonly bpa: boolean;
  readonly categoryCounts: Readonly<Record<string, number>>;
  readonly showCategoryCounts: boolean;
}

function unique(slugs: readonly string[]): string[] {
  return [...new Set(slugs.filter((slug) => slug !== ''))];
}

export function ListingSidebar({
  lockedAge,
  lockedCategory,
  selectedCategories,
  minPrice,
  maxPrice,
  inStockOnly,
  bis,
  smallParts,
  bpa,
  categoryCounts,
  showCategoryCounts,
}: ListingSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigate(path: string, changes: Readonly<Record<string, string | readonly string[] | null>>): void {
    const next = applyListingParamChanges(searchParams, changes);
    if (!path.startsWith('/age/') && !path.startsWith('/listing')) {
      next.delete('cat');
    }
    router.push(listingHref(path, next));
  }

  function update(changes: Readonly<Record<string, string | readonly string[] | null>>): void {
    navigate(pathname, changes);
  }

  const currentCategories = unique([
    ...(lockedCategory !== undefined ? [lockedCategory] : []),
    ...selectedCategories,
  ]);

  const filterCategories = content.categories
    .filter(
      (category) =>
        category.active && category.showInFilters && category.parent === undefined,
    )
    .sort((left, right) => left.sortOrder - right.sortOrder);

  return (
    <aside className="flex flex-col gap-6 rounded-lg border border-border bg-surface p-4 sm:p-5">
      <section className="flex flex-col gap-3">
        <h2 className="font-body text-[11px] font-bold tracking-[0.16em] text-text-muted uppercase">
          Age
        </h2>
        <div className="flex flex-wrap gap-2">
          <AgeChip
            label="All"
            selected={lockedAge === undefined}
            onSelect={() => {
              const path = pathForCategories(undefined, currentCategories);
              const cats =
                path.startsWith('/c/') || currentCategories.length === 0 ? null : currentCategories;
              navigate(path, { cat: cats });
            }}
          />
          {content.ageBands.map((band) => (
            <AgeChip
              key={band.value}
              label={band.label}
              selected={lockedAge === band.value}
              onSelect={() => {
                navigate(`/age/${band.value}`, {
                  cat: currentCategories.length > 0 ? currentCategories : null,
                });
              }}
            />
          ))}
        </div>
      </section>

      <PriceSlider
        minPrice={minPrice}
        maxPrice={maxPrice}
        onCommit={(nextMin, nextMax) => {
          const atRest = nextMin === LISTING_PRICE_MIN && nextMax === LISTING_PRICE_MAX;
          update({
            minPrice: atRest ? null : String(nextMin),
            maxPrice: atRest ? null : String(nextMax),
          });
        }}
      />

      <section className="flex flex-col gap-3">
        <h2 className="font-body text-[11px] font-bold tracking-[0.16em] text-text-muted uppercase">
          Category
        </h2>
        <ul className="flex flex-col gap-2">
          {filterCategories.map((category) => {
            const checked = currentCategories.includes(category.slug);
            const count = categoryCounts[category.slug];
            return (
              <li key={category.slug}>
                <label className="flex cursor-pointer items-center gap-2 font-body text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked
                        ? currentCategories.filter((slug) => slug !== category.slug)
                        : [...currentCategories, category.slug];
                      const path = pathForCategories(lockedAge, next);
                      const catsForQuery = path.startsWith('/c/') ? null : next;
                      navigate(path, { cat: catsForQuery !== null && catsForQuery.length > 0 ? catsForQuery : null });
                    }}
                    className="h-4 w-4 rounded border-border-strong text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                  />
                  <span className="flex-1 text-text-primary">{category.name}</span>
                  {showCategoryCounts && count !== undefined ? (
                    <span className="text-text-muted">{count}</span>
                  ) : null}
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-body text-[11px] font-bold tracking-[0.16em] text-text-muted uppercase">
          {content.product.safetyTitle}
        </h2>
        <ul className="flex flex-col gap-2">
          <FlagRow
            label={content.product.bisCertifiedLabel}
            checked={bis}
            onChange={(next) => {
              update({ bis: next ? 'true' : null });
            }}
          />
          <FlagRow
            label="No small parts"
            checked={smallParts}
            onChange={(next) => {
              update({ smallParts: next ? 'true' : null });
            }}
          />
          <FlagRow
            label={content.product.bpaFreeLabel}
            checked={bpa}
            onChange={(next) => {
              update({ bpa: next ? 'true' : null });
            }}
          />
        </ul>
      </section>

      <label className="flex cursor-pointer items-center gap-2 font-body text-sm text-text-secondary">
        <input
          type="checkbox"
          checked={inStockOnly}
          onChange={(event) => {
            update({ inStock: event.target.checked ? 'true' : null });
          }}
          className="h-4 w-4 rounded border-border-strong text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        />
        In stock only
      </label>
    </aside>
  );
}

function AgeChip({
  label,
  selected,
  onSelect,
}: {
  readonly label: string;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={
        selected
          ? 'rounded-pill bg-primary px-3 py-1.5 font-body text-sm font-bold text-primary-on focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring'
          : 'rounded-pill bg-surface-alt px-3 py-1.5 font-body text-sm font-bold text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring'
      }
    >
      {label}
    </button>
  );
}

function FlagRow({
  label,
  checked,
  onChange,
}: {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (next: boolean) => void;
}) {
  return (
    <li>
      <label className="flex cursor-pointer items-center gap-2 font-body text-sm text-text-primary">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => {
            onChange(event.target.checked);
          }}
          className="h-4 w-4 rounded border-border-strong text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        />
        {label}
      </label>
    </li>
  );
}

function PriceSlider({
  minPrice,
  maxPrice,
  onCommit,
}: {
  readonly minPrice: number | undefined;
  readonly maxPrice: number | undefined;
  readonly onCommit: (min: number, max: number) => void;
}) {
  const minId = useId();
  const maxId = useId();
  const [min, setMin] = useState(minPrice ?? LISTING_PRICE_MIN);
  const [max, setMax] = useState(maxPrice ?? LISTING_PRICE_MAX);
  const minRef = useRef(min);
  const maxRef = useRef(max);

  useEffect(() => {
    const nextMin = minPrice ?? LISTING_PRICE_MIN;
    const nextMax = maxPrice ?? LISTING_PRICE_MAX;
    setMin(nextMin);
    setMax(nextMax);
    minRef.current = nextMin;
    maxRef.current = nextMax;
  }, [minPrice, maxPrice]);

  function clampPair(nextMin: number, nextMax: number): { min: number; max: number } {
    const lo = Math.min(Math.max(nextMin, LISTING_PRICE_MIN), LISTING_PRICE_MAX);
    const hi = Math.min(Math.max(nextMax, LISTING_PRICE_MIN), LISTING_PRICE_MAX);
    return lo <= hi ? { min: lo, max: hi } : { min: hi, max: lo };
  }

  function apply(nextMin: number, nextMax: number): void {
    const next = clampPair(nextMin, nextMax);
    setMin(next.min);
    setMax(next.max);
    minRef.current = next.min;
    maxRef.current = next.max;
  }

  function commit(): void {
    onCommit(minRef.current, maxRef.current);
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-body text-[11px] font-bold tracking-[0.16em] text-text-muted uppercase">
        Price
      </h2>
      <div className="relative h-6">
        <input
          id={minId}
          type="range"
          min={LISTING_PRICE_MIN}
          max={LISTING_PRICE_MAX}
          step={100}
          value={min}
          aria-label="Minimum price"
          onChange={(event) => {
            apply(Number(event.target.value), maxRef.current);
          }}
          onPointerUp={commit}
          onKeyUp={commit}
          className="absolute inset-x-0 top-1 w-full accent-primary"
        />
        <input
          id={maxId}
          type="range"
          min={LISTING_PRICE_MIN}
          max={LISTING_PRICE_MAX}
          step={100}
          value={max}
          aria-label="Maximum price"
          onChange={(event) => {
            apply(minRef.current, Number(event.target.value));
          }}
          onPointerUp={commit}
          onKeyUp={commit}
          className="absolute inset-x-0 top-1 w-full accent-primary"
        />
      </div>
      <div className="flex justify-between font-body text-xs text-text-muted">
        <span>{formatMoney(money(min), moneyFormat)}</span>
        <span>{formatMoney(money(max), moneyFormat)}</span>
      </div>
    </section>
  );
}
