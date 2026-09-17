import type { ProductQuery, ProductSort } from '@romp/contracts';
import { MAX_FILTER_VALUES, ProductSortSchema } from '@romp/contracts';

/**
 * Turns a page's `searchParams` into a `ProductQuery`.
 *
 * Next hands `searchParams` as `Record<string, string | string[]>`, because a param can
 * repeat. This narrows each one deliberately: an unknown sort falls back to the default
 * rather than being passed through to fail schema validation, so a hand-edited or
 * bookmarked URL with `?sort=nonsense` renders the default listing instead of a 400. The
 * schema is still the final authority — this only keeps a *malformed* param from becoming
 * an error the customer sees, while a *well-formed but unservable* combination still
 * fails, as it should.
 *
 * The extra fields a specific page fixes — a category slug, an age band — are merged in
 * by the page, not parsed here, because they come from the route segment rather than the
 * query string.
 */
export interface ListingSafetyFlags {
  readonly bis: boolean;
  readonly smallParts: boolean;
  readonly bpa: boolean;
}

export interface ParsedListingParams {
  readonly query: Omit<ProductQuery, 'categorySlugs' | 'ageBands'>;
  /** The raw sort and stock state, for rendering the controls in their current position. */
  readonly sort: ProductSort;
  readonly inStockOnly: boolean;
  /** Extra category slugs from `cat` query params — used on `/listing` and `/age/*`. */
  readonly selectedCategories: readonly string[];
  /**
   * Safety checkboxes live in the URL so they survive a reload, but they are **not**
   * sent to `searchProducts` — the catalogue query has no safety dimension in v1.0.
   */
  readonly safety: ListingSafetyFlags;
  /** Prefix search from `?q=`, used by `/search`. */
  readonly text: string | undefined;
}

/** Visual bounds of the listing price slider, in paise. */
export const LISTING_PRICE_MIN = 49_900;
export const LISTING_PRICE_MAX = 350_000;

export type ListingParamValue = string | readonly string[] | null;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function all(value: string | string[] | undefined): readonly string[] {
  if (value === undefined) return [];
  const parts = Array.isArray(value) ? value : value.split(',');
  return parts.map((part) => part.trim()).filter((part) => part !== '');
}

function flag(value: string | undefined): boolean {
  return value === 'true';
}

function parseSort(value: string | undefined): ProductSort {
  const result = ProductSortSchema.safeParse(value);
  return result.success ? result.data : 'newest';
}

/** Parses a price bound in paise, ignoring anything that is not a non-negative integer. */
function parsePriceBound(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function uniqueSlugs(slugs: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const slug of slugs) {
    if (slug === '' || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
    if (out.length >= MAX_FILTER_VALUES) break;
  }
  return out;
}

export function parseListingParams(
  searchParams: Readonly<Record<string, string | string[] | undefined>>,
): ParsedListingParams {
  const sort = parseSort(first(searchParams.sort));
  const inStockOnly = flag(first(searchParams.inStock));
  const cursor = first(searchParams.cursor);
  const textRaw = first(searchParams.q)?.trim();
  const text = textRaw !== undefined && textRaw !== '' ? textRaw : undefined;

  const minMinor = parsePriceBound(first(searchParams.minPrice));
  const maxMinor = parsePriceBound(first(searchParams.maxPrice));
  const hasPrice = minMinor !== undefined || maxMinor !== undefined;

  return {
    sort,
    inStockOnly,
    selectedCategories: all(searchParams.cat),
    safety: {
      bis: flag(first(searchParams.bis)),
      smallParts: flag(first(searchParams.smallParts)),
      bpa: flag(first(searchParams.bpa)),
    },
    text,
    query: {
      sort,
      inStockOnly: inStockOnly ? true : undefined,
      ...(hasPrice ? { price: { minMinor, maxMinor } } : {}),
      ...(cursor !== undefined ? { cursor: cursor } : {}),
      ...(text !== undefined ? { text } : {}),
    },
  };
}

/**
 * Merges route-fixed filters with query-string categories into a `ProductQuery`.
 *
 * Age stays on the route (`/age/6-8`). Extra categories from `?cat=` stack with a
 * category route so `/c/wooden?cat=puzzles` is both, and an empty `categorySlugs` from
 * `/listing` means "no category filter" rather than `in []`.
 */
export function toProductQuery(
  parsed: ParsedListingParams,
  fixedFilter: { readonly categorySlugs: readonly string[] } | { readonly ageBands: readonly string[] },
): ProductQuery {
  const fromRoute = 'categorySlugs' in fixedFilter ? fixedFilter.categorySlugs : [];
  const categorySlugs = uniqueSlugs([...fromRoute, ...parsed.selectedCategories]);
  const ageBands = 'ageBands' in fixedFilter ? [...fixedFilter.ageBands] : undefined;

  return {
    ...parsed.query,
    ...(categorySlugs.length > 0 ? { categorySlugs } : {}),
    ...(ageBands !== undefined && ageBands.length > 0 ? { ageBands } : {}),
  };
}

/**
 * The query-string params to preserve across pagination, minus the cursor.
 *
 * Rebuilt from the parsed state rather than passed through raw, so a junk param a
 * bookmark carried does not ride along into the "next page" URL.
 */
export function preservedParams(parsed: ParsedListingParams): URLSearchParams {
  const params = new URLSearchParams();
  if (parsed.sort !== 'newest') params.set('sort', parsed.sort);
  if (parsed.inStockOnly) params.set('inStock', 'true');
  if (parsed.text !== undefined) params.set('q', parsed.text);

  const price = parsed.query.price;
  if (price?.minMinor !== undefined) params.set('minPrice', String(price.minMinor));
  if (price?.maxMinor !== undefined) params.set('maxPrice', String(price.maxMinor));
  for (const slug of parsed.selectedCategories) {
    params.append('cat', slug);
  }
  if (parsed.safety.bis) params.set('bis', 'true');
  if (parsed.safety.smallParts) params.set('smallParts', 'true');
  if (parsed.safety.bpa) params.set('bpa', 'true');

  return params;
}

/** Writes listing params, always dropping the cursor so a filter change starts at page one. */
export function applyListingParamChanges(
  current: { readonly toString: () => string },
  changes: Readonly<Record<string, ListingParamValue>>,
): URLSearchParams {
  const next = new URLSearchParams(current.toString());
  next.delete('cursor');

  for (const [key, value] of Object.entries(changes)) {
    next.delete(key);
    if (value === null) continue;
    if (typeof value === 'string') {
      next.set(key, value);
    } else {
      for (const item of value) next.append(key, item);
    }
  }

  return next;
}

export function listingHref(pathname: string, params: URLSearchParams): string {
  const queryString = params.toString();
  return queryString === '' ? pathname : `${pathname}?${queryString}`;
}

/**
 * Where category checkbox changes should land.
 *
 * A single category and no locked age becomes `/c/{slug}` so the URL matches the
 * filter. Several categories, or an age already locked by the route, stay on
 * `/listing` or `/age/{band}` with `cat` params.
 */
export function pathForCategories(
  lockedAge: string | undefined,
  slugs: readonly string[],
): string {
  if (lockedAge !== undefined) return `/age/${lockedAge}`;
  if (slugs.length === 1) {
    const slug = slugs[0];
    if (slug !== undefined) return `/c/${slug}`;
  }
  return '/listing';
}
