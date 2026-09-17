import { describe, expect, it } from 'vitest';

import { FulfilmentStatusSchema, OrderStatusSchema } from '@romp/contracts';

import {
  displayHumanId,
  formatPlacedDate,
  fulfilmentStatusLabel,
  matchesOrderFilter,
  orderLineSummary,
  orderPrimaryCta,
  orderProgressChip,
  orderStatusLabel,
  orderStatusTone,
} from './order-view';

/**
 * The customer status view helpers are exhaustive over both machines, so a new status cannot ship
 * without a customer-readable label and a tone.
 */

describe('customer order status view', () => {
  it('labels and tones every payment status', () => {
    for (const status of OrderStatusSchema.options) {
      expect(orderStatusLabel(status)).not.toBe('');
      expect(typeof orderStatusTone(status)).toBe('string');
    }
  });

  it('labels every fulfilment status in the customer’s vocabulary', () => {
    for (const status of FulfilmentStatusSchema.options) {
      expect(fulfilmentStatusLabel(status)).not.toBe('');
    }
    expect(fulfilmentStatusLabel('shipped')).toBe('On its way');
    expect(fulfilmentStatusLabel('unfulfilled')).toBe('Preparing');
  });

  it('summarises lines, chips packing vs delivered, and filters transit vs returns', () => {
    const packing = {
      orderId: 'o1',
      humanId: 'RMP-1001',
      status: 'paid',
      fulfilment: { status: 'unfulfilled' },
      items: [{ name: 'Mega Brick Rocket Lab' }, { name: 'Extra' }],
    } as never;
    const delivered = {
      orderId: 'o2',
      humanId: 'RMP-1002',
      status: 'paid',
      fulfilment: { status: 'delivered' },
      items: [{ name: 'Doodle Dome', productId: 'doodle' }],
    } as never;
    const refunded = {
      orderId: 'o3',
      humanId: 'RMP-1003',
      status: 'refunded',
      fulfilment: { status: 'delivered' },
      items: [{ name: 'Otto' }],
    } as never;

    expect(orderLineSummary(packing)).toBe('Mega Brick Rocket Lab + 1 more');
    expect(orderProgressChip(packing)).toEqual({ label: 'Packing', tone: 'packing' });
    expect(orderProgressChip(delivered)).toEqual({ label: 'Delivered', tone: 'delivered' });
    expect(orderProgressChip(refunded)).toEqual({ label: 'Returned', tone: 'returned' });
    expect(matchesOrderFilter(packing, 'transit')).toBe(true);
    expect(matchesOrderFilter(refunded, 'returns')).toBe(true);
    expect(matchesOrderFilter(delivered, 'transit')).toBe(false);
    expect(orderPrimaryCta(delivered)).toEqual({ label: 'Buy again', href: '/p/doodle' });
    expect(displayHumanId('RMP-1001')).toBe('#RMP-1001');
  });

  it('formats placed dates from ISO strings the API sends', () => {
    expect(formatPlacedDate('2026-09-09T10:42:00.000Z' as unknown as Date, 'en-IN')).toMatch(/9/u);
  });
});
