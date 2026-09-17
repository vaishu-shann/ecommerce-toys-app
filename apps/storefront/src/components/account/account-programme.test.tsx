import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted((): { current: { uid: string | null; ready: boolean } } => ({
  current: { uid: 'cust-1', ready: true },
}));

vi.mock('@/lib/auth-context', () => ({ useAuth: () => auth.current }));

const { PaymentsView } = await import('./PaymentsView');
const { CoinsView } = await import('./CoinsView');
const { ReferView } = await import('./ReferView');

beforeEach(() => {
  auth.current = { uid: 'cust-1', ready: true };
});

describe('PaymentsView', () => {
  it('renders the mock instrument list without inventing saved cards', () => {
    render(<PaymentsView />);
    expect(screen.getByRole('heading', { name: /payment methods/iu })).toBeInTheDocument();
    expect(screen.getByText(/no cards or upi ids are saved/iu)).toBeInTheDocument();
    expect(screen.getByText('+ Add a card or UPI ID')).toBeInTheDocument();
  });

  it('asks the visitor to sign in when signed out', () => {
    auth.current = { uid: null, ready: true };
    render(<PaymentsView />);
    expect(screen.getByText(/sign in to see how you pay/iu)).toBeInTheDocument();
  });
});

describe('CoinsView', () => {
  it('shows a zero balance rather than a invented ledger', () => {
    render(<CoinsView />);
    expect(screen.getByRole('heading', { name: /romp coins/iu })).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText(/not issued/iu)).toBeInTheDocument();
  });
});

describe('ReferView', () => {
  it('renders the mock chrome with empty stats and no invented code', () => {
    render(<ReferView />);
    expect(screen.getByRole('heading', { name: /refer & earn/iu })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /give ₹200/iu })).toBeInTheDocument();
    expect(screen.getByText('Your code soon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy code/iu })).toBeDisabled();
    expect(screen.getByText('Invites sent')).toBeInTheDocument();
    expect(screen.getAllByText('0')).toHaveLength(4);
    expect(screen.getByText(/no invites yet/iu)).toBeInTheDocument();
  });
});
