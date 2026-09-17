'use client';

import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';

import { Badge, Button, Field } from '@romp/ui';

import { AccountApiError, accountApi } from '@/lib/account-api';
import { useAuth } from '@/lib/auth-context';
import { firestoreClient } from '@/lib/firebase-client';

import { AccountEmpty, AccountHeading } from './AccountHeading';
import { SignedOut } from './SignedOut';

/**
 * The customer's address book.
 *
 * Reads their addresses directly from Firestore under the rules (the client-read seam), and writes —
 * add, promote-to-default, delete — through the API, which holds the "exactly one default, never
 * zero" invariant. The default cannot be deleted while another exists; the server refuses it and the
 * message shows. After any write the list is re-read so the server-decided default is reflected.
 */

interface Row {
  readonly id: string;
  readonly label: string;
  readonly recipientName: string;
  readonly line1: string;
  readonly city: string;
  readonly pincode: string;
  readonly isDefault: boolean;
}

const EMPTY_FORM = {
  label: '',
  recipientName: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  phone: '',
};

export function AddressBook() {
  const { uid, ready } = useAuth();
  const [rows, setRows] = useState<readonly Row[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const db = firestoreClient();
    if (uid === null || db === null) {
      setRows([]);
      return;
    }
    const snap = await getDocs(
      query(
        collection(db, 'users', uid, 'addresses'),
        orderBy('isDefault', 'desc'),
        orderBy('createdAt', 'desc'),
      ),
    );
    setRows(
      snap.docs.map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        const str = (v: unknown): string => (typeof v === 'string' ? v : '');
        return {
          id: doc.id,
          label: str(data.label),
          recipientName: str(data.recipientName),
          line1: str(data.line1),
          city: str(data.city),
          pincode: str(data.pincode),
          isDefault: data.isDefault === true,
        };
      }),
    );
  }, [uid]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!ready) return <p className="font-body text-text-muted">Loading…</p>;
  if (uid === null)
    return <SignedOut next="/account/addresses" message="Sign in to manage your addresses." />;

  const set = (key: keyof typeof EMPTY_FORM) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const run = (action: () => Promise<unknown>): void => {
    setPending(true);
    setError(null);
    void action()
      .then(() => load())
      .catch((cause: unknown) => {
        setError(cause instanceof AccountApiError ? cause.message : 'That could not be done.');
      })
      .finally(() => {
        setPending(false);
      });
  };

  const add = (event: React.SyntheticEvent): void => {
    event.preventDefault();
    run(() =>
      accountApi
        .createAddress({
          label: form.label,
          recipientName: form.recipientName,
          line1: form.line1,
          line2: form.line2 === '' ? null : form.line2,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          phone: form.phone,
          isDefault: rows.length === 0,
        })
        .then(() => {
          setForm(EMPTY_FORM);
        }),
    );
  };

  return (
    <section className="flex flex-col gap-4" aria-labelledby="addresses-heading">
      <AccountHeading id="addresses-heading">Addresses</AccountHeading>

      {rows.length === 0 ? (
        <AccountEmpty
          title="No saved addresses yet."
          body="Add one below — checkout uses these, and exactly one stays the default."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.id}>
              <article className="account-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-body text-[13.5px] font-bold text-text-primary">{row.label}</p>
                    {row.isDefault ? (
                      <Badge tone="primary" className="uppercase tracking-[0.08em]">
                        Default
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1.5 font-body text-[12.5px] leading-relaxed text-text-muted">
                    {row.recipientName}
                    <br />
                    {row.line1}, {row.city} {row.pincode}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!row.isDefault ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => {
                        run(() => accountApi.updateAddress(row.id, { isDefault: true }));
                      }}
                    >
                      Make default
                    </Button>
                  ) : (
                    <span className="font-body text-[11px] font-bold tracking-[0.08em] text-primary uppercase">
                      Deliver here
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      run(() => accountApi.deleteAddress(row.id));
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={add}
        className="account-add-panel flex flex-col gap-3 p-5 sm:p-6"
        aria-labelledby="add-address"
      >
        <h2 id="add-address" className="font-body text-[12.5px] font-bold text-primary">
          + Add a new address
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Label"
            value={form.label}
            onChange={set('label')}
            required
            inputClassName="account-input"
          />
          <Field
            label="Recipient name"
            value={form.recipientName}
            onChange={set('recipientName')}
            required
            inputClassName="account-input"
          />
        </div>
        <Field
          label="Address line 1"
          value={form.line1}
          onChange={set('line1')}
          required
          inputClassName="account-input"
        />
        <Field
          label="Address line 2"
          value={form.line2}
          onChange={set('line2')}
          inputClassName="account-input"
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field
            label="City"
            value={form.city}
            onChange={set('city')}
            required
            inputClassName="account-input"
          />
          <Field
            label="State"
            value={form.state}
            onChange={set('state')}
            required
            inputClassName="account-input"
          />
          <Field
            label="PIN code"
            value={form.pincode}
            onChange={set('pincode')}
            required
            inputClassName="account-input"
          />
        </div>
        <Field
          label="Contact number"
          value={form.phone}
          onChange={set('phone')}
          required
          inputClassName="account-input"
        />
        {error !== null ? (
          <p role="alert" className="font-body text-sm text-danger">
            {error}
          </p>
        ) : null}
        <div>
          <Button type="submit" loading={pending} disabled={pending}>
            Save address
          </Button>
        </div>
      </form>
    </section>
  );
}
