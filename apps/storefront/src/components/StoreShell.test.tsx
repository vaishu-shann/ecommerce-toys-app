import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

let pathname = '/';

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}));

const { StoreShell } = await import('./StoreShell');

describe('StoreShell', () => {
  it('renders the shop chrome on ordinary routes', () => {
    pathname = '/listing';
    render(
      <StoreShell header={<div>HEADER</div>} footer={<div>FOOTER</div>}>
        <p>BODY</p>
      </StoreShell>,
    );

    expect(screen.getByText('HEADER')).toBeInTheDocument();
    expect(screen.getByText('FOOTER')).toBeInTheDocument();
    expect(screen.getByText('BODY')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('omits the shop chrome on sign-in', () => {
    pathname = '/account/sign-in';
    render(
      <StoreShell header={<div>HEADER</div>} footer={<div>FOOTER</div>}>
        <p>SIGN IN</p>
      </StoreShell>,
    );

    expect(screen.queryByText('HEADER')).not.toBeInTheDocument();
    expect(screen.queryByText('FOOTER')).not.toBeInTheDocument();
    expect(screen.getByText('SIGN IN')).toBeInTheDocument();
  });

  it('omits the shop chrome on register', () => {
    pathname = '/account/register';
    render(
      <StoreShell header={<div>HEADER</div>} footer={<div>FOOTER</div>}>
        <p>REGISTER</p>
      </StoreShell>,
    );

    expect(screen.queryByText('HEADER')).not.toBeInTheDocument();
    expect(screen.queryByText('FOOTER')).not.toBeInTheDocument();
  });
});
