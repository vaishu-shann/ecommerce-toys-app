import type { ProductDoc, PublicReviewView, VariantOption } from '@romp/contracts';
import type { WithId } from '@romp/data';
import { renderTemplate } from '@romp/store-config';
import { Badge } from '@romp/ui';

import { Breadcrumbs } from '@/components/Breadcrumbs';
import type { GalleryImage } from '@/components/ProductGallery';
import { ProductGallery } from '@/components/ProductGallery';
import { ReviewForm } from '@/components/ReviewForm';
import { ReviewList, reviewsHeading } from '@/components/ReviewList';
import { StarRating } from '@/components/StarRating';
import { VariantSelector } from '@/components/VariantSelector';
import { WishlistHeart } from '@/components/WishlistHeart';
import { content, features, mediaUrl, moneyFormat } from '@/lib/store';

/**
 * The product detail page body.
 *
 * A server component that composes the gallery, the buy box and the product information
 * from data — a `ProductDoc` and its resolved `VariantOption`s. The only client islands
 * inside it are the gallery (image switching) and the variant selector (selection state);
 * everything else is static server-rendered markup, which keeps the JavaScript on this
 * high-traffic, SEO-critical page to the two things that genuinely need it.
 *
 * Every word that is not product data comes from `content.product` in store config, so a
 * second store's detail page reads in its own voice with no code change. Every price is
 * formatted for the store's locale. The safety block renders only the claims the product
 * actually makes — a product with no BIS mark and no small parts shows no safety section
 * at all rather than a row of reassuring absences.
 */
export interface ProductDetailProps {
  readonly product: WithId<ProductDoc>;
  readonly variants: readonly VariantOption[];
  /** The product's category name, for the breadcrumb trail. */
  readonly categoryName: string;
  /** The product's published reviews, newest first. */
  readonly reviews: readonly PublicReviewView[];
}

/** Resolves a product's media to gallery images, dropping any with no reachable URL. */
function toGalleryImages(product: ProductDoc): readonly GalleryImage[] {
  return [...product.media]
    .sort((left, right) => left.order - right.order)
    .flatMap((item) => {
      const url = mediaUrl(item.path);
      if (url === null) return [];
      return [
        {
          url,
          alt: item.alt,
          width: item.width,
          height: item.height,
          blurhash: item.blurhash,
        },
      ];
    });
}

function trustTitle(pattern: RegExp): string | undefined {
  return content.home.trustBadges.find((badge) => pattern.test(badge.title))?.title;
}

export function ProductDetail({ product, variants, categoryName, reviews }: ProductDetailProps) {
  const copy = content.product;
  const images = toGalleryImages(product);
  const ageLabel =
    content.ageBands.find((band) => band.value === product.ageBand)?.label ??
    product.ageBand.replace('-', '–');
  const eyebrowParts = [product.brand, product.boxItems[0]].filter(
    (part): part is string => part !== undefined && part !== '',
  );

  const showSafety =
    product.safety.bisCertified || product.safety.bpaFree || product.safety.hasSmallParts;

  const showRating = product.ratingCount > 0 && product.ratingAvg > 0;

  return (
    <article className="flex flex-col gap-10">
      <Breadcrumbs
        label={copy.breadcrumbHome}
        items={[
          { label: copy.breadcrumbHome, href: '/' },
          { label: categoryName, href: `/c/${product.categorySlug}` },
          { label: product.name },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
        <ProductGallery images={images} productName={product.name} badge={product.badge} />

        <div className="flex flex-col gap-5">
          {eyebrowParts.length > 0 ? (
            <p className="font-body text-[11px] font-bold tracking-[0.16em] text-text-muted uppercase">
              {eyebrowParts.join(' · ')}
            </p>
          ) : null}

          <h1 className="font-display text-4xl leading-[0.95] tracking-tight text-text-primary uppercase sm:text-5xl">
            {product.name}
          </h1>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-sm text-text-secondary">
            {showRating ? (
              <>
                <StarRating
                  rating={product.ratingAvg}
                  label={`${product.ratingAvg.toFixed(1)} out of 5 stars`}
                  tone="primary"
                />
                <span className="font-bold text-text-primary">{product.ratingAvg.toFixed(1)}</span>
                <span>
                  {renderTemplate(copy.ratingCountLabel, { count: String(product.ratingCount) })}
                </span>
              </>
            ) : null}
            <span className="text-text-muted">· {ageLabel}</span>
          </div>

          <p className="font-body text-base leading-relaxed text-text-secondary">
            {product.description}
          </p>

          <VariantSelector
            productId={product.id}
            variants={variants}
            labels={{
              selectVariant: copy.selectVariant,
              addToCart: copy.addToCart,
              outOfStock: copy.outOfStock,
            }}
            moneyFormat={moneyFormat}
            saveAction={features.wishlist ? <WishlistHeart productId={product.id} layout="chip" /> : null}
            deliveryLabel={trustTitle(/ship|deliver/iu)}
            returnsLabel={trustTitle(/return/iu)}
          />
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {product.boxItems.length > 0 && (
          <section aria-labelledby="pdp-box">
            <h2 id="pdp-box" className="font-display text-lg text-text-primary">
              {copy.inTheBoxTitle}
            </h2>
            <ul className="mt-2 flex flex-col gap-1 font-body text-text-secondary">
              {product.boxItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {product.skills.length > 0 && (
          <section aria-labelledby="pdp-skills">
            <h2 id="pdp-skills" className="font-display text-lg text-text-primary">
              {copy.skillsTitle}
            </h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {product.skills.map((skill) => (
                <li key={skill}>
                  <Badge tone="neutral">{skill}</Badge>
                </li>
              ))}
            </ul>
          </section>
        )}

        {showSafety && (
          <section aria-labelledby="pdp-safety">
            <h2 id="pdp-safety" className="font-display text-lg text-text-primary">
              {copy.safetyTitle}
            </h2>
            <ul className="mt-2 flex flex-col gap-1 font-body text-text-secondary">
              {product.safety.bisCertified && (
                <li>
                  {copy.bisCertifiedLabel}
                  {product.safety.bisCertNo !== null ? ` · ${product.safety.bisCertNo}` : ''}
                </li>
              )}
              {product.safety.bpaFree && <li>{copy.bpaFreeLabel}</li>}
              {product.safety.hasSmallParts && (
                <li className="text-warning">{copy.smallPartsWarning}</li>
              )}
            </ul>
          </section>
        )}
      </div>

      <section aria-labelledby="pdp-reviews" className="flex flex-col gap-6">
        <h2 id="pdp-reviews" className="font-display text-xl text-text-primary">
          {reviewsHeading(reviews.length)}
        </h2>
        <ReviewList reviews={reviews} />
        <div className="max-w-xl">
          <h3 className="mb-3 font-display text-lg text-text-primary">{copy.reviews.writeCta}</h3>
          <ReviewForm productId={product.id} />
        </div>
      </section>
    </article>
  );
}
