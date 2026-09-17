import Link from 'next/link';

/**
 * Active-filter chips above the listing grid.
 *
 * Each chip is a link that drops that one filter, and "Clear all" returns to
 * `/listing` with an empty query. Links rather than buttons so the state is a URL
 * (shareable, works without JavaScript) the same way pagination is.
 *
 * "Clear all" is UI chrome, like "Sort" — it names the control, not the store.
 */
export interface ListingChip {
  readonly label: string;
  readonly href: string;
}

export interface ListingChipsProps {
  readonly items: readonly ListingChip[];
  readonly clearHref: string;
}

export function ListingChips({ items, clearHref }: ListingChipsProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((chip) => (
        <Link
          key={`${chip.label}-${chip.href}`}
          href={chip.href}
          className="inline-flex items-center gap-2 rounded-pill bg-primary px-3 py-1.5 font-body text-sm font-bold text-primary-on focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {chip.label}
          <span aria-hidden="true">×</span>
        </Link>
      ))}
      <Link
        href={clearHref}
        className="px-1 font-body text-sm text-text-muted underline-offset-2 hover:text-text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      >
        Clear all
      </Link>
    </div>
  );
}
