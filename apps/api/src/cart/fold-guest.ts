import type { FastifyReply, FastifyRequest } from 'fastify';

import { mergeAnonymousCart } from '@romp/data';
import type { StoreContext } from '@romp/data';

import { clearedCartCookieHeader, readCartCookie, verifyCartCookie } from './cookie';

/**
 * Folds a leftover guest cart into the signed-in customer's uid cart.
 *
 * Guest shopping writes `carts/{cookieId}`; a signed-in quote, placement, or cart GET reads
 * `carts/{uid}`. Those are different documents, so a customer who filled a bag as a guest and then
 * signed in would otherwise quote an empty uid cart while the bag page still showed the cookie
 * cart. This is the same fold as `POST /v1/cart/merge`, run lazily on the first authenticated cart
 * or checkout request that still carries a valid guest cookie. No cookie is a no-op.
 */
export async function foldGuestCartIfPresent(
  request: FastifyRequest,
  reply: FastifyReply,
  context: StoreContext,
  uid: string,
  secret: string,
  maxQtyPerLine: number,
): Promise<void> {
  const anonCartId = verifyCartCookie(readCartCookie(request.headers.cookie), secret);
  if (anonCartId === null) return;

  await mergeAnonymousCart(context, uid, anonCartId, maxQtyPerLine);
  // The guest cart is gone (or was empty); drop the cookie so the next request does not try again.
  reply.header('set-cookie', clearedCartCookieHeader());
}
