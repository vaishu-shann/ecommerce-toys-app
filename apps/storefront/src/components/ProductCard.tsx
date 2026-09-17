import Image from 'next/image';
import Link from 'next/link';

import type { ProductSummary } from '@romp/contracts';
import { Badge, Card } from '@romp/ui';

import { formatMoney, mediaUrl, moneyFormat } from '@/lib/store';

/**
 * A product card for a listing grid or a home-page rail.
 *
 * The whole card is one link, so the tap target is the card and not just the name — on a
 * phone, a link that is only the title text is a card most of whose surface does nothing.
 *
 * Everything customer-facing here is data: the name, the price, the discount, the
 * availability, the alt text. There is no literal copy, which is what keeps the card
 * store-agnostic.
 */
export interface ProductCardProps {
  readonly product: ProductSummary;
  /**
   * True for the cards above the fold on first paint.
   *
   * Sets `priority` on the image, so the LCP image is preloaded rather than lazy-loaded.
   * Wrong in both directions is a real cost: priority on every card floods the network
   * and defeats itself, and priority on none delays the largest paint. So the caller — the
   * grid, which knows the row — decides, and the default is the safe one (lazy).
   */
  readonly priority?: boolean;
  /**
   * The `sizes` attribute, describing how wide the image renders at each breakpoint so
   * the browser fetches the right resolution. Defaults to the listing grid's columns; a
   * rail passes its own.
   */
  readonly sizes?: string;
  /**
   * Shown when the product has no cover. Home rails pass rotating shop art so empty
   * cards are not a letter on a blank square.
   */
  readonly placeholderSrc?: string;
}

/** The listing grid: 1 column on a phone, 2 on a tablet, 4 on a desktop. */
const GRID_SIZES = '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw';

function formatMeta(product: ProductSummary): string {
  const age = product.ageBand.replace('-', '–');
  const kind = product.categorySlug.replaceAll('-', ' ');
  return `${age} · ${kind}`;
}

export function ProductCard({
  product,
  priority = false,
  sizes = GRID_SIZES,
  placeholderSrc,
}: ProductCardProps) {
  const cover = mediaUrl(product.cover?.path ?? null);
  const image = cover ?? placeholderSrc ?? null;
  const usingPlaceholder = cover === null && placeholderSrc !== undefined;
  const price = formatMoney(product.priceFromMinor, moneyFormat);
  const hasDiscount = product.mrpFromMinor > product.priceFromMinor;
  const showRating = product.ratingCount > 0 && product.ratingAvg > 0;

  return (
    <Card interactive className="h-full overflow-hidden">
      <Link
        href={`/p/${product.slug}`}
        className="flex h-full flex-col focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      >
        <div className="relative aspect-square w-full overflow-hidden bg-surface-alt">
          {image === null ? (
            <span
              aria-hidden="true"
              className="flex h-full w-full items-center justify-center font-display text-3xl text-text-muted/50"
            >
              {product.name.slice(0, 1)}
            </span>
          ) : (
            <Image
              src={image}
              alt={usingPlaceholder ? '' : (product.cover?.alt ?? product.name)}
              fill
              sizes={sizes}
              priority={priority}
              unoptimized={usingPlaceholder}
              className="object-cover"
              {...(!usingPlaceholder && product.cover?.blurhash != null
                ? { placeholder: 'blur' as const, blurDataURL: product.cover.blurhash }
                : {})}
            />
          )}

          {product.badge !== null && (
            <span className="absolute top-3 left-3">
              <Badge tone="primary">{product.badge}</Badge>
            </span>
          )}

          <span
            aria-hidden="true"
            className="absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-pill bg-surface/80 text-text-secondary"
          >
            <svg viewBox="0 0 20 20" className="size-4" fill="none">
              <path
                d="M10 16S3.5 12 3.5 7.8A3.3 3.3 0 0110 6a3.3 3.3 0 016.5 1.8C16.5 12 10 16 10 16z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
            </svg>
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-1 p-4">
          <p className="font-body text-[11px] font-bold tracking-[0.14em] text-text-muted uppercase">
            {formatMeta(product)}
          </p>
          <h3 className="font-display text-base leading-snug text-text-primary">{product.name}</h3>

          <div className="mt-auto flex items-baseline gap-2 pt-3">
            <span className="font-body text-lg font-bold text-text-primary">{price}</span>
            {hasDiscount && (
              <span className="font-body text-sm text-text-muted line-through">
                {formatMoney(product.mrpFromMinor, moneyFormat)}
              </span>
            )}
            {showRating ? (
              <span className="ml-auto font-body text-sm font-bold text-primary">
                ★ {product.ratingAvg.toFixed(1)}
              </span>
            ) : null}
          </div>

          {!product.inStock && <p className="font-body text-sm text-text-muted">Out of stock</p>}
        </div>
      </Link>
    </Card>
  );
}
