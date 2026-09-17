import Link from 'next/link';

/**
 * The signed-out affordance shared by every account page.
 *
 * An account page needs a signed-in customer; when there is none, this is what shows — a clear
 * prompt to sign in that returns to where they were, rather than an empty screen or a redirect loop.
 * `next` carries the path back so the sign-in form can send them onward.
 */
export function SignedOut({ next, message }: { readonly next: string; readonly message?: string }) {
  return (
    <div className="account-panel mx-auto max-w-md px-8 py-10 text-center">
      <p className="font-body text-text-primary">{message ?? 'Sign in to see your account.'}</p>
      <p className="mt-5">
        <Link
          href={`/account/sign-in?next=${encodeURIComponent(next)}`}
          className="account-btn-lime inline-flex"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
