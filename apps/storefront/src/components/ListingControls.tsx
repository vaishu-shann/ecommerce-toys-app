'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useId } from 'react';

import type { ProductSort } from '@romp/contracts';

import { applyListingParamChanges, listingHref } from '@/lib/listing';

/**
 * Sort and layout controls for a listing page.
 *
 * A client island, because it writes to the URL — the sort lives in the query string,
 * so the state is shareable, bookmarkable and survives a reload, and the server
 * component re-renders from the new params.
 *
 * **Changing a control resets the page.** The `cursor` param is dropped on every change,
 * because a cursor is bound to its sort (it encodes the sort it was issued for).
 *
 * "Sort", "Popular" and "Grid" are UI chrome, like "Search" — they name the control,
 * not the store. `newest` is labelled Popular to match the listing chrome; it is still
 * the same catalogue sort.
 */
export interface ListingControlsProps {
  readonly sort: ProductSort;
}

const SORT_OPTIONS: readonly { readonly value: ProductSort; readonly label: string }[] = [
  { value: 'newest', label: 'Popular' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating_desc', label: 'Top rated' },
];

export function ListingControls({ sort }: ListingControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sortId = useId();

  function update(changes: Readonly<Record<string, string | null>>): void {
    const next = applyListingParamChanges(searchParams, changes);
    router.push(listingHref(pathname, next));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="inline-flex items-center gap-2 rounded-pill border border-border-strong bg-surface px-3 py-2 font-body text-sm text-text-secondary">
        <span id={`${sortId}-label`}>Sort</span>
        <select
          aria-labelledby={`${sortId}-label`}
          value={sort}
          onChange={(event) => {
            update({ sort: event.target.value === 'newest' ? null : event.target.value });
          }}
          className="bg-transparent font-body font-bold text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        aria-pressed="true"
        className="inline-flex min-h-9 items-center rounded-pill border border-border-strong bg-surface px-4 py-2 font-body text-sm font-bold text-text-primary"
      >
        Grid
      </button>
    </div>
  );
}
