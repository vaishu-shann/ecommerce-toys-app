import type { ReactNode } from 'react';

import { AccountShell } from '@/components/account/AccountShell';

/**
 * Account chrome for every signed-in account page.
 *
 * Sign-in and register skip the sidebar inside AccountShell so the dedicated
 * auth stage stays full-screen. Data fetching stays in each page.
 */
export default function AccountLayout({ children }: { readonly children: ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}
