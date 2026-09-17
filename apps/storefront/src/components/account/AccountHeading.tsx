import type { ReactNode } from 'react';

/**
 * Shared account page chrome: the mock's 30px uppercase display title, plus an
 * optional actions slot (order chips, a sign-out control).
 */
export function AccountHeading({
  id,
  children,
  actions,
}: {
  readonly id: string;
  readonly children: ReactNode;
  readonly actions?: ReactNode;
}) {
  return (
    <div className="account-heading-row">
      <h1 id={id} className="account-title">
        {children}
      </h1>
      {actions}
    </div>
  );
}

export function AccountEmpty({ title, body }: { readonly title: string; readonly body: string }) {
  return (
    <div className="account-panel px-6 py-8 sm:px-7">
      <p className="font-display text-base text-text-primary">{title}</p>
      <p className="mt-2 max-w-md font-body text-sm text-text-muted">{body}</p>
    </div>
  );
}
