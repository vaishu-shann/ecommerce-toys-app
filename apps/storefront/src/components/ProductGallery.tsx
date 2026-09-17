'use client';

import { useMemo, useRef, useState } from 'react';

import { Badge, cn } from '@romp/ui';

import { HOME_PLACEHOLDERS, homePlaceholder, isHomePlaceholder } from '@/lib/home-placeholders';

function slideFit(url: string): string {
  return isHomePlaceholder(url) ? 'object-contain' : 'object-cover';
}

/**
 * The product image gallery.
 *
 * A client island because selecting a thumbnail scrolls the main frame, which is state.
 * The server resolves every media path to a URL and passes the list in, so this
 * component holds no knowledge of Storage — only which slide is current.
 *
 * When a product has no photography yet, the four side squares and the main frame fill
 * with the same shop-art placeholders the home page uses. Real covers still win and are
 * listed first. The main stage is a snap-scrolling strip, so a click on a thumb *scrolls*
 * the matching photo into view rather than popping a new image in place.
 */
export interface GalleryImage {
  readonly url: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
  readonly blurhash: string | null;
}

export interface ProductGalleryProps {
  readonly images: readonly GalleryImage[];
  /** The product name, for placeholder alt text. */
  readonly productName: string;
  /** Display-only ribbon from the product document, e.g. "Bestseller". */
  readonly badge?: string | null;
}

/** Visible thumbs before the overflow marker — matches the PDP chrome. */
const VISIBLE_THUMBS = 4;

function placeholderSlide(productName: string, index: number): GalleryImage {
  return {
    url: homePlaceholder(index),
    alt: `${productName} photo ${String(index + 1)}`,
    width: 800,
    height: 800,
    blurhash: null,
  };
}

/**
 * Real product photos first; shop-art fillers make up a full row of four thumbs so the
 * side column is never a set of empty squares.
 */
function resolveSlides(
  images: readonly GalleryImage[],
  productName: string,
): readonly GalleryImage[] {
  if (images.length >= VISIBLE_THUMBS) return images;

  const extras: GalleryImage[] = [];
  let slot = 0;
  while (extras.length + images.length < VISIBLE_THUMBS && slot < HOME_PLACEHOLDERS.length) {
    const candidate = placeholderSlide(productName, slot);
    slot += 1;
    if (images.some((image) => image.url === candidate.url)) continue;
    extras.push(candidate);
  }
  return [...images, ...extras];
}

function scrollBehavior(): ScrollBehavior {
  if (typeof window === 'undefined') return 'auto';
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

export function ProductGallery({ images, productName, badge = null }: ProductGalleryProps) {
  const slides = useMemo(() => resolveSlides(images, productName), [images, productName]);
  const [activeIndex, setActiveIndex] = useState(0);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const safeIndex = Math.min(activeIndex, Math.max(slides.length - 1, 0));
  const visible = slides.slice(0, VISIBLE_THUMBS);
  const overflow = slides.length - VISIBLE_THUMBS;

  const showSlide = (index: number) => {
    setActiveIndex(index);
    const slide = slideRefs.current[index];
    if (slide === undefined || slide === null || typeof slide.scrollIntoView !== 'function') {
      return;
    }
    slide.scrollIntoView({
      behavior: scrollBehavior(),
      inline: 'start',
      block: 'nearest',
    });
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <ul className="flex gap-2 sm:w-16 sm:flex-col">
        {visible.map((image, index) => (
          <li key={`${image.url}-${String(index)}`}>
            <button
              type="button"
              onClick={() => {
                showSlide(index);
              }}
              aria-label={image.alt}
              aria-current={index === safeIndex ? 'true' : undefined}
              className={cn(
                'relative aspect-square w-16 cursor-pointer overflow-hidden rounded-lg bg-surface-alt',
                isHomePlaceholder(image.url) && 'p-1',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
                index === safeIndex
                  ? 'ring-2 ring-primary'
                  : 'ring-1 ring-border opacity-80 hover:opacity-100',
              )}
            >
              {/* Native img so the thumb is the click target — next/image overlays can eat the hit. */}
              <img
                src={image.url}
                alt=""
                width={64}
                height={64}
                className={cn('pointer-events-none h-full w-full', slideFit(image.url))}
              />
            </button>
          </li>
        ))}
        {overflow > 0 ? (
          <li>
            <button
              type="button"
              onClick={() => {
                showSlide(VISIBLE_THUMBS);
              }}
              aria-label={`${String(overflow)} more photos`}
              className={cn(
                'flex aspect-square w-16 cursor-pointer items-center justify-center rounded-lg bg-surface-alt font-body text-sm font-bold text-text-muted',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
                safeIndex >= VISIBLE_THUMBS ? 'ring-2 ring-primary' : 'ring-1 ring-border',
              )}
            >
              +{overflow}
            </button>
          </li>
        ) : null}
      </ul>

      <div
        className={cn(
          'relative flex aspect-square min-w-0 flex-1 overflow-x-auto overflow-y-hidden rounded-lg bg-surface-alt',
          'snap-x snap-mandatory scroll-smooth motion-reduce:scroll-auto',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {badge !== null && badge !== '' ? (
          <span className="absolute top-4 left-4 z-10">
            <Badge tone="primary">{badge}</Badge>
          </span>
        ) : null}

        {slides.map((image, index) => (
          <div
            key={`${image.url}-slide-${String(index)}`}
            ref={(node) => {
              slideRefs.current[index] = node;
            }}
            className={cn(
              'relative h-full min-w-full shrink-0 snap-start snap-always',
              isHomePlaceholder(image.url) && 'p-8',
            )}
          >
            <img
              src={image.url}
              alt={index === safeIndex ? image.alt : ''}
              width={image.width}
              height={image.height}
              fetchPriority={index === 0 ? 'high' : 'low'}
              className={cn('h-full w-full', slideFit(image.url))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
