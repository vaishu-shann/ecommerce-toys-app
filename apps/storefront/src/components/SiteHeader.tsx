import Link from 'next/link';

import { ThemeToggle } from '@romp/ui';

import { content, features } from '@/lib/store';

import { HeaderBell } from './HeaderBell';
import { HeaderCart } from './HeaderCart';
import { HeaderProfile } from './HeaderProfile';
import { Wordmark } from './Wordmark';

/**
 * The storefront header.
 *
 * A server component, so the wordmark, promo strip and account controls are in the initial
 * HTML. Browse lives as a single Explore link to `/listing` — category and age filters
 * belong on that page, not in the chrome. Account actions are icon-only: bell, wishlist,
 * cart, profile, then the colour-mode toggle.
 */

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-page/95 backdrop-blur">
      <div className="bg-primary text-primary-on">
        <div className="mx-auto flex w-[90%] items-center justify-between gap-4 py-2 font-body text-[11px] font-bold tracking-[0.12em] uppercase sm:text-xs">
          <p>{content.home.promo.headline}</p>
          <p className="hidden text-right sm:block">{content.home.promo.subcopy}</p>
        </div>
      </div>

      <div className="border-b border-border">
        <div className="mx-auto flex min-h-16 w-[90%] items-center gap-2 sm:gap-3">
          <Wordmark compact className="shrink-0 sm:hidden" />
          <Wordmark className="hidden shrink-0 sm:block" />

          <nav aria-label="Explore" className="shrink-0">
            <Link
              href="/listing"
              className="inline-flex min-h-11 items-center rounded-pill px-3 font-body text-sm font-bold text-primary hover:bg-surface-alt"
            >
              Explore
            </Link>
          </nav>

          <div className="flex-1" />

          <form action="/search" role="search" className="hidden lg:block">
            <label htmlFor="site-search" className="sr-only">
              Search toys
            </label>
            <input
              id="site-search"
              name="q"
              type="search"
              placeholder="Search toys"
              className="min-h-11 w-56 rounded-pill border border-border bg-surface-alt px-4 font-body text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring xl:w-64"
            />
          </form>

          <div className="header-actions">
            <HeaderBell />

            {features.wishlist ? (
              <Link href="/account/wishlist" aria-label="Saved toys" className="header-action">
                <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true" fill="none">
                  <path
                    d="M10 16S3.5 12 3.5 7.8A3.3 3.3 0 0110 6a3.3 3.3 0 016.5 1.8C16.5 12 10 16 10 16z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </Link>
            ) : null}

            <HeaderCart />
            <HeaderProfile />
            <ThemeToggle className="header-action" />
          </div>
        </div>
      </div>
    </header>
  );
}
