import Link from 'next/link';

import type { ProductSummary } from '@romp/contracts';

import { homePlaceholder } from '@/lib/home-placeholders';

import { ProductCard } from './ProductCard';

/**
 * A rail of products for the home page.
 *
 * Lays out as a four-column grid on a desktop and a snapping row on a phone, so six
 * products do not become a tall column that pushes everything below the fold. The
 * heading is passed in from config copy; the "see all" link is optional, for a rail that
 * maps to a listing page.
 *
 * Renders nothing when the rail is empty rather than an empty heading — a home page with
 * "Featured" above a blank space reads as broken, and a freshly seeded store legitimately
 * has categories with no products yet.
 */
export interface ProductRailProps {
  readonly title: string;
  readonly products: readonly ProductSummary[];
  readonly seeAllHref?: string;
  readonly headingId: string;
}

const RAIL_SIZES = '(min-width: 1024px) 25vw, 280px';

export function ProductRail({ title, products, seeAllHref, headingId }: ProductRailProps) {
  if (products.length === 0) return null;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2
          id={headingId}
          className="font-body text-xs font-bold tracking-[0.18em] text-text-primary uppercase"
        >
          {title}
        </h2>
        {seeAllHref !== undefined && (
          <Link
            href={seeAllHref}
            className="font-body text-sm font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            View all <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>

      <ul className="flex snap-x gap-4 overflow-x-auto pb-1 lg:grid lg:grid-cols-4 lg:overflow-visible">
        {products.map((product, index) => (
          <li key={product.id} className="w-[280px] shrink-0 snap-start lg:w-auto lg:min-w-0">
            <ProductCard
              product={product}
              sizes={RAIL_SIZES}
              priority={index === 0}
              placeholderSrc={homePlaceholder(index)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
