'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { assessPassword } from '@romp/core';
import { Button, Field } from '@romp/ui';

import { AccountApiError, accountApi } from '@/lib/account-api';
import { signInWithLoginEmail } from '@/lib/firebase-client';
import { brand } from '@/lib/store';

/**
 * The customer registration form.
 *
 * Creates the account through the API (the one write that reserves the identifier and creates the
 * profile atomically), then signs in immediately with the same credentials. The password strength
 * is assessed client-side with the same `@romp/core` policy the server enforces, so the customer
 * sees the suggestions before submitting rather than after a rejection. A taken identifier gets the
 * server's own message.
 */
export function RegisterForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assessment =
    password === '' ? null : assessPassword(password, { brandNames: [brand.name] });
  const weak = assessment !== null && !assessment.ok;

  const submit = (event: React.SyntheticEvent): void => {
    event.preventDefault();
    if (weak) return;
    setPending(true);
    setError(null);
    void accountApi
      .register({ identifier, password, displayName })
      .then((created) => signInWithLoginEmail(created.loginEmail, password))
      .then(() => {
        router.push('/account');
        router.refresh();
      })
      .catch((cause: unknown) => {
        setError(registerFailureMessage(cause));
      })
      .finally(() => {
        setPending(false);
      });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" aria-labelledby="register-heading">
      <header className="flex flex-col gap-2">
        <p className="font-body text-[11px] font-extrabold tracking-[0.18em] text-primary uppercase">
          Join the play
        </p>
        <h1
          id="register-heading"
          className="font-display text-4xl leading-none tracking-tight text-text-primary uppercase"
        >
          Create an account
        </h1>
      </header>

      <Field
        label="Your name"
        type="text"
        autoComplete="name"
        value={displayName}
        onChange={(event) => {
          setDisplayName(event.target.value);
        }}
        required
        inputClassName="auth-input"
      />
      <Field
        label="Email or mobile number"
        type="text"
        autoComplete="username"
        value={identifier}
        onChange={(event) => {
          setIdentifier(event.target.value);
        }}
        required
        inputClassName="auth-input"
      />
      <Field
        label="Password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
        }}
        required
        inputClassName="auth-input"
        {...(weak && assessment.suggestions.length > 0 ? { error: assessment.suggestions[0] } : {})}
      />

      {error !== null ? (
        <p role="alert" className="-mt-1 font-body text-sm text-danger">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        loading={pending}
        disabled={pending || weak}
        fullWidth
        size="lg"
        className="auth-submit"
      >
        Create account
      </Button>

      <p className="text-center font-body text-sm text-text-muted">
        Already have an account?{' '}
        <Link
          href="/account/sign-in"
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}

/**
 * Turns a register/sign-in failure into copy the customer can act on.
 *
 * `instanceof AccountApiError` is unreliable across Next hot reloads (the class identity
 * changes), so the API error is recognised by shape. A Firebase Auth failure after a 201
 * means the account exists — send them to sign in rather than a dead generic line.
 */
function registerFailureMessage(cause: unknown): string {
  if (isAccountApiFailure(cause)) return cause.message;

  const code = firebaseAuthCode(cause);
  if (code === 'auth/email-already-in-use' || code === 'auth/email-already-exists') {
    return 'That email or mobile number is already registered.';
  }
  if (
    code === 'auth/network-request-failed' ||
    code === 'auth/invalid-api-key' ||
    code === 'auth/configuration-not-found'
  ) {
    return 'Could not reach sign-in. Check the local emulators are running, then try Sign in.';
  }
  if (code !== null && code.startsWith('auth/')) {
    return 'Your account was created but sign-in did not finish. Open Sign in and use the same email and password.';
  }

  return 'We could not create your account.';
}

function isAccountApiFailure(cause: unknown): cause is { readonly message: string } {
  if (typeof cause !== 'object' || cause === null) return false;
  const record = cause as { name?: unknown; status?: unknown; code?: unknown; message?: unknown };
  if (typeof record.message !== 'string' || record.message === '') return false;
  return (
    cause instanceof AccountApiError ||
    record.name === 'AccountApiError' ||
    (typeof record.status === 'number' && typeof record.code === 'string')
  );
}

function firebaseAuthCode(cause: unknown): string | null {
  if (typeof cause !== 'object' || cause === null) return null;
  const code = (cause as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}
