import type { BasicLandInfo, BuiltDeck, CardMeta, SimulationRunData, SimulationSetupResponse } from '@utils/datatypes/SimulationReport';

export interface DeckbuildEvalPool {
  id: string;
  pool: string[];
  cubeId?: string;
  cubeName?: string;
  tags?: string[];
  expectedDeckSize?: number;
  expectedMainColors?: string[];
  notes?: string;
}

export interface DeckbuildEvalCorpus {
  id: string;
  description: string;
  createdAt: string;
  cardMeta: Record<string, CardMeta>;
  basics: BasicLandInfo[];
  deckbuildSpells?: number;
  deckbuildLands?: number;
  pools: DeckbuildEvalPool[];
}

export interface DeckbuildBenchmarkFamily {
  key: string;
  description: string;
  oracleIds?: string[];
  cardNames?: string[];
}

export interface DeckbuildEvalAggregate {
  numPools: number;
  deckSizeFailures: number;
  avgMainboardSize: number;
  avgSideboardSize: number;
  avgMainboardCmc: number;
  avgMainboardNonbasicCount: number;
}

export interface DeckbuildEvalCardBenchmark {
  key: string;
  label: string;
  draftedCount: number;
  mainboardCount: number;
  sideboardCount: number;
  omittedCount: number;
  mainboardRate: number;
}

export interface DeckbuildEvalFamilyBenchmark {
  key: string;
  description: string;
  draftedCount: number;
  mainboardCount: number;
  sideboardCount: number;
  omittedCount: number;
  mainboardRate: number;
}

export interface DeckbuildEvalResult {
  corpusId: string;
  variantId: string;
  generatedAt: string;
  aggregate: DeckbuildEvalAggregate;
  cardBenchmarks: DeckbuildEvalCardBenchmark[];
  familyBenchmarks: DeckbuildEvalFamilyBenchmark[];
}

export interface DeckbuildMissCase {
  poolId: string;
  benchmarkOracleId: string;
  benchmarkLabel: string;
  expectedMainColors?: string[];
  phase1Rank: number | null;
  phase1Rating: number | null;
  phase2BestRank: number | null;
  phase2BestRating: number | null;
  phase2BestGapToPick: number | null;
  phase2TimesConsidered: number;
  phase2TimesTop10: number;
  phase2FinalRank: number | null;
  topSeedCards: string[];
}

export function filterDeckbuildEvalCorpus(
  corpus: DeckbuildEvalCorpus,
  options: {
    cardNames?: string[];
    benchmarkFamily?: DeckbuildBenchmarkFamily;
  },
): DeckbuildEvalCorpus {
  const wantedNames = new Set(options.cardNames ?? []);
  const pools = corpus.pools.filter((pool) =>
    pool.pool.some((oracleId) => {
      if (wantedNames.size > 0 && wantedNames.has(corpus.cardMeta[oracleId]?.name ?? '')) return true;
      if (options.benchmarkFamily && matchesBenchmarkFamily(options.benchmarkFamily, oracleId, corpus.cardMeta)) return true;
      return false;
    }),
  );

  let suffix = '';
  if (options.benchmarkFamily) suffix += `-${options.benchmarkFamily.key}`;
  if (wantedNames.size > 0) suffix += `-cards`;

  return {
    ...corpus,
    id: suffix ? `${corpus.id}${suffix}` : corpus.id,
    pools,
  };
}

export function buildDeckbuildEvalCorpusFromSimulation(
  runData: Pick<SimulationRunData, 'cubeName' | 'cardMeta' | 'slimPools'>,
  setup: Pick<SimulationSetupResponse, 'cubeId' | 'basics' | 'deckbuildSpells' | 'deckbuildLands'>,
  options?: {
    id?: string;
    description?: string;
    createdAt?: string;
    tagsByPoolId?: Record<string, string[]>;
  },
): DeckbuildEvalCorpus {
  return {
    id: options?.id ?? `${setup.cubeId}-${new Date().toISOString().slice(0, 10)}-deckbuild-eval`,
    description: options?.description ?? `Deckbuild evaluation corpus from ${runData.cubeName}`,
    createdAt: options?.createdAt ?? new Date().toISOString(),
    cardMeta: runData.cardMeta,
    basics: setup.basics,
    deckbuildSpells: setup.deckbuildSpells,
    deckbuildLands: setup.deckbuildLands,
    pools: runData.slimPools.map((pool) => ({
      id: `draft-${pool.draftIndex + 1}-seat-${pool.seatIndex + 1}`,
      cubeId: setup.cubeId,
      cubeName: runData.cubeName,
      tags: options?.tagsByPoolId?.[`draft-${pool.draftIndex + 1}-seat-${pool.seatIndex + 1}`],
      pool: pool.picks.map((pick) => pick.oracle_id),
      expectedDeckSize:
        (setup.deckbuildSpells ?? 23) + (setup.deckbuildLands ?? 17),
      expectedMainColors: pool.archetype === 'C' ? [] : pool.archetype.split(''),
      notes: `Draft ${pool.draftIndex + 1} seat ${pool.seatIndex + 1}`,
    })),
  };
}

type Counts = {
  draftedCount: number;
  mainboardCount: number;
  sideboardCount: number;
  omittedCount: number;
};

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function countNonbasicLands(mainboard: string[], cardMeta: Record<string, CardMeta>): number {
  return mainboard.reduce((count, oracleId) => {
    const type = cardMeta[oracleId]?.type?.toLowerCase() ?? '';
    if (!type.includes('land')) return count;
    if (type.includes('basic land')) return count;
    return count + 1;
  }, 0);
}

function averageMainboardCmc(mainboard: string[], cardMeta: Record<string, CardMeta>): number {
  const spellCmcs = mainboard
    .map((oracleId) => {
      const meta = cardMeta[oracleId];
      const type = meta?.type?.toLowerCase() ?? '';
      if (type.includes('land')) return null;
      return meta?.cmc ?? 0;
    })
    .filter((cmc): cmc is number => cmc !== null);
  return average(spellCmcs);
}

function rate(count: number, total: number): number {
  return total > 0 ? count / total : 0;
}

function updateCountsForPool(counts: Counts, poolCounts: Record<string, number>, deck: BuiltDeck, oracleId: string): void {
  const drafted = poolCounts[oracleId] ?? 0;
  if (drafted <= 0) return;
  const mainboardCopies = deck.mainboard.filter((cardOracleId) => cardOracleId === oracleId).length;
  const sideboardCopies = deck.sideboard.filter((cardOracleId) => cardOracleId === oracleId).length;
  counts.draftedCount += drafted;
  counts.mainboardCount += mainboardCopies;
  counts.sideboardCount += sideboardCopies;
  counts.omittedCount += Math.max(0, drafted - mainboardCopies - sideboardCopies);
}

export function matchesBenchmarkFamily(
  family: DeckbuildBenchmarkFamily,
  oracleId: string,
  cardMeta: Record<string, CardMeta>,
): boolean {
  if (family.oracleIds?.includes(oracleId)) return true;
  const name = cardMeta[oracleId]?.name;
  return !!(name && family.cardNames?.includes(name));
}

export function evaluateDeckbuildVariant(
  corpus: DeckbuildEvalCorpus,
  decks: BuiltDeck[],
  variantId: string,
  options?: {
    cardBenchmarkOracleIds?: string[];
    benchmarkFamilies?: DeckbuildBenchmarkFamily[];
    generatedAt?: string;
  },
): DeckbuildEvalResult {
  if (decks.length !== corpus.pools.length) {
    throw new Error(`Deck count mismatch: got ${decks.length} decks for ${corpus.pools.length} pools`);
  }

  const cardBenchmarkOracleIds = [...new Set(options?.cardBenchmarkOracleIds ?? [])];
  const benchmarkFamilies = options?.benchmarkFamilies ?? [];

  const deckSizeFailures = corpus.pools.reduce((count, pool, index) => {
    if (!pool.expectedDeckSize) return count;
    return count + (decks[index]?.mainboard.length === pool.expectedDeckSize ? 0 : 1);
  }, 0);

  const mainboardSizes = decks.map((deck) => deck.mainboard.length);
  const sideboardSizes = decks.map((deck) => deck.sideboard.length);
  const mainboardCmcs = decks.map((deck) => averageMainboardCmc(deck.mainboard, corpus.cardMeta));
  const mainboardNonbasicCounts = decks.map((deck) => countNonbasicLands(deck.mainboard, corpus.cardMeta));

  const cardBenchmarks = cardBenchmarkOracleIds.map((oracleId) => {
    const label = corpus.cardMeta[oracleId]?.name ?? oracleId;
    const counts: Counts = { draftedCount: 0, mainboardCount: 0, sideboardCount: 0, omittedCount: 0 };
    corpus.pools.forEach((pool, index) => {
      const poolCounts = pool.pool.reduce<Record<string, number>>((acc, poolOracleId) => {
        acc[poolOracleId] = (acc[poolOracleId] ?? 0) + 1;
        return acc;
      }, {});
      updateCountsForPool(counts, poolCounts, decks[index]!, oracleId);
    });
    return {
      key: oracleId,
      label,
      draftedCount: counts.draftedCount,
      mainboardCount: counts.mainboardCount,
      sideboardCount: counts.sideboardCount,
      omittedCount: counts.omittedCount,
      mainboardRate: rate(counts.mainboardCount, counts.draftedCount),
    };
  });

  const familyBenchmarks = benchmarkFamilies.map((family) => {
    const counts: Counts = { draftedCount: 0, mainboardCount: 0, sideboardCount: 0, omittedCount: 0 };
    corpus.pools.forEach((pool, index) => {
      const poolCounts = pool.pool.reduce<Record<string, number>>((acc, oracleId) => {
        acc[oracleId] = (acc[oracleId] ?? 0) + 1;
        return acc;
      }, {});
      for (const oracleId of Object.keys(poolCounts)) {
        if (!matchesBenchmarkFamily(family, oracleId, corpus.cardMeta)) continue;
        updateCountsForPool(counts, poolCounts, decks[index]!, oracleId);
      }
    });
    return {
      key: family.key,
      description: family.description,
      draftedCount: counts.draftedCount,
      mainboardCount: counts.mainboardCount,
      sideboardCount: counts.sideboardCount,
      omittedCount: counts.omittedCount,
      mainboardRate: rate(counts.mainboardCount, counts.draftedCount),
    };
  });

  return {
    corpusId: corpus.id,
    variantId,
    generatedAt: options?.generatedAt ?? new Date().toISOString(),
    aggregate: {
      numPools: corpus.pools.length,
      deckSizeFailures,
      avgMainboardSize: average(mainboardSizes),
      avgSideboardSize: average(sideboardSizes),
      avgMainboardCmc: average(mainboardCmcs),
      avgMainboardNonbasicCount: average(mainboardNonbasicCounts),
    },
    cardBenchmarks,
    familyBenchmarks,
  };
}

export function collectDeckbuildMissCases(
  corpus: DeckbuildEvalCorpus,
  decks: BuiltDeck[],
  options?: {
    cardBenchmarkOracleIds?: string[];
    benchmarkFamily?: DeckbuildBenchmarkFamily;
  },
): DeckbuildMissCase[] {
  if (decks.length !== corpus.pools.length) {
    throw new Error(`Deck count mismatch: got ${decks.length} decks for ${corpus.pools.length} pools`);
  }

  const cardBenchmarkOracleIds = new Set(options?.cardBenchmarkOracleIds ?? []);
  const benchmarkFamily = options?.benchmarkFamily;
  const misses: DeckbuildMissCase[] = [];

  for (let i = 0; i < corpus.pools.length; i += 1) {
    const pool = corpus.pools[i]!;
    const deck = decks[i]!;
    const sideboardSet = new Set(deck.sideboard);

    for (const oracleId of new Set(pool.pool)) {
      const matchesCard = cardBenchmarkOracleIds.has(oracleId);
      const matchesFamily = benchmarkFamily ? matchesBenchmarkFamily(benchmarkFamily, oracleId, corpus.cardMeta) : false;
      if (!matchesCard && !matchesFamily) continue;
      if (!sideboardSet.has(oracleId)) continue;

      const phase1RankIndex = deck.deckbuildRatings?.findIndex((entry) => entry.oracle === oracleId) ?? -1;
      const phase1Entry = phase1RankIndex >= 0 ? deck.deckbuildRatings?.[phase1RankIndex] : null;
      misses.push({
        poolId: pool.id,
        benchmarkOracleId: oracleId,
        benchmarkLabel: corpus.cardMeta[oracleId]?.name ?? oracleId,
        expectedMainColors: pool.expectedMainColors,
        phase1Rank: phase1RankIndex >= 0 ? phase1RankIndex + 1 : null,
        phase1Rating: phase1Entry?.rating ?? null,
        phase2BestRank: deck.phase2Audit?.[oracleId]?.bestRank ?? null,
        phase2BestRating: deck.phase2Audit?.[oracleId]?.bestRating ?? null,
        phase2BestGapToPick: deck.phase2Audit?.[oracleId]?.bestGapToPick ?? null,
        phase2TimesConsidered: deck.phase2Audit?.[oracleId]?.timesConsidered ?? 0,
        phase2TimesTop10: deck.phase2Audit?.[oracleId]?.timesTop10 ?? 0,
        phase2FinalRank: deck.phase2Audit?.[oracleId]?.finalRank ?? null,
        topSeedCards: (deck.deckbuildRatings ?? []).slice(0, 10).map((entry) => corpus.cardMeta[entry.oracle]?.name ?? entry.oracle),
      });
    }
  }

  return misses.sort((a, b) => {
    const rankA = a.phase1Rank ?? Number.POSITIVE_INFINITY;
    const rankB = b.phase1Rank ?? Number.POSITIVE_INFINITY;
    if (rankA !== rankB) return rankA - rankB;
    return a.benchmarkLabel.localeCompare(b.benchmarkLabel);
  });
}
