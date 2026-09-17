import { describe, expect, it } from 'vitest';

import {
  ACCOUNT_NAV,
  accountAvatarLetter,
  accountInitials,
  isAccountNavActive,
  isProfileActive,
  visibleAccountNav,
} from './account-nav';

describe('account nav', () => {
  it('hides wishlist when the feature is off', () => {
    expect(visibleAccountNav(true).some((item) => item.feature === 'wishlist')).toBe(true);
    expect(visibleAccountNav(false).some((item) => item.feature === 'wishlist')).toBe(false);
  });

  it('matches order detail under the orders item', () => {
    const orders = ACCOUNT_NAV[0];
    expect(orders).toBeDefined();
    expect(isAccountNavActive('/account/orders', orders!)).toBe(true);
    expect(isAccountNavActive('/account/orders/abc', orders!)).toBe(true);
    expect(isAccountNavActive('/account/addresses', orders!)).toBe(false);
  });

  it('treats only the profile route as the avatar current page', () => {
    expect(isProfileActive('/account/profile')).toBe(true);
    expect(isProfileActive('/account')).toBe(false);
    expect(isProfileActive('/account/orders')).toBe(false);
  });

  it('builds initials from the display name', () => {
    expect(accountInitials('Aditi Rao')).toBe('AR');
    expect(accountInitials('Vaishu')).toBe('VA');
    expect(accountInitials('  ')).toBe('YO');
  });

  it('uses the first letter for a round avatar', () => {
    expect(accountAvatarLetter('Aditi Rao')).toBe('A');
    expect(accountAvatarLetter('vaishu')).toBe('V');
    expect(accountAvatarLetter('  ')).toBe('?');
  });
});
