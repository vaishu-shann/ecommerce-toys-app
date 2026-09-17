/**
 * Account area navigation.
 *
 * The mock sidebar lists these destinations. Real routes stay on real data; coins,
 * referrals, kids profiles and saved cards have no APIs yet, so those pages are
 * honest placeholders rather than invented balances or codes.
 */

export interface AccountNavItem {
  readonly href: string;
  readonly label: string;
  readonly match: 'exact' | 'prefix';
  readonly feature?: 'wishlist';
}

export const ACCOUNT_NAV: readonly AccountNavItem[] = [
  { href: '/account/orders', label: 'Orders', match: 'prefix' },
  { href: '/account/addresses', label: 'Addresses', match: 'prefix' },
  { href: '/account/payments', label: 'Payment methods', match: 'exact' },
  { href: '/account/wishlist', label: 'Wishlist', match: 'prefix', feature: 'wishlist' },
  { href: '/account/coins', label: 'ROMP coins', match: 'exact' },
  { href: '/account/refer', label: 'Refer & earn', match: 'exact' },
  { href: '/account/kids', label: 'Kids profiles', match: 'exact' },
  { href: '/account/reviews', label: 'Reviews', match: 'prefix' },
  { href: '/account/notifications', label: 'Notifications', match: 'prefix' },
];

/** Profile lives on the avatar, not in the stacked list. */
export const ACCOUNT_PROFILE_HREF = '/account/profile';

export function visibleAccountNav(wishlistOn: boolean): readonly AccountNavItem[] {
  return ACCOUNT_NAV.filter((item) => item.feature !== 'wishlist' || wishlistOn);
}

export function isAccountNavActive(pathname: string, item: AccountNavItem): boolean {
  if (item.match === 'exact') return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function isProfileActive(pathname: string): boolean {
  return pathname === ACCOUNT_PROFILE_HREF;
}

export function accountInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/u).filter((part) => part.length > 0);
  if (parts.length === 0) return 'YO';
  const first = parts[0] ?? '';
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const second = parts[1] ?? '';
  return `${first.slice(0, 1)}${second.slice(0, 1)}`.toUpperCase();
}

/** Single letter for a WhatsApp-style avatar. */
export function accountAvatarLetter(displayName: string): string {
  const trimmed = displayName.trim();
  if (trimmed.length === 0) return '?';
  return trimmed.slice(0, 1).toUpperCase();
}
