import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';

import { brand, content, contact, features, theme } from '@/lib/store';

import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';
import { Wordmark } from './Wordmark';

/**
 * The shell, asserted against the *generated* store config rather than a fixture.
 *
 * That is deliberate: these tests read the same artefact the app renders from, so they
 * verify the wiring end to end. Where a value is asserted, it comes from config — the
 * tests would fail for a store whose config disagreed, which is the point.
 */

async function expectNoAxeViolations(container: HTMLElement): Promise<void> {
  const results = await axe.run(container, {
    // No layout in jsdom, so contrast cannot be evaluated here. It is gated far more
    // strictly against the palette itself in @romp/store-config.
    rules: { 'color-contrast': { enabled: false } },
  });

  if (results.violations.length > 0) {
    expect.fail(
      results.violations.map((violation) => `${violation.id}: ${violation.help}`).join('\n'),
    );
  }
}

describe('Wordmark', () => {
  it('uses the configured store name as its accessible name', () => {
    render(<Wordmark />);

    // Not "logo": the role is already announced, so "ROMP logo, link" is redundant.
    expect(screen.getByRole('link', { name: `${brand.name} — home` })).toHaveAttribute('href', '/');
  });

  it('renders the configured artwork from public/brand', () => {
    render(<Wordmark />);

    const sources = screen.getAllByAltText(brand.name).map((image) => image.getAttribute('src'));
    expect(sources.some((src) => src?.includes('logo-dark.svg'))).toBe(true);
    expect(sources.some((src) => src?.includes('logo-light.svg'))).toBe(true);
  });

  it('uses the square mark when compact', () => {
    render(<Wordmark compact />);

    expect(screen.getByAltText(brand.name).getAttribute('src')).toContain('mark.svg');
  });
});

describe('SiteHeader', () => {
  it('is accessible', async () => {
    const { container } = render(<SiteHeader />);

    await expectNoAxeViolations(container);
  });

  it('puts a single Explore link to the listing next to the wordmark', () => {
    render(<SiteHeader />);

    const nav = screen.getByRole('navigation', { name: 'Explore' });
    const links = [...nav.querySelectorAll('a')];

    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent('Explore');
    expect(links[0]).toHaveAttribute('href', '/listing');
  });

  it('does not list category or age routes in the header', () => {
    render(<SiteHeader />);

    expect(screen.queryByRole('navigation', { name: 'Categories' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: content.home.hero.primaryCta.label })).not.toBeInTheDocument();
    for (const category of content.categories.filter((item) => item.showInNav)) {
      expect(screen.queryByRole('link', { name: category.name })).not.toBeInTheDocument();
    }
  });

  it('gives the search input a real label, not just a placeholder', () => {
    // A placeholder is not an accessible name, and it vanishes as soon as the user types.
    render(<SiteHeader />);

    expect(screen.getByRole('searchbox', { name: 'Search toys' })).toBeInTheDocument();
  });

  it('names every icon-only control', () => {
    render(<SiteHeader />);

    for (const name of ['Your account', 'Your cart', 'Notifications']) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument();
    }
    if (theme.modes !== undefined) {
      expect(screen.getByRole('button', { name: /switch theme/iu })).toBeInTheDocument();
    }
  });

  it('orders the account cluster as bell, wishlist, cart, profile, then colour mode', () => {
    render(<SiteHeader />);

    const cluster = document.querySelector('.header-actions');
    expect(cluster).not.toBeNull();
    const names = [...cluster!.querySelectorAll('a, button')].map((node) =>
      (node.getAttribute('aria-label') ?? '').replace(/,.*/u, ''),
    );

    const expected = [
      'Notifications',
      ...(features.wishlist ? ['Saved toys'] : []),
      'Your cart',
      'Your account',
      ...(theme.modes !== undefined ? ['Switch theme'] : []),
    ];
    expect(names).toEqual(expected);
  });

  it('respects the wishlist feature flag', () => {
    render(<SiteHeader />);

    const wishlist = screen.queryByRole('link', { name: 'Saved toys' });
    if (features.wishlist) {
      expect(wishlist).toBeInTheDocument();
    } else {
      expect(wishlist).not.toBeInTheDocument();
    }
  });
});

describe('SiteFooter', () => {
  it('is accessible', async () => {
    const { container } = render(<SiteFooter />);

    await expectNoAxeViolations(container);
  });

  it('renders the configured columns and links', () => {
    render(<SiteFooter />);

    for (const column of content.footer.columns) {
      expect(screen.getByRole('heading', { name: column.title })).toBeInTheDocument();
      for (const link of column.links) {
        expect(screen.getByRole('link', { name: link.label })).toHaveAttribute('href', link.href);
      }
    }
  });

  it('renders the configured legal line', () => {
    render(<SiteFooter />);

    expect(screen.getByText(content.footer.legalLine)).toBeInTheDocument();
  });

  it('links support to WhatsApp using the configured number', () => {
    // Support is WhatsApp because the platform sends no email (ADR-0007).
    render(<SiteFooter />);

    // Matched on the full accessible name, including the new-tab announcement, so this
    // cannot silently start matching a configured footer link with similar wording.
    const link = screen.getByRole('link', { name: 'Chat on WhatsApp (opens in a new tab)' });
    const expectedNumber = contact.whatsappNumber.replace('+', '');

    expect(link).toHaveAttribute('href', expect.stringContaining(`wa.me/${expectedNumber}`));
    expect(link).toHaveAttribute('target', '_blank');
    // Without noreferrer the opened page gets a handle back to this one.
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('announces that the support link opens a new tab', () => {
    render(<SiteFooter />);

    expect(screen.getByRole('link', { name: /opens in a new tab/u })).toBeInTheDocument();
  });

  it('shows the configured support hours', () => {
    render(<SiteFooter />);

    expect(screen.getByText(contact.supportHours)).toBeInTheDocument();
  });
});
