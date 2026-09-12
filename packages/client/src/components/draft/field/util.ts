import { cardCmc, cardColorIdentityCategory, cardName } from '@utils/cardutil';
import CardType, { ColorCategory } from '@utils/datatypes/Card';

// CMC buckets 0..6 plus a 7+ catch-all.
export const MAX_CMC_BUCKET = 7;

export const cmcBucket = (card: CardType): number => Math.min(MAX_CMC_BUCKET, Math.max(0, Math.floor(cardCmc(card))));

export const cmcBucketLabel = (bucket: number): string => (bucket >= MAX_CMC_BUCKET ? '7+ CMC' : `${bucket} CMC`);

/** Group cards into ascending CMC buckets, names sorted within each bucket. */
export const groupByCmc = (cards: CardType[]): { bucket: number; cards: CardType[] }[] => {
  const map = new Map<number, CardType[]>();
  for (const card of cards) {
    const b = cmcBucket(card);
    const list = map.get(b);
    if (list) list.push(card);
    else map.set(b, [card]);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([bucket, list]) => ({ bucket, cards: [...list].sort((a, b) => cardName(a).localeCompare(cardName(b))) }));
};

/** Flat list sorted by CMC then name — used by the thumbnail grid. */
export const sortByCmcThenName = (cards: CardType[]): CardType[] =>
  [...cards].sort((a, b) => cmcBucket(a) - cmcBucket(b) || cardName(a).localeCompare(cardName(b)));

// Column order for the color-chip view; only non-empty categories are rendered.
export const COLOR_COLUMN_ORDER: ColorCategory[] = [
  'White',
  'Blue',
  'Black',
  'Red',
  'Green',
  'Multicolored',
  'Hybrid',
  'Colorless',
  'Lands',
];

/** Group cards by color-identity category, names sorted within each. */
export const groupByColor = (cards: CardType[]): { category: ColorCategory; cards: CardType[] }[] => {
  const map = new Map<ColorCategory, CardType[]>();
  for (const card of cards) {
    const cat = cardColorIdentityCategory(card);
    const list = map.get(cat);
    if (list) list.push(card);
    else map.set(cat, [card]);
  }
  return COLOR_COLUMN_ORDER.filter((cat) => map.has(cat)).map((category) => ({
    category,
    cards: [...map.get(category)!].sort((a, b) => cardName(a).localeCompare(cardName(b))),
  }));
};

// Tailwind classes for a color-category chip (background + readable text).
export const COLOR_CHIP_CLASS: Record<ColorCategory, string> = {
  White: 'bg-card-white text-black',
  Blue: 'bg-card-blue text-white',
  Black: 'bg-card-black text-white',
  Red: 'bg-card-red text-white',
  Green: 'bg-card-green text-white',
  Colorless: 'bg-card-colorless text-black',
  Multicolored: 'bg-card-multi text-black',
  Hybrid: 'bg-card-multi text-black',
  Lands: 'bg-card-lands text-white',
};
