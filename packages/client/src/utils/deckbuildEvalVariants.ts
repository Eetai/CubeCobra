import type { BuiltDeck } from '@utils/datatypes/SimulationReport';

import type { DeckbuildEntry, LocalDeckbuildOptions } from './draftBot';
import { loadDraftBot, localBatchDeckbuild } from './draftBot';
import type { DeckbuildVariant } from './deckbuildEvalRunner';

type BaselineVariantDeps = {
  loadBot: (onProgress?: (pct: number) => void) => Promise<void>;
  buildDecks: (
    entries: DeckbuildEntry[],
    batchSize?: number,
    signal?: AbortSignal,
    options?: LocalDeckbuildOptions,
  ) => Promise<BuiltDeck[]>;
};

export function createLocalDeckbuildBaselineVariant(
  deps: BaselineVariantDeps = {
    loadBot: loadDraftBot,
    buildDecks: localBatchDeckbuild,
  },
): DeckbuildVariant {
  return {
    id: 'local-batch-deckbuild-baseline',
    description: 'Current browser-side localBatchDeckbuild baseline',
    build: async (entries, opts) => {
      await deps.loadBot();
      return deps.buildDecks(entries, opts?.batchSize, opts?.signal, undefined);
    },
  };
}

export function createLocalDeckbuildSeedVariant(
  seedCount: number,
  deps: BaselineVariantDeps = {
    loadBot: loadDraftBot,
    buildDecks: localBatchDeckbuild,
  },
): DeckbuildVariant {
  return {
    id: `local-batch-deckbuild-seed-${seedCount}`,
    description: `Local deckbuild variant with Phase 1 seed size ${seedCount}`,
    build: async (entries, opts) => {
      await deps.loadBot();
      return deps.buildDecks(entries, opts?.batchSize, opts?.signal, { seedCount });
    },
  };
}

export function createLocalDeckbuildSwapVariant(
  deps: BaselineVariantDeps = {
    loadBot: loadDraftBot,
    buildDecks: localBatchDeckbuild,
  },
): DeckbuildVariant {
  return {
    id: 'local-batch-deckbuild-swap-1',
    description: 'Local deckbuild variant with one post-build swap optimization pass',
    build: async (entries, opts) => {
      await deps.loadBot();
      return deps.buildDecks(entries, opts?.batchSize, opts?.signal, { postBuildSingleSwap: true });
    },
  };
}

export function createLocalDeckbuildHillClimbVariant(
  maxSwaps: number,
  deps: BaselineVariantDeps = {
    loadBot: loadDraftBot,
    buildDecks: localBatchDeckbuild,
  },
): DeckbuildVariant {
  return {
    id: `local-batch-deckbuild-hillclimb-${maxSwaps}`,
    description: `Local deckbuild variant with up to ${maxSwaps} improving post-build hill-climb swap(s)`,
    build: async (entries, opts) => {
      await deps.loadBot();
      return deps.buildDecks(entries, opts?.batchSize, opts?.signal, { maxPostBuildHillClimbSwaps: maxSwaps });
    },
  };
}

export function createLocalDeckbuildRefillVariant(
  refillSlotsPerRound: number,
  refillRounds: number = 1,
  deps: BaselineVariantDeps = {
    loadBot: loadDraftBot,
    buildDecks: localBatchDeckbuild,
  },
): DeckbuildVariant {
  return {
    id:
      refillRounds === 1
        ? `local-batch-deckbuild-refill-${refillSlotsPerRound}`
        : `local-batch-deckbuild-refill-${refillSlotsPerRound}x${refillRounds}`,
    description:
      refillRounds === 1
        ? `Local deckbuild variant with one Phase 2 refill pass over ${refillSlotsPerRound} weakest drafted nonland slot(s)`
        : `Local deckbuild variant with ${refillRounds} Phase 2 refill pass(es) over ${refillSlotsPerRound} weakest drafted nonland slot(s)`,
    build: async (entries, opts) => {
      await deps.loadBot();
      return deps.buildDecks(entries, opts?.batchSize, opts?.signal, {
        refillSlotsPerRound,
        refillRounds,
      });
    },
  };
}

export function createLocalDeckbuildTargetedRepairVariant(
  maxSwaps: number,
  topCandidates: number = 4,
  bottomMainboard: number = 6,
  deps: BaselineVariantDeps = {
    loadBot: loadDraftBot,
    buildDecks: localBatchDeckbuild,
  },
): DeckbuildVariant {
  return {
    id: `local-batch-deckbuild-targeted-repair-${maxSwaps}`,
    description: `Local deckbuild variant with up to ${maxSwaps} targeted nonland repair swap(s) from top ${topCandidates} excluded vs bottom ${bottomMainboard} included cards`,
    build: async (entries, opts) => {
      await deps.loadBot();
      return deps.buildDecks(entries, opts?.batchSize, opts?.signal, {
        targetedRepairMaxSwaps: maxSwaps,
        targetedRepairTopCandidates: topCandidates,
        targetedRepairBottomMainboard: bottomMainboard,
      });
    },
  };
}

export function createLocalDeckbuildLandTrimVariant(
  maxSwaps: number,
  deps: BaselineVariantDeps = {
    loadBot: loadDraftBot,
    buildDecks: localBatchDeckbuild,
  },
): DeckbuildVariant {
  return {
    id: `local-batch-deckbuild-land-trim-${maxSwaps}`,
    description: `Local deckbuild variant with up to ${maxSwaps} ML-guided nonbasic-land trims into basics`,
    build: async (entries, opts) => {
      await deps.loadBot();
      return deps.buildDecks(entries, opts?.batchSize, opts?.signal, {
        landTrimMaxSwaps: maxSwaps,
      });
    },
  };
}

export function createLocalDeckbuildLandTrimStableVariant(
  deps: BaselineVariantDeps = {
    loadBot: loadDraftBot,
    buildDecks: localBatchDeckbuild,
  },
): DeckbuildVariant {
  return {
    id: 'local-batch-deckbuild-land-trim-stable',
    description: 'Local deckbuild variant that keeps trimming positive-gain suspect nonbasic lands into basics until stable',
    build: async (entries, opts) => {
      await deps.loadBot();
      return deps.buildDecks(entries, opts?.batchSize, opts?.signal, {
        landTrimUntilStable: true,
      });
    },
  };
}
