import type { DeckbuildBenchmarkFamily } from './deckbuildEval';

export const DECKBUILD_BENCHMARK_FAMILIES: DeckbuildBenchmarkFamily[] = [
  {
    key: 'power-fast-mana',
    description: 'Vintage-power style zero/one-cost fast mana benchmark family',
    cardNames: [
      'Mox Emerald',
      'Mox Sapphire',
      'Mox Jet',
      'Mox Ruby',
      'Mox Pearl',
      'Black Lotus',
      'Sol Ring',
      'Mana Crypt',
      'Mana Vault',
      'Jeweled Lotus',
      'Lotus Petal',
      'Chrome Mox',
      'Mox Diamond',
    ],
  },
  {
    key: 'premium-fixing',
    description: 'Strong multicolor fixing and fetch-style lands',
    cardNames: [
      'Prismatic Vista',
      'Fabled Passage',
      'City of Brass',
      'Mana Confluence',
      'Reflecting Pool',
      'Command Tower',
    ],
  },
];
