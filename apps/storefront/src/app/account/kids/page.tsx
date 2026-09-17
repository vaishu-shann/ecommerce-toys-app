import Link from 'next/link';

import { AccountPlaceholder } from '@/components/account/AccountPlaceholder';

export const metadata = { title: 'Kids profiles' };

export default function AccountKidsPage() {
  return (
    <AccountPlaceholder
      title="Kids profiles"
      headingId="kids-heading"
      next="/account/kids"
      message="Sign in to see kids profiles."
    >
      <p>
        Kids profiles are not saved on this storefront yet. Age filters on Explore still work
        without a saved profile.
      </p>
      <p>
        <Link href="/listing" className="font-semibold text-primary">
          Shop by age on Explore
        </Link>
      </p>
    </AccountPlaceholder>
  );
}
