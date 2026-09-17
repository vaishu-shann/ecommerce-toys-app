import type { CheckoutQuoteResponse } from '@romp/contracts';
import { CheckoutQuoteRequestSchema } from '@romp/contracts';
import { EmptyCartError, getCheckoutSettings, quoteCart } from '@romp/data';
import { InternalError, InvalidStateTransitionError, parseOrThrow } from '@romp/observability';
import storeConfig from '@romp/store-config/generated/store-config.json';

import type { RompApp } from '../app';
import { foldGuestCartIfPresent } from '../cart/fold-guest';
import { requireAuthHook } from '../plugins/auth';
import { requireUser } from '../request-context';

/**
 * The checkout-quote route.
 *
 * A quote is the authoritative price of the caller's own cart at this instant: the server folds any
 * leftover guest-cookie cart into the uid cart, reads that cart, refreshes every line's price from
 * the live variant, and recomputes the totals with the same `@romp/core` arithmetic placement uses
 * — so what the customer is quoted here and what they are charged at placement cannot drift, and
 * nothing the client holds about money is trusted. It reserves no stock beyond the merge write; it
 * is a preview the checkout page renders before the customer commits.
 */
export function registerCheckoutRoutes(app: RompApp): void {
  const { context } = app.deps;
  const secret = app.deps.config.cartCookieSecret;
  const maxQtyPerLine = storeConfig.commerce.maxQtyPerLine;

  app.post('/v1/checkout/quote', { preHandler: requireAuthHook }, async (request, reply) => {
    const uid = requireUser(request);
    const body = parseOrThrow(CheckoutQuoteRequestSchema, request.body);

    // Items added before sign-in live on the guest cookie cart. Fold them into the uid cart
    // before quoting, or a signed-in checkout of a full bag would 409 "Your cart is empty."
    await foldGuestCartIfPresent(request, reply, context, uid, secret, maxQtyPerLine);

    // The checkout settings are the live, runtime-editable fees. Their absence means the store was
    // never seeded — a quote cannot be priced, and silently substituting stale config values would
    // quote fees that are no longer charged, so this refuses rather than guesses.
    const settings = await getCheckoutSettings(context);
    if (settings === null) {
      throw new InternalError('Checkout is not configured for this store.');
    }

    let quote;
    try {
      quote = await quoteCart(context, uid, body.deliverySpeed, settings);
    } catch (error) {
      if (error instanceof EmptyCartError) {
        throw new InvalidStateTransitionError({ detail: 'Your cart is empty.' });
      }
      throw error;
    }

    const response: CheckoutQuoteResponse = {
      lines: quote.lines.map((line) => ({
        productId: line.productId as CheckoutQuoteResponse['lines'][number]['productId'],
        variantId: line.variantId as CheckoutQuoteResponse['lines'][number]['variantId'],
        name: line.name,
        variantName: line.variantName,
        unitPriceMinor: line.unitPriceMinor,
        qty: line.qty,
        lineTotalMinor: line.lineTotalMinor,
      })),
      giftWrap: quote.giftWrap,
      subtotalMinor: quote.totals.subtotalMinor,
      giftWrapMinor: quote.totals.giftWrapMinor,
      shippingMinor: quote.totals.shippingMinor,
      taxMinor: quote.totals.taxMinor,
      totalMinor: quote.totals.totalMinor,
    };

    return reply.send(response);
  });
}
