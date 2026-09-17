import { describe, expect, it } from 'vitest';

import { HOME_PLACEHOLDERS, homePlaceholder, isHomePlaceholder } from './home-placeholders';

describe('homePlaceholder', () => {
  it('rotates through the six shop images', () => {
    expect(homePlaceholder(0)).toBe(HOME_PLACEHOLDERS[0]);
    expect(homePlaceholder(6)).toBe(HOME_PLACEHOLDERS[0]);
    expect(homePlaceholder(4)).toBe(HOME_PLACEHOLDERS[4]);
  });

  it('recognises shop-art URLs', () => {
    const first = HOME_PLACEHOLDERS[0];
    if (first === undefined) throw new Error('HOME_PLACEHOLDERS is empty');
    expect(isHomePlaceholder(first)).toBe(true);
    expect(isHomePlaceholder('https://cdn.example.test/cover.webp')).toBe(false);
  });
});
