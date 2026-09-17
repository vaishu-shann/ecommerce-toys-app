import { Skeleton } from '@romp/ui';

import { ProductGridSkeleton } from '@/components/ProductGrid';

/**
 * Route-level loading shell shaped like the listing page so the layout does not jump.
 *
 * Kept out of `ListingView` so `loading.tsx` does not import the server catalogue layer.
 */
export function ListingPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-4 w-48" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <Skeleton className="hidden h-[32rem] lg:block" />
        <div className="flex flex-col gap-5">
          <Skeleton className="h-14 w-72" />
          <ProductGridSkeleton count={6} columns={3} />
        </div>
      </div>
    </div>
  );
}
