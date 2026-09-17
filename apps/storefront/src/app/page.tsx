import Image from 'next/image';
import { Suspense } from 'react';

import { Badge, ButtonLink, Card, Reveal } from '@romp/ui';

import { FeaturedRail, NavCategoryRails } from '@/components/HomeRails';
import { ProductGridSkeleton } from '@/components/ProductGrid';
import { homePlaceholder } from '@/lib/home-placeholders';
import { brand, content } from '@/lib/store';

/**
 * The home page.
 *
 * Statically rendered and revalidated by tag: nothing here is per-request, so it is a
 * cached document that a catalogue write busts (see `revalidate` below and
 * `cacheTags.catalogue`). The hero, the age rail and the trust badges are config; the
 * product rails are live data.
 *
 * The rails are wrapped in `Suspense` so the static shell — hero, headings, age cards —
 * paints immediately and the data-dependent rails stream in behind a skeleton, rather
 * than the whole page waiting on Firestore.
 */

/**
 * Revalidate hourly as a floor, and on demand when the catalogue changes.
 *
 * The time-based floor is a backstop: even if a tag revalidation is somehow missed, the
 * page is never more than an hour stale. The real freshness comes from
 * `revalidateTag(cacheTags.catalogue)`, which Task 12's product-write path calls, so a
 * publish is reflected in seconds rather than at the next hourly boundary.
 */
export const revalidate = 3600;

const RAIL_SKELETON_COUNT = 4;

export default function HomePage() {
  const { hero, sale, trustBadges, ageSectionTitle, featuredTitle } = content.home;
  const ageSpan = `${content.ageBands[0]?.label ?? ''}–${content.ageBands.at(-1)?.label ?? ''}`;

  return (
    <div className="flex flex-col gap-12 lg:gap-16">
      <section className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <Card className="flex flex-col justify-between gap-8 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-2">
              <Badge tone="primary">{hero.eyebrow}</Badge>
              {ageSpan.length > 1 ? (
                <Badge tone="neutral" className="border border-border-strong">
                  {ageSpan}
                </Badge>
              ) : null}
            </div>
            <h1 className="max-w-xl font-display text-4xl leading-[0.95] tracking-tight text-text-primary uppercase sm:text-5xl lg:text-6xl">
              {hero.headline}
            </h1>
            <p className="max-w-md font-body text-base text-text-secondary sm:text-lg">
              {hero.subcopy}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={hero.primaryCta.href} size="lg">
              {hero.primaryCta.label}
            </ButtonLink>
            <ButtonLink href={hero.secondaryCta.href} size="lg" variant="outline">
              {hero.secondaryCta.label}
            </ButtonLink>
          </div>
        </Card>

        <div className="flex min-h-0 flex-col gap-4">
          <div className="relative flex min-h-52 flex-1 items-end overflow-hidden rounded-lg bg-surface-alt shadow-card sm:min-h-64">
            <Image
              src={homePlaceholder(0)}
              alt=""
              fill
              priority
              unoptimized
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
            <p className="relative z-10 bg-page/70 px-6 py-4 font-body text-xs font-bold tracking-[0.18em] text-text-primary uppercase">
              {brand.tagline}
            </p>
          </div>
          <div className="flex flex-col gap-4 rounded-lg bg-accent p-6 text-accent-on shadow-card sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-2xl tracking-tight uppercase sm:text-3xl">
                {sale.headline}
              </p>
              <p className="mt-1 font-body text-sm">{sale.subcopy}</p>
            </div>
            <ButtonLink href={sale.cta.href} size="md" variant="ghost" className="bg-page">
              {sale.cta.label}
            </ButtonLink>
          </div>
        </div>
      </section>

      <section id="age" aria-labelledby="age-heading" className="flex scroll-mt-24 flex-col gap-5">
        <h2
          id="age-heading"
          className="font-body text-xs font-bold tracking-[0.18em] text-text-primary uppercase"
        >
          {ageSectionTitle}
        </h2>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {content.ageBands.map((band, index) => (
            <Reveal as="li" key={band.value} delayMs={index * 60}>
              <Card interactive className="h-full">
                <a
                  href={`/age/${band.value}`}
                  className="flex h-full flex-col gap-6 p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:p-5"
                >
                  <span className="relative aspect-[4/3] overflow-hidden rounded-md bg-surface-alt">
                    <Image
                      src={homePlaceholder(index + 1)}
                      alt=""
                      fill
                      unoptimized
                      sizes="(min-width: 1024px) 25vw, 50vw"
                      className="object-cover"
                    />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="font-display text-2xl text-text-primary">{band.label}</span>
                    <span className="font-body text-sm text-text-secondary">{band.note}</span>
                  </span>
                </a>
              </Card>
            </Reveal>
          ))}
        </ul>
      </section>

      <Suspense fallback={<ProductGridSkeleton count={RAIL_SKELETON_COUNT} />}>
        <FeaturedRail title={featuredTitle} />
      </Suspense>

      <section aria-labelledby="trust-heading">
        <h2 id="trust-heading" className="sr-only">
          Why shop with us
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {trustBadges.map((badge) => (
            <li key={badge.title}>
              <Card className="h-full p-5">
                <p className="font-body text-sm font-bold tracking-wide text-primary uppercase">
                  {badge.title}
                </p>
                <p className="mt-2 font-body text-sm text-text-secondary">{badge.description}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <Suspense fallback={<ProductGridSkeleton count={RAIL_SKELETON_COUNT} />}>
        <NavCategoryRails />
      </Suspense>
    </div>
  );
}
