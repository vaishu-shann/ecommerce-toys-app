import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
let currentParams = new URLSearchParams();
let pathname = '/listing';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => pathname,
  useSearchParams: () => currentParams,
}));

import { content } from '@/lib/store';

import { ListingSidebar } from './ListingSidebar';

const band = content.ageBands[0];
if (band === undefined) throw new Error('no age bands configured');

const navCategory = content.categories.find((entry) => entry.showInNav);
if (navCategory === undefined) throw new Error('no nav category configured');
const navSlug = navCategory.slug;
const navName = navCategory.name;

function renderSidebar(overrides: Partial<ComponentProps<typeof ListingSidebar>> = {}): void {
  render(
    <ListingSidebar
      lockedAge={undefined}
      lockedCategory={undefined}
      selectedCategories={[]}
      minPrice={undefined}
      maxPrice={undefined}
      inStockOnly={false}
      bis={false}
      smallParts={false}
      bpa={false}
      categoryCounts={{ [navSlug]: 12 }}
      showCategoryCounts
      {...overrides}
    />,
  );
}

describe('ListingSidebar', () => {
  beforeEach(() => {
    push.mockClear();
    currentParams = new URLSearchParams();
    pathname = '/listing';
  });

  it('sends an age chip to the age route', async () => {
    renderSidebar();

    await userEvent.click(screen.getByRole('button', { name: band.label }));

    expect(push).toHaveBeenCalledWith(`/age/${band.value}`);
  });

  it('writes in-stock as a present-or-absent param', async () => {
    renderSidebar();

    await userEvent.click(screen.getByRole('checkbox', { name: 'In stock only' }));

    expect(push).toHaveBeenCalledWith(expect.stringContaining('inStock=true'));
  });

  it('navigates a single category to its own route', async () => {
    renderSidebar();

    await userEvent.click(screen.getByRole('checkbox', { name: new RegExp(navName, 'u') }));

    expect(push).toHaveBeenCalledWith(`/c/${navSlug}`);
  });

  it('carries a locked category onto an age route as a cat param', async () => {
    pathname = `/c/${navSlug}`;
    renderSidebar({ lockedCategory: navSlug });

    await userEvent.click(screen.getByRole('button', { name: band.label }));

    expect(push).toHaveBeenCalledWith(`/age/${band.value}?cat=${navSlug}`);
  });
});
