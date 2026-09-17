import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { Suspense } from 'react';

import { ListingPageSkeleton } from '@/components/ListingSkeleton';
import { ListingView } from '@/components/ListingView';
import { parseListingParams, preservedParams, listingHref } from '@/lib/listing';
import { content } from '@/lib/store';
import { getCategory } from '@/server/catalogue';

/**
 * A category listing page: `/c/{slug}`.
 *
 * Statically rendered per category and revalidated by tag — a product entering or leaving
 * the category busts `category:{slug}` (Task 12). The `[slug]` params vary, so this is an
 * on-demand static page rather than one pre-rendered at build; the first request warms it,
 * every later one is cached.
 *
 * `/c/all` used to be a reserved slug for "everything". That listing now lives at
 * `/listing`; this page permanently redirects so old links and bookmarks still resolve.
 */

export const revalidate = 3600;

const ALL_SLUG = 'all';

interface CategoryPageProps {
  readonly params: Promise<{ readonly slug: string }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  if (slug === ALL_SLUG) {
    return { title: content.listing.title };
  }

  const category = await getCategory(slug);
  // A missing category still needs metadata; the page itself renders the 404.
  return { title: category?.name ?? 'Category' };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;

  if (slug === ALL_SLUG) {
    permanentRedirect(listingHref('/listing', preservedParams(parseListingParams(resolvedSearchParams))));
  }

  const category = await getCategory(slug);
  // 404 for an unknown slug, so a mistyped or retired category is a clean not-found rather
  // than an empty listing that looks like the category exists but is out of stock.
  if (category === null) notFound();

  return (
    <Suspense fallback={<ListingPageSkeleton />}>
      <ListingView
        title={category.name}
        basePath={`/c/${category.slug}`}
        searchParams={resolvedSearchParams}
        fixedFilter={{ categorySlugs: [category.slug] }}
        lockedCategory={category.slug}
        crumbs={[
          { label: content.product.breadcrumbHome, href: '/' },
          { label: content.listing.title, href: '/listing' },
          { label: category.name },
        ]}
      />
    </Suspense>
  );
}
