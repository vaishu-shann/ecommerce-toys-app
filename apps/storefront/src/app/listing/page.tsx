import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ListingPageSkeleton } from '@/components/ListingSkeleton';
import { ListingView } from '@/components/ListingView';
import { content } from '@/lib/store';

/**
 * The unfiltered catalogue: `/listing`.
 *
 * Replaces the reserved `/c/all` slug so "see everything" is a real route rather than a
 * fake category. `/c/all` permanently redirects here, keeping old links working.
 */

export const revalidate = 3600;

interface ListingPageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export function generateMetadata(): Metadata {
  return { title: content.listing.title };
}

export default async function ListingPage({ searchParams }: ListingPageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <Suspense fallback={<ListingPageSkeleton />}>
      <ListingView
        title={content.listing.title}
        basePath="/listing"
        searchParams={resolvedSearchParams}
        fixedFilter={{ categorySlugs: [] }}
        crumbs={[
          { label: content.product.breadcrumbHome, href: '/' },
          { label: content.listing.title },
        ]}
      />
    </Suspense>
  );
}
