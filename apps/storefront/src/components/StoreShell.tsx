'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Chooses whether the store chrome (promo banner, header, footer) wraps the page.
 *
 * Sign-in and register are a dedicated stage — no nav, no bag, no banner — so they
 * receive `children` unwrapped. Every other route keeps the shop shell. Header and
 * footer are passed in from the server layout so this client boundary does not import
 * server components.
 */
export function StoreShell({
  header,
  footer,
  children,
}: {
  readonly header: ReactNode;
  readonly footer: ReactNode;
  readonly children: ReactNode;
}) {
  const pathname = usePathname();
  const isAuthStage = pathname === '/account/sign-in' || pathname === '/account/register';

  if (isAuthStage) {
    return children;
  }

  return (
    <>
      {header}
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-[90%] py-6 sm:py-8 lg:py-10"
      >
        {children}
      </main>
      {footer}
    </>
  );
}
