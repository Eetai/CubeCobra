import type { BuiltDeck } from '@utils/datatypes/SimulationReport';

import type { DeckbuildEntry } from './draftBot';
import type {
  DeckbuildBenchmarkFamily,
  DeckbuildEvalCorpus,
  DeckbuildEvalResult,
} from './deckbuildEval';
import { evaluateDeckbuildVariant } from './deckbuildEval';

export interface DeckbuildVariant {
  id: string;
  description: string;
  build: (
    entries: DeckbuildEntry[],
    opts?: { signal?: AbortSignal; batchSize?: number },
  ) => Promise<BuiltDeck[]>;
}

export function buildDeckbuildEntriesFromCorpus(corpus: DeckbuildEvalCorpus): DeckbuildEntry[] {
  return corpus.pools.map((pool) => ({
    pool: pool.pool,
    cardMeta: corpus.cardMeta,
    basics: corpus.basics,
    maxSpells: corpus.deckbuildSpells,
    maxLands: corpus.deckbuildLands,
  }));
}

export async function evaluateDeckbuildVariantWithBuilder(
  corpus: DeckbuildEvalCorpus,
  variant: DeckbuildVariant,
  options?: {
    signal?: AbortSignal;
    batchSize?: number;
    poolBatchSize?: number;
    onPoolBatchComplete?: (donePools: number, totalPools: number) => void;
    cardBenchmarkOracleIds?: string[];
    benchmarkFamilies?: DeckbuildBenchmarkFamily[];
    generatedAt?: string;
  },
): Promise<DeckbuildEvalResult> {
  const entries = buildDeckbuildEntriesFromCorpus(corpus);
  let decks: BuiltDeck[];

  if (options?.poolBatchSize && options.poolBatchSize > 0 && options.poolBatchSize < entries.length) {
    decks = [];
    for (let start = 0; start < entries.length; start += options.poolBatchSize) {
      const chunk = entries.slice(start, start + options.poolBatchSize);
      const chunkDecks = await variant.build(chunk, {
        signal: options?.signal,
        batchSize: options?.batchSize,
      });
      decks.push(...chunkDecks);
      options.onPoolBatchComplete?.(decks.length, entries.length);
    }
  } else {
    decks = await variant.build(entries, {
      signal: options?.signal,
      batchSize: options?.batchSize,
    });
    options?.onPoolBatchComplete?.(decks.length, entries.length);
  }

  return evaluateDeckbuildVariant(corpus, decks, variant.id, {
    cardBenchmarkOracleIds: options?.cardBenchmarkOracleIds,
    benchmarkFamilies: options?.benchmarkFamilies,
    generatedAt: options?.generatedAt,
  });
}
