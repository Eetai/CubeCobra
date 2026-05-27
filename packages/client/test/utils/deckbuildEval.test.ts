import type { BuiltDeck } from '@utils/datatypes/SimulationReport';

import { DECKBUILD_BENCHMARK_FAMILIES } from '../../src/utils/deckbuildBenchmarkFamilies';
import { buildDeckbuildEvalCorpusFromSimulation, collectDeckbuildMissCases, evaluateDeckbuildVariant, filterDeckbuildEvalCorpus, matchesBenchmarkFamily } from '../../src/utils/deckbuildEval';
import { formatDeckbuildEvalMarkdown } from '../../src/utils/deckbuildEvalReport';
import { buildDeckbuildEntriesFromCorpus, evaluateDeckbuildVariantWithBuilder } from '../../src/utils/deckbuildEvalRunner';
import {
  createLocalDeckbuildBaselineVariant,
  createLocalDeckbuildHillClimbVariant,
  createLocalDeckbuildLandTrimVariant,
  createLocalDeckbuildRefillVariant,
  createLocalDeckbuildTargetedRepairVariant,
  createLocalDeckbuildSeedVariant,
  createLocalDeckbuildSwapVariant,
} from '../../src/utils/deckbuildEvalVariants';
import { MINIMAL_DECKBUILD_EVAL_CORPUS as corpus } from '../data/deckbuildCorpora';

describe('matchesBenchmarkFamily', () => {
  it('matches by exact card name for benchmark metadata', () => {
    const family = DECKBUILD_BENCHMARK_FAMILIES.find((entry) => entry.key === 'power-fast-mana');
    expect(family).toBeDefined();
    expect(matchesBenchmarkFamily(family!, 'mox_emerald', corpus.cardMeta)).toBe(true);
    expect(matchesBenchmarkFamily(family!, 'llanowar_elves', corpus.cardMeta)).toBe(false);
  });
});

describe('evaluateDeckbuildVariant', () => {
  it('computes card and family inclusion rates', () => {
    const decks: BuiltDeck[] = [
      {
        mainboard: ['mox_emerald', 'llanowar_elves', 'forest'],
        sideboard: ['giant_growth'],
      },
      {
        mainboard: ['island'],
        sideboard: ['mox_emerald'],
      },
    ];

    const result = evaluateDeckbuildVariant(corpus, decks, 'baseline', {
      cardBenchmarkOracleIds: ['mox_emerald'],
      benchmarkFamilies: DECKBUILD_BENCHMARK_FAMILIES.filter((family) => family.key === 'power-fast-mana'),
      generatedAt: '2026-05-25T00:00:00.000Z',
    });

    expect(result.aggregate.numPools).toBe(2);
    expect(result.aggregate.deckSizeFailures).toBe(1);

    expect(result.cardBenchmarks).toHaveLength(1);
    expect(result.cardBenchmarks[0]).toMatchObject({
      key: 'mox_emerald',
      draftedCount: 2,
      mainboardCount: 1,
      sideboardCount: 1,
      omittedCount: 0,
      mainboardRate: 0.5,
    });

    expect(result.familyBenchmarks).toHaveLength(1);
    expect(result.familyBenchmarks[0]).toMatchObject({
      key: 'power-fast-mana',
      draftedCount: 2,
      mainboardCount: 1,
      sideboardCount: 1,
      omittedCount: 0,
      mainboardRate: 0.5,
    });
  });

  it('throws on deck count mismatch', () => {
    expect(() => evaluateDeckbuildVariant(corpus, [], 'baseline')).toThrow('Deck count mismatch');
  });
});

describe('buildDeckbuildEntriesFromCorpus', () => {
  it('converts corpus pools into deckbuild entries', () => {
    const entries = buildDeckbuildEntriesFromCorpus(corpus);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      pool: ['mox_emerald', 'llanowar_elves', 'giant_growth', 'forest'],
      cardMeta: corpus.cardMeta,
      basics: [],
      maxSpells: 23,
      maxLands: 17,
    });
  });
});

describe('buildDeckbuildEvalCorpusFromSimulation', () => {
  it('converts simulator run data and setup into a corpus', () => {
    const built = buildDeckbuildEvalCorpusFromSimulation(
      {
        cubeName: 'Test Cube',
        cardMeta: corpus.cardMeta,
        slimPools: [
          {
            draftIndex: 0,
            seatIndex: 0,
            archetype: 'G',
            picks: [
              { oracle_id: 'mox_emerald', packNumber: 0, pickNumber: 1 },
              { oracle_id: 'llanowar_elves', packNumber: 0, pickNumber: 2 },
            ],
          },
        ],
      },
      {
        cubeId: 'cube-1',
        basics: [],
        deckbuildSpells: 23,
        deckbuildLands: 17,
      },
      {
        id: 'sim-corpus',
        createdAt: '2026-05-25T00:00:00.000Z',
      },
    );

    expect(built).toMatchObject({
      id: 'sim-corpus',
      deckbuildSpells: 23,
      deckbuildLands: 17,
    });
    expect(built.pools).toHaveLength(1);
    expect(built.pools[0]).toMatchObject({
      id: 'draft-1-seat-1',
      cubeId: 'cube-1',
      cubeName: 'Test Cube',
      pool: ['mox_emerald', 'llanowar_elves'],
      expectedDeckSize: 40,
      expectedMainColors: ['G'],
    });
  });
});

describe('filterDeckbuildEvalCorpus', () => {
  it('filters pools by card name', () => {
    const filtered = filterDeckbuildEvalCorpus(corpus, { cardNames: ['Mox Emerald'] });
    expect(filtered.pools).toHaveLength(2);
  });

  it('filters pools by benchmark family', () => {
    const family = DECKBUILD_BENCHMARK_FAMILIES.find((entry) => entry.key === 'power-fast-mana');
    expect(family).toBeDefined();
    const filtered = filterDeckbuildEvalCorpus(corpus, { benchmarkFamily: family });
    expect(filtered.pools).toHaveLength(2);
  });

  it('excludes non-matching pools', () => {
    const filtered = filterDeckbuildEvalCorpus(corpus, { cardNames: ['Black Lotus'] });
    expect(filtered.pools).toHaveLength(0);
  });
});

describe('evaluateDeckbuildVariantWithBuilder', () => {
  it('runs a variant adapter and evaluates the result', async () => {
    const decks: BuiltDeck[] = [
      {
        mainboard: ['mox_emerald', 'llanowar_elves', 'forest'],
        sideboard: ['giant_growth'],
      },
      {
        mainboard: ['island'],
        sideboard: ['mox_emerald'],
      },
    ];

    const result = await evaluateDeckbuildVariantWithBuilder(
      corpus,
      {
        id: 'fake-variant',
        description: 'Deterministic fake variant for tests',
        build: async () => decks,
      },
      {
        cardBenchmarkOracleIds: ['mox_emerald'],
        benchmarkFamilies: DECKBUILD_BENCHMARK_FAMILIES.filter((family) => family.key === 'power-fast-mana'),
        generatedAt: '2026-05-25T00:00:00.000Z',
      },
    );

    expect(result.variantId).toBe('fake-variant');
    expect(result.cardBenchmarks[0]?.mainboardRate).toBe(0.5);
  });
});

describe('collectDeckbuildMissCases', () => {
  it('collects sideboarded benchmark cards with phase1 ranking context', () => {
    const misses = collectDeckbuildMissCases(
      corpus,
      [
        {
          mainboard: ['llanowar_elves', 'forest'],
          sideboard: ['mox_emerald', 'giant_growth'],
          deckbuildRatings: [
            { oracle: 'llanowar_elves', rating: 10 },
            { oracle: 'forest', rating: 9 },
            { oracle: 'mox_emerald', rating: 8 },
          ],
          phase2Audit: {
            mox_emerald: {
              bestRank: 2,
              bestRating: 7,
              bestGapToPick: 0.5,
              timesConsidered: 3,
              timesTop10: 2,
              finalRank: 4,
            },
          },
        },
        {
          mainboard: ['island', 'mox_emerald'],
          sideboard: [],
          deckbuildRatings: [{ oracle: 'mox_emerald', rating: 10 }],
        },
      ],
      { cardBenchmarkOracleIds: ['mox_emerald'] },
    );

    expect(misses).toHaveLength(1);
    expect(misses[0]).toMatchObject({
      poolId: 'pool-1',
      benchmarkOracleId: 'mox_emerald',
      benchmarkLabel: 'Mox Emerald',
      phase1Rank: 3,
      phase2BestRank: 2,
      phase2TimesConsidered: 3,
    });
    expect(misses[0]?.topSeedCards).toContain('Mox Emerald');
  });
});

describe('createLocalDeckbuildBaselineVariant', () => {
  it('loads the bot before building decks', async () => {
    const calls: string[] = [];
    const decks: BuiltDeck[] = [
      { mainboard: ['mox_emerald'], sideboard: [] },
      { mainboard: ['island'], sideboard: ['mox_emerald'] },
    ];
    const variant = createLocalDeckbuildBaselineVariant({
      loadBot: async () => {
        calls.push('load');
      },
      buildDecks: async (entries) => {
        calls.push(`build:${entries.length}`);
        return decks;
      },
    });

    const entries = buildDeckbuildEntriesFromCorpus(corpus);
    const result = await variant.build(entries, { batchSize: 16 });

    expect(calls).toEqual(['load', 'build:2']);
    expect(result).toBe(decks);
  });
});

describe('createLocalDeckbuildSeedVariant', () => {
  it('passes seedCount through to deckbuild options', async () => {
    const seenOptions: unknown[] = [];
    const variant = createLocalDeckbuildSeedVariant(6, {
      loadBot: async () => {},
      buildDecks: async (_entries, _batchSize, _signal, options) => {
        seenOptions.push(options);
        return [
          { mainboard: ['mox_emerald'], sideboard: [] },
          { mainboard: ['island'], sideboard: [] },
        ];
      },
    });

    const entries = buildDeckbuildEntriesFromCorpus(corpus);
    await variant.build(entries);

    expect(seenOptions).toEqual([{ seedCount: 6 }]);
  });
});

describe('createLocalDeckbuildSwapVariant', () => {
  it('passes postBuildSingleSwap through to deckbuild options', async () => {
    const seenOptions: unknown[] = [];
    const variant = createLocalDeckbuildSwapVariant({
      loadBot: async () => {},
      buildDecks: async (_entries, _batchSize, _signal, options) => {
        seenOptions.push(options);
        return [
          { mainboard: ['mox_emerald'], sideboard: [] },
          { mainboard: ['island'], sideboard: [] },
        ];
      },
    });

    const entries = buildDeckbuildEntriesFromCorpus(corpus);
    await variant.build(entries);

    expect(seenOptions).toEqual([{ postBuildSingleSwap: true }]);
  });
});

describe('createLocalDeckbuildHillClimbVariant', () => {
  it('passes maxPostBuildHillClimbSwaps through to deckbuild options', async () => {
    const seenOptions: unknown[] = [];
    const variant = createLocalDeckbuildHillClimbVariant(3, {
      loadBot: async () => {},
      buildDecks: async (_entries, _batchSize, _signal, options) => {
        seenOptions.push(options);
        return [
          { mainboard: ['mox_emerald'], sideboard: [] },
          { mainboard: ['island'], sideboard: [] },
        ];
      },
    });

    const entries = buildDeckbuildEntriesFromCorpus(corpus);
    await variant.build(entries);

    expect(seenOptions).toEqual([{ maxPostBuildHillClimbSwaps: 3 }]);
  });
});

describe('createLocalDeckbuildRefillVariant', () => {
  it('passes refillSlotsPerRound and refillRounds through to deckbuild options', async () => {
    const seenOptions: unknown[] = [];
    const variant = createLocalDeckbuildRefillVariant(3, 2, {
      loadBot: async () => {},
      buildDecks: async (_entries, _batchSize, _signal, options) => {
        seenOptions.push(options);
        return [
          { mainboard: ['mox_emerald'], sideboard: [] },
          { mainboard: ['island'], sideboard: [] },
        ];
      },
    });

    const entries = buildDeckbuildEntriesFromCorpus(corpus);
    await variant.build(entries);

    expect(seenOptions).toEqual([{ refillSlotsPerRound: 3, refillRounds: 2 }]);
  });
});

describe('createLocalDeckbuildTargetedRepairVariant', () => {
  it('passes targeted repair options through to deckbuild options', async () => {
    const seenOptions: unknown[] = [];
    const variant = createLocalDeckbuildTargetedRepairVariant(2, 4, 6, {
      loadBot: async () => {},
      buildDecks: async (_entries, _batchSize, _signal, options) => {
        seenOptions.push(options);
        return [
          { mainboard: ['mox_emerald'], sideboard: [] },
          { mainboard: ['island'], sideboard: [] },
        ];
      },
    });

    const entries = buildDeckbuildEntriesFromCorpus(corpus);
    await variant.build(entries);

    expect(seenOptions).toEqual([
      { targetedRepairMaxSwaps: 2, targetedRepairTopCandidates: 4, targetedRepairBottomMainboard: 6 },
    ]);
  });
});

describe('createLocalDeckbuildLandTrimVariant', () => {
  it('passes landTrimMaxSwaps through to deckbuild options', async () => {
    const seenOptions: unknown[] = [];
    const variant = createLocalDeckbuildLandTrimVariant(2, {
      loadBot: async () => {},
      buildDecks: async (_entries, _batchSize, _signal, options) => {
        seenOptions.push(options);
        return [
          { mainboard: ['mox_emerald'], sideboard: [] },
          { mainboard: ['island'], sideboard: [] },
        ];
      },
    });

    const entries = buildDeckbuildEntriesFromCorpus(corpus);
    await variant.build(entries);

    expect(seenOptions).toEqual([{ landTrimMaxSwaps: 2 }]);
  });
});

describe('formatDeckbuildEvalMarkdown', () => {
  it('renders a readable markdown report', () => {
    const result = evaluateDeckbuildVariant(corpus, [
      { mainboard: ['mox_emerald', 'llanowar_elves', 'forest'], sideboard: ['giant_growth'] },
      { mainboard: ['island'], sideboard: ['mox_emerald'] },
    ], 'baseline', {
      cardBenchmarkOracleIds: ['mox_emerald'],
      benchmarkFamilies: DECKBUILD_BENCHMARK_FAMILIES.filter((family) => family.key === 'power-fast-mana'),
      generatedAt: '2026-05-25T00:00:00.000Z',
    });

    const markdown = formatDeckbuildEvalMarkdown(result);
    expect(markdown).toContain('# Deckbuild Eval: baseline');
    expect(markdown).toContain('## Aggregate');
    expect(markdown).toContain('## Card Benchmarks');
    expect(markdown).toContain('Mox Emerald');
    expect(markdown).toContain('50.0%');
    expect(markdown).toContain('## Family Benchmarks');
  });
});
