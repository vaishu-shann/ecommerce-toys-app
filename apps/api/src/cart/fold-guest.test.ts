import type { FastifyReply, FastifyRequest } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as DataModule from '@romp/data';

/**
 * Folding a leftover guest cookie into the uid cart. The merge itself is `@romp/data`'s job; here
 * the concern is the route helper: no cookie (or a forged one) is a no-op, and a valid cookie
 * calls merge then expires the cookie.
 */

const mergeAnonymousCart = vi.hoisted(() => vi.fn());

vi.mock('@romp/data', async (importOriginal) => {
  const actual = await importOriginal<typeof DataModule>();
  return { ...actual, mergeAnonymousCart };
});

const { CART_COOKIE_NAME, signCartId } = await import('./cookie');
const { foldGuestCartIfPresent } = await import('./fold-guest');

const SECRET = 'a-test-secret';
const context = {} as never;

const requestWith = (cookie: string | undefined): FastifyRequest =>
  ({ headers: { cookie } }) as FastifyRequest;

const replySpy = (): FastifyReply =>
  ({ header: vi.fn() }) as unknown as FastifyReply;

beforeEach(() => {
  mergeAnonymousCart.mockReset();
  mergeAnonymousCart.mockResolvedValue({ items: [] });
});

describe('foldGuestCartIfPresent', () => {
  it('is a no-op when there is no cart cookie', async () => {
    const reply = replySpy();
    await foldGuestCartIfPresent(requestWith(undefined), reply, context, 'uid-1', SECRET, 20);
    expect(mergeAnonymousCart).not.toHaveBeenCalled();
    expect(reply.header).not.toHaveBeenCalled();
  });

  it('is a no-op when the cookie is unsigned', async () => {
    const reply = replySpy();
    await foldGuestCartIfPresent(
      requestWith(`${CART_COOKIE_NAME}=not-signed`),
      reply,
      context,
      'uid-1',
      SECRET,
      20,
    );
    expect(mergeAnonymousCart).not.toHaveBeenCalled();
    expect(reply.header).not.toHaveBeenCalled();
  });

  it('merges the guest cart and expires the cookie', async () => {
    const cartId = 'guest-cart-1';
    const reply = replySpy();
    await foldGuestCartIfPresent(
      requestWith(`${CART_COOKIE_NAME}=${signCartId(cartId, SECRET)}`),
      reply,
      context,
      'uid-1',
      SECRET,
      20,
    );
    expect(mergeAnonymousCart).toHaveBeenCalledWith(context, 'uid-1', cartId, 20);
    expect(reply.header).toHaveBeenCalledWith(
      'set-cookie',
      expect.stringContaining(`${CART_COOKIE_NAME}=`),
    );
    expect(reply.header).toHaveBeenCalledWith('set-cookie', expect.stringContaining('Max-Age=0'));
  });
});
