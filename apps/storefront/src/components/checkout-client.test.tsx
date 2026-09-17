import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CheckoutQuoteResponse, PlaceOrderResponse } from '@romp/contracts';

import type { CheckoutSession } from '@/lib/use-checkout';

/**
 * The checkout page body. The concern is that it renders the address picker and delivery choice,
 * fetches a quote from the API and shows the recomputed total, walks Shipping → Payment → Review,
 * and places the order from Review — navigating to the confirmation page — while degrading to
 * sign-in / add-address states when those upstream pieces are absent.
 */

const quote = vi.hoisted(() => vi.fn<() => Promise<CheckoutQuoteResponse>>());
const place = vi.hoisted(() => vi.fn<() => Promise<PlaceOrderResponse>>());
const push = vi.hoisted(() => vi.fn());
const session = vi.hoisted(() => ({ current: {} as CheckoutSession }));

vi.mock('@/lib/order-api', () => ({
  orderApi: { quote, place, get: vi.fn() },
  OrderApiError: class OrderApiError extends Error {
    constructor(_status: number, _code: string, detail: string) {
      super(detail);
    }
  },
}));
vi.mock('@/lib/use-checkout', () => ({
  useCheckoutSession: () => session.current,
}));
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ uid: 'cust-1', ready: true }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

const { CheckoutClient } = await import('./CheckoutClient');

const anAddress = (id: string, isDefault = false) => ({
  id,
  label: 'Home',
  recipientName: 'Asha Rao',
  line1: '1 MG Road',
  line2: null,
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560001',
  phone: '+919845021174',
  isDefault,
});

const aQuote = (): CheckoutQuoteResponse =>
  ({
    lines: [
      {
        productId: 'wooden-blocks',
        variantId: 'v1',
        name: 'Wooden blocks',
        variantName: '240 pieces',
        unitPriceMinor: 1_00_000,
        qty: 2,
        lineTotalMinor: 2_00_000,
      },
    ],
    giftWrap: false,
    subtotalMinor: 2_00_000,
    giftWrapMinor: 0,
    shippingMinor: 0,
    taxMinor: 36_000,
    totalMinor: 2_36_000,
  }) as unknown as CheckoutQuoteResponse;

beforeEach(() => {
  quote.mockReset();
  place.mockReset();
  push.mockReset();
  session.current = { uid: 'cust-1', ready: true, addresses: [anAddress('addr-1', true)] };
});

describe('CheckoutClient', () => {
  it('asks the visitor to sign in when signed out', () => {
    session.current = { uid: null, ready: true, addresses: [] };
    render(<CheckoutClient />);
    expect(screen.getByRole('heading', { name: /sign in to check out/iu })).toBeInTheDocument();
  });

  it('asks for an address when the customer has none saved', () => {
    session.current = { uid: 'cust-1', ready: true, addresses: [] };
    render(<CheckoutClient />);
    expect(screen.getByRole('heading', { name: /add a delivery address/iu })).toBeInTheDocument();
  });

  it('fetches a quote and shows the recomputed total', async () => {
    quote.mockResolvedValue(aQuote());
    render(<CheckoutClient />);
    await waitFor(() => {
      expect(quote).toHaveBeenCalledWith({ deliverySpeed: 'standard' });
    });
    // ₹2,360 total (₹2,000 + ₹360 tax).
    await waitFor(() => {
      expect(screen.getByTestId('checkout-total').textContent).toMatch(/2,360/u);
    });
    expect(screen.getByRole('heading', { name: /where should it go/iu })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue to payment/iu })).toBeEnabled();
  });

  it('re-quotes when the delivery speed changes', async () => {
    quote.mockResolvedValue(aQuote());
    const user = userEvent.setup();
    render(<CheckoutClient />);
    await waitFor(() => {
      expect(quote).toHaveBeenCalledWith({ deliverySpeed: 'standard' });
    });

    await user.click(screen.getByRole('radio', { name: /express/iu }));
    await waitFor(() => {
      expect(quote).toHaveBeenCalledWith({ deliverySpeed: 'express' });
    });
  });

  it('opens the payment step without placing the order', async () => {
    quote.mockResolvedValue(aQuote());
    const user = userEvent.setup();
    render(<CheckoutClient />);
    await waitFor(() => {
      expect(screen.getByTestId('checkout-total')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /continue to payment/iu }));

    expect(screen.getByRole('heading', { name: /how would you like to pay/iu })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upi/iu })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /gpay/iu })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /review order/iu })).toBeEnabled();
    expect(place).not.toHaveBeenCalled();
  });

  it('carries the entered UPI ID onto review and Change returns to payment', async () => {
    quote.mockResolvedValue(aQuote());
    const user = userEvent.setup();
    render(<CheckoutClient />);
    await waitFor(() => {
      expect(screen.getByTestId('checkout-total')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /continue to payment/iu }));
    await user.type(screen.getByLabelText(/^upi id$/iu), 'asha@okbank');
    await user.click(screen.getByRole('button', { name: /review order/iu }));

    expect(screen.getByText(/upi · asha@okbank/iu)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /change payment method/iu }));
    expect(screen.getByRole('heading', { name: /how would you like to pay/iu })).toBeInTheDocument();
    expect(screen.getByLabelText(/^upi id$/iu)).toHaveValue('asha@okbank');
  });

  it('places the order from review and navigates to the confirmation page', async () => {
    quote.mockResolvedValue(aQuote());
    place.mockResolvedValue({ orderId: 'order-abc' } as unknown as PlaceOrderResponse);
    const user = userEvent.setup();
    render(<CheckoutClient />);
    await waitFor(() => {
      expect(screen.getByTestId('checkout-total')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /continue to payment/iu }));
    await user.click(screen.getByRole('button', { name: /review order/iu }));
    expect(screen.getByRole('heading', { name: /check and confirm/iu })).toBeInTheDocument();
    expect(screen.getByText(/asha rao · 1 mg road, bengaluru/iu)).toBeInTheDocument();
    expect(screen.getByText(/upi · gpay/iu)).toBeInTheDocument();
    expect(screen.getByText('Wooden blocks')).toBeInTheDocument();
    expect(screen.getByText(/qty 2 · 240 pieces/iu)).toBeInTheDocument();
    expect(place).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /^pay /iu }));

    await waitFor(() => {
      expect(place).toHaveBeenCalledWith(
        expect.objectContaining({ addressId: 'addr-1', deliverySpeed: 'standard', isGift: false }),
      );
    });
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/orders/order-abc');
    });
  });

  it('shows a processing overlay while the order is placing', async () => {
    quote.mockResolvedValue(aQuote());
    let finish!: (value: PlaceOrderResponse) => void;
    place.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const user = userEvent.setup();
    render(<CheckoutClient />);
    await waitFor(() => {
      expect(screen.getByTestId('checkout-total')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /continue to payment/iu }));
    await user.click(screen.getByRole('button', { name: /review order/iu }));
    await user.click(screen.getByRole('button', { name: /^pay /iu }));

    expect(screen.getByRole('dialog', { name: /paynest/iu })).toBeInTheDocument();
    expect(screen.getByText(/waiting for your upi app/iu)).toBeInTheDocument();
    expect(screen.getByText(/charging/iu)).toBeInTheDocument();

    finish({ orderId: 'order-abc' } as unknown as PlaceOrderResponse);
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/orders/order-abc');
    });
  });

  it('surfaces a quote error and blocks placing', async () => {
    const { OrderApiError } = await import('@/lib/order-api');
    quote.mockRejectedValue(
      new OrderApiError(409, 'INVALID_STATE_TRANSITION', 'Your cart is empty.'),
    );
    render(<CheckoutClient />);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/cart is empty/iu);
    });
    // With no quote, continue-to-payment is disabled.
    expect(screen.getByRole('button', { name: /continue to payment/iu })).toBeDisabled();
  });

  it('sends the gift flag when the invoice checkbox is on', async () => {
    quote.mockResolvedValue(aQuote());
    place.mockResolvedValue({ orderId: 'order-abc' } as unknown as PlaceOrderResponse);
    const user = userEvent.setup();
    render(<CheckoutClient />);
    await waitFor(() => {
      expect(screen.getByTestId('checkout-total')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('checkbox', { name: /it.?s a gift/iu }));
    await user.click(screen.getByRole('button', { name: /continue to payment/iu }));
    await user.click(screen.getByRole('button', { name: /review order/iu }));
    await user.click(screen.getByRole('button', { name: /^pay /iu }));

    await waitFor(() => {
      expect(place).toHaveBeenCalledWith(expect.objectContaining({ isGift: true }));
    });
  });
});
