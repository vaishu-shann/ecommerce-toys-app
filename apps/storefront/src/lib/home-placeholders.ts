/**
 * Decorative placeholder art for home-page cards that have no product photography yet.
 *
 * These are not catalogue media — they fill the hero, age tiles and empty product cards
 * so a freshly seeded store is not a wall of letter-initials. Real covers still win.
 */
export const HOME_PLACEHOLDERS = [
  'https://media.istockphoto.com/id/1439713463/vector/toy-store-building-facade-isolated-flat-design-vector-illustration.jpg?s=612x612&w=0&k=20&c=nXGsHqpHepPAlCjTeXVLotol-W7PZzeqmo_eZoADYfA=',
  'https://as1.ftcdn.net/jpg/03/05/87/48/1000_F_305874845_RzocxwMmIU0rvSOVVPmy2xh7VA9JsSiA.jpg',
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcStbDQrSvM4OPRJ6Qh4AFNB4K64rQd4gN4vFpOXFkZ49qFdd_UIGIg8wyB6&s=10',
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSRIf_PoTGm_AaAfg-b6eTaPlJ09WnoSUvAY5sYXmGra98mZzX2DS1j0oXE&s=10',
  'https://img.magnific.com/free-vector/font-design-word-toy-shop-with-many-toys_1308-42318.jpg?semt=ais_hybrid&w=740&q=80',
  'https://img.magnific.com/free-vector/different-kind-toys_1308-71053.jpg?semt=ais_hybrid&w=740&q=80',
] as const;

export function homePlaceholder(index: number): string {
  const count = HOME_PLACEHOLDERS.length;
  const slot = ((index % count) + count) % count;
  const image = HOME_PLACEHOLDERS[slot];
  if (image === undefined) {
    throw new Error('HOME_PLACEHOLDERS is empty');
  }
  return image;
}

const PLACEHOLDER_URLS = new Set<string>(HOME_PLACEHOLDERS);

/** True when a gallery/card URL is shop-art filler, not catalogue media. */
export function isHomePlaceholder(url: string): boolean {
  return PLACEHOLDER_URLS.has(url);
}
