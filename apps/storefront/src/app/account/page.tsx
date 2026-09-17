import { redirect } from 'next/navigation';

/**
 * The account home is the orders list — matching the mock's default tab.
 * Name and password live on /account/profile (the sidebar avatar).
 */
export const metadata = { title: 'Your account' };

export default function AccountPage() {
  redirect('/account/orders');
}
