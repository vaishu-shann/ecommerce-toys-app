import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { brand } from '@/lib/store';

import { AuthStage } from './AuthStage';

describe('AuthStage', () => {
  it('centres the form without shop chrome and keeps a skip target', () => {
    render(
      <AuthStage>
        <h1>Sign in</h1>
      </AuthStage>,
    );

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: `${brand.name} — home` })).toHaveAttribute('href', '/');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });
});
