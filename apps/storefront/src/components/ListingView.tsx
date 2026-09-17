import type { ProductQuery } from '@romp/contracts';
import { money } from '@romp/contracts';

import { Breadcrumbs } from '@/components/Breadcrumbs';
import type { Crumb } from '@/components/Breadcrumbs';
import { EmptyState } from '@romp/ui';
import { ListingChips } from '@/components/ListingChips';
import type { ListingChip } from '@/components/ListingChips';
import { ListingControls } from '@/components/ListingControls';
import { ListingSidebar } from '@/components/ListingSidebar';
import { Pagination } from '@/components/Pagination';
import { ProductGrid } from '@/components/ProductGrid';
import { homePlaceholder } from '@/lib/home-placeholders';
import {
  listingHref,
  parseListingParams,
  preservedParams,
  toProductQuery,
} from '@/lib/listing';
import { content, formatMoney, moneyFormat } from '@/lib/store';
import { facets, searchProducts } from '@/server/catalogue';

/**
 * The shared body of every listing page.
 *
 * The category page, the age-band page and `/listing` differ only in their heading,
 * breadcrumbs and the filter they fix — so the query, the sidebar, the grid, the empty
 * state and the pagination all live here.
 *
 * A server component: it reads the query, runs the search server-side, and renders the
 * result. The client islands inside it are `ListingControls` and `ListingSidebar`, which
 * write the URL.
 */
export interface ListingViewProps {
  /** The page's own heading. */
  readonly title: string;
  /** The route path without query string, for pagination links, e.g. `/c/wooden`. */
  readonly basePath: string;
  /** Search params from the route, already narrowed by the page. */
  readonly searchParams: Readonly<Record<string, string | string[] | undefined>>;
  /**
   * The filter this route fixes — a category or an age band. Merged into the parsed
   * query, so the route decides what is being listed and the shared code decides how.
   */
  readonly fixedFilter: { readonly categorySlugs: string[] } | { readonly ageBands: string[] };
  readonly crumbs: readonly Crumb[];
  /** Age-band value locked by `/age/{band}`, if any. */
  readonly lockedAge?: string;
  /** Category slug locked by `/c/{slug}`, if any. */
  readonly lockedCategory?: string;
  /** Shown after the result count, e.g. the age-band label. */
  readonly kicker?: string;
}

export async function ListingView({
  title,
  basePath,
  searchParams,
  fixedFilter,
  crumbs,
  lockedAge,
  lockedCategory,
  kicker,
}: ListingViewProps) {
  const parsed = parseListingParams(searchParams);
  const query: ProductQuery = toProductQuery(parsed, fixedFilter);

  const [page, facetCounts] = await Promise.all([searchProducts(query), facets(query)]);
  const params = preservedParams(parsed);
  const showCategoryCounts = facetCounts.countedDimensions.includes('categories');

  const subtitle = [countLabel(page.items.length), kicker].filter(Boolean).join(' · ');

  const chips = buildChips({
    parsed,
    params,
    basePath,
    title,
    lockedAge,
    lockedCategory,
  });

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs label={content.product.breadcrumbHome} items={crumbs} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-8 lg:gap-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4 lg:col-start-2 lg:row-start-1">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="font-display text-4xl leading-none tracking-tight text-text-primary uppercase sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="font-body text-sm text-text-muted">{subtitle}</p>
          </div>
          <ListingControls sort={parsed.sort} />
        </header>

        <div className="lg:col-start-1 lg:row-start-1 lg:row-span-2">
          <ListingSidebar
            lockedAge={lockedAge}
            lockedCategory={lockedCategory}
            selectedCategories={parsed.selectedCategories}
            minPrice={parsed.query.price?.minMinor}
            maxPrice={parsed.query.price?.maxMinor}
            inStockOnly={parsed.inStockOnly}
            bis={parsed.safety.bis}
            smallParts={parsed.safety.smallParts}
            bpa={parsed.safety.bpa}
            categoryCounts={facetCounts.categories}
            showCategoryCounts={showCategoryCounts}
          />
        </div>

        <div className="flex flex-col gap-5 lg:col-start-2 lg:row-start-2">
          <ListingChips items={chips} clearHref="/listing" />

          {page.items.length === 0 ? (
            <EmptyState
              title={content.emptyStates.noResults.title}
              body={content.emptyStates.noResults.body}
            />
          ) : (
            <>
              <ProductGrid
                products={page.items}
                columns={3}
                priorityCount={3}
                placeholderFor={homePlaceholder}
              />
              <Pagination
                basePath={basePath}
                params={params}
                nextCursor={page.nextCursor}
                hasCursor={parsed.query.cursor !== undefined}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function countLabel(count: number): string {
  return `${String(count)} toys`;
}

function buildChips({
  parsed,
  params,
  basePath,
  title,
  lockedAge,
  lockedCategory,
}: {
  readonly parsed: ReturnType<typeof parseListingParams>;
  readonly params: URLSearchParams;
  readonly basePath: string;
  readonly title: string;
  readonly lockedAge: string | undefined;
  readonly lockedCategory: string | undefined;
}): ListingChip[] {
  const chips: ListingChip[] = [];
  const categoryNames = new Map(content.categories.map((category) => [category.slug, category.name]));

  if (lockedAge !== undefined) {
    const withoutAge = new URLSearchParams(params);
    let path = '/listing';
    if (parsed.selectedCategories.length === 1) {
      const slug = parsed.selectedCategories[0];
      if (slug !== undefined) {
        path = `/c/${slug}`;
        withoutAge.delete('cat');
      }
    } else if (parsed.selectedCategories.length > 1) {
      path = '/listing';
    } else if (lockedCategory !== undefined) {
      path = `/c/${lockedCategory}`;
    }
    chips.push({ label: title, href: listingHref(path, withoutAge) });
  }

  if (lockedCategory !== undefined) {
    const withoutCategory = new URLSearchParams(params);
    const path = lockedAge !== undefined ? `/age/${lockedAge}` : '/listing';
    chips.push({ label: title, href: listingHref(path, withoutCategory) });
  }

  for (const slug of parsed.selectedCategories) {
    const nextCats = parsed.selectedCategories.filter((item) => item !== slug);
    const next = new URLSearchParams(params);
    next.delete('cat');
    for (const item of nextCats) next.append('cat', item);
    chips.push({
      label: categoryNames.get(slug) ?? slug,
      href: listingHref(basePath, next),
    });
  }

  const price = parsed.query.price;
  if (price?.minMinor !== undefined || price?.maxMinor !== undefined) {
    const next = new URLSearchParams(params);
    next.delete('minPrice');
    next.delete('maxPrice');
    const min = price.minMinor !== undefined ? formatMoney(money(price.minMinor), moneyFormat) : '';
    const max = price.maxMinor !== undefined ? formatMoney(money(price.maxMinor), moneyFormat) : '';
    const label = [min, max].filter(Boolean).join(' – ');
    chips.push({ label, href: listingHref(basePath, next) });
  }

  if (parsed.inStockOnly) {
    const next = new URLSearchParams(params);
    next.delete('inStock');
    chips.push({ label: 'In stock', href: listingHref(basePath, next) });
  }

  if (parsed.safety.bis) {
    const next = new URLSearchParams(params);
    next.delete('bis');
    chips.push({ label: content.product.bisCertifiedLabel, href: listingHref(basePath, next) });
  }
  if (parsed.safety.smallParts) {
    const next = new URLSearchParams(params);
    next.delete('smallParts');
    chips.push({ label: 'No small parts', href: listingHref(basePath, next) });
  }
  if (parsed.safety.bpa) {
    const next = new URLSearchParams(params);
    next.delete('bpa');
    chips.push({ label: content.product.bpaFreeLabel, href: listingHref(basePath, next) });
  }

  return chips;
}
