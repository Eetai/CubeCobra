import type { CardMeta } from '@utils/datatypes/SimulationReport';

import type { DeckbuildEvalCorpus } from '../../src/utils/deckbuildEval';

const cardMeta: Record<string, CardMeta> = {
  mox_emerald: {
    name: 'Mox Emerald',
    imageUrl: '',
    colorIdentity: [],
    elo: 1800,
    cmc: 0,
    type: 'Artifact',
  },
  forest: {
    name: 'Forest',
    imageUrl: '',
    colorIdentity: ['G'],
    elo: 1200,
    cmc: 0,
    type: 'Basic Land — Forest',
    producedMana: ['G'],
  },
  llanowar_elves: {
    name: 'Llanowar Elves',
    imageUrl: '',
    colorIdentity: ['G'],
    elo: 1300,
    cmc: 1,
    type: 'Creature — Elf Druid',
  },
  giant_growth: {
    name: 'Giant Growth',
    imageUrl: '',
    colorIdentity: ['G'],
    elo: 1200,
    cmc: 1,
    type: 'Instant',
  },
  island: {
    name: 'Island',
    imageUrl: '',
    colorIdentity: ['U'],
    elo: 1200,
    cmc: 0,
    type: 'Basic Land — Island',
    producedMana: ['U'],
  },
};

export const MINIMAL_DECKBUILD_EVAL_CORPUS: DeckbuildEvalCorpus = {
  id: 'minimal-deckbuild-eval',
  description: 'Minimal corpus for deckbuild evaluation harness tests',
  createdAt: '2026-05-25T00:00:00.000Z',
  cardMeta,
  basics: [],
  deckbuildSpells: 23,
  deckbuildLands: 17,
  pools: [
    {
      id: 'pool-1',
      pool: ['mox_emerald', 'llanowar_elves', 'giant_growth', 'forest'],
      expectedDeckSize: 3,
    },
    {
      id: 'pool-2',
      pool: ['mox_emerald', 'island'],
      expectedDeckSize: 2,
    },
  ],
};
