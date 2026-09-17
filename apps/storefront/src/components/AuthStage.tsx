import type { ReactNode } from 'react';

import { brand } from '@/lib/store';

import { Wordmark } from './Wordmark';

/**
 * Full-viewport stage for sign-in and registration.
 *
 * No shop chrome — the forms sit on a quiet, slowly drifting field of light so they read
 * as a destination rather than a card dropped into the catalogue. Motion is CSS-only and
 * collapses under `prefers-reduced-motion`.
 */
export function AuthStage({ children }: { readonly children: ReactNode }) {
  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-page">
      <div className="auth-stage-bg" aria-hidden="true">
        <span className="auth-orb auth-orb-a" />
        <span className="auth-orb auth-orb-b" />
        <span className="auth-orb auth-orb-c" />
        <span className="auth-hatch" />
      </div>

      <main
        id="main-content"
        tabIndex={-1}
        className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-4 py-12 sm:px-6"
      >
        <div className="w-full max-w-[28.75rem]">
          <div className="mb-7 flex flex-col items-center gap-2.5 text-center">
            <Wordmark />
            <p className="font-body text-[11px] font-bold tracking-[0.22em] text-text-muted uppercase">
              {brand.tagline}
            </p>
          </div>

          <div className="auth-card">{children}</div>
        </div>
      </main>
    </div>
  );
}
