import type { ProductSummary } from '@romp/contracts';
import { Card, Skeleton } from '@romp/ui';

import { ProductCard } from './ProductCard';

/**
 * A responsive product grid.
 *
 * Listing sits beside a sidebar and uses three columns from tablet up, so cards stay
 * compact. Home rails use four. Breakpoints are matched by `ProductCard`'s `sizes`, so
 * the browser fetches an image scaled to the column it will occupy rather than the
 * full-width original.
 */
export interface ProductGridProps {
  readonly products: readonly ProductSummary[];
  /**
   * How many leading cards get `priority` on their image.
   *
   * The first row is the LCP candidate on a listing page, so it is preloaded; the rest
   * lazy-load. Defaulting to the desktop row width (4) is the safe over-estimate — a
   * phone shows one of them above the fold and preloads three it will scroll to, which
   * costs little, whereas priority on the whole grid floods the network.
   */
  readonly priorityCount?: number;
  /**
   * Column count at the desktop breakpoint.
   *
   * Listing uses 3 so at least three cards share a row next to the filters. Home uses 4.
   */
  readonly columns?: 2 | 3 | 4;
  /** Cover used when a product has no photography yet. */
  readonly placeholderFor?: (index: number) => string;
}

const DEFAULT_PRIORITY_ROW = 4;

const GRID_CLASS: Readonly<Record<2 | 3 | 4, string>> = {
  2: 'grid grid-cols-1 gap-5 sm:grid-cols-2',
  3: 'grid grid-cols-2 gap-4 md:grid-cols-3',
  4: 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4',
};

const COLUMN_SIZES: Readonly<Partial<Record<2 | 3 | 4, string>>> = {
  2: '(min-width: 1024px) 35vw, 100vw',
  3: '(min-width: 1024px) 22vw, (min-width: 768px) 30vw, 50vw',
};

export function ProductGrid({
  products,
  priorityCount = DEFAULT_PRIORITY_ROW,
  columns = 4,
  placeholderFor,
}: ProductGridProps) {
  return (
    <ul className={GRID_CLASS[columns]}>
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard
            product={product}
            priority={index < priorityCount}
            {...(placeholderFor === undefined ? {} : { placeholderSrc: placeholderFor(index) })}
            {...(COLUMN_SIZES[columns] === undefined ? {} : { sizes: COLUMN_SIZES[columns] })}
          />
        </li>
      ))}
    </ul>
  );
}

/**
 * The grid's loading state.
 *
 * Same columns and the same square aspect ratio as a real card, so the page does not jump
 * when products replace the skeleton — a skeleton of the wrong shape is worse than none,
 * because it moves the layout twice. Rendered inside a `Suspense` fallback while the
 * server component fetches.
 */
export function ProductGridSkeleton({
  count = 8,
  columns = 4,
}: {
  readonly count?: number;
  readonly columns?: 2 | 3 | 4;
}) {
  return (
    <ul aria-hidden="true" className={GRID_CLASS[columns]}>
      {Array.from({ length: count }, (_unused, index) => (
        <li key={index}>
          <Card className="h-full overflow-hidden">
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="mt-2 h-5 w-1/2" />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
