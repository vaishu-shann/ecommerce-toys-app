import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
let currentParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/c/wooden',
  useSearchParams: () => currentParams,
}));

import { ListingControls } from './ListingControls';

/**
 * The sort/layout controls.
 *
 * The behaviour worth testing is what they write to the URL, because that is the whole
 * mechanism: the state lives in the query string, the server re-renders from it. The
 * router is faked so a `push` is observable.
 *
 * The load-bearing assertion is that **every change drops the cursor**. A cursor is bound
 * to the sort that produced it; carrying one across a sort change is exactly what
 * `decodeCursor` rejects, so resetting to page one here is what keeps the customer from
 * ever seeing that error.
 */
describe('ListingControls', () => {
  beforeEach(() => {
    push.mockClear();
    currentParams = new URLSearchParams();
  });

  it('writes the chosen sort to the URL', async () => {
    render(<ListingControls sort="newest" />);

    await userEvent.selectOptions(screen.getByRole('combobox'), 'price_asc');

    expect(push).toHaveBeenCalledWith(expect.stringContaining('sort=price_asc'));
  });

  it('drops the cursor when the sort changes', async () => {
    // A cursor from a price-sorted page is meaningless under a rating sort.
    currentParams = new URLSearchParams({ sort: 'newest', cursor: 'STALE' });
    render(<ListingControls sort="newest" />);

    await userEvent.selectOptions(screen.getByRole('combobox'), 'rating_desc');

    const target = push.mock.calls[0]?.[0] as string;
    expect(target).toContain('sort=rating_desc');
    expect(target).not.toContain('cursor');
  });

  it('omits the default sort rather than writing newest', async () => {
    currentParams = new URLSearchParams({ sort: 'price_asc' });
    render(<ListingControls sort="price_asc" />);

    await userEvent.selectOptions(screen.getByRole('combobox'), 'newest');

    const target = push.mock.calls[0]?.[0] as string;
    expect(target).not.toContain('sort=');
  });

  it('reflects the current state', () => {
    render(<ListingControls sort="price_desc" />);

    expect(screen.getByRole('combobox')).toHaveValue('price_desc');
  });
});
