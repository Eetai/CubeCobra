import fs from 'fs';
import path from 'path';

import { DECKBUILD_BENCHMARK_FAMILIES } from '../src/utils/deckbuildBenchmarkFamilies';
import { filterDeckbuildEvalCorpus, type DeckbuildEvalCorpus } from '../src/utils/deckbuildEval';
import { formatDeckbuildEvalMarkdown } from '../src/utils/deckbuildEvalReport';
import { evaluateDeckbuildVariantWithBuilder } from '../src/utils/deckbuildEvalRunner';
import {
  createLocalDeckbuildBaselineVariant,
  createLocalDeckbuildHillClimbVariant,
  createLocalDeckbuildLandTrimStableVariant,
  createLocalDeckbuildLandTrimVariant,
  createLocalDeckbuildRefillVariant,
  createLocalDeckbuildTargetedRepairVariant,
  createLocalDeckbuildSeedVariant,
  createLocalDeckbuildSwapVariant,
} from '../src/utils/deckbuildEvalVariants';

const DEFAULT_MODEL_BASE_URL = 'https://cubecobra-public.s3.us-east-2.amazonaws.com';
const POWER_MOX_NAMES = ['Mox Pearl', 'Mox Sapphire', 'Mox Jet', 'Mox Ruby', 'Mox Emerald'];

function parseArgs(argv: string[]): {
  corpus: string;
  outdir?: string;
  poolLimit?: number;
  poolBatchSize?: number;
  filterFamily?: string;
  filterCardNames?: string[];
  variant?: string;
} {
  let corpus = '';
  let outdir: string | undefined;
  let poolLimit: number | undefined;
  let poolBatchSize: number | undefined;
  let filterFamily: string | undefined;
  let filterCardNames: string[] | undefined;
  let variant: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--corpus') {
      corpus = argv[i + 1] ?? '';
      i += 1;
    } else if (arg === '--outdir') {
      outdir = argv[i + 1] ?? '';
      i += 1;
    } else if (arg === '--pool-limit') {
      poolLimit = parseInt(argv[i + 1] ?? '', 10);
      i += 1;
    } else if (arg === '--pool-batch-size') {
      poolBatchSize = parseInt(argv[i + 1] ?? '', 10);
      i += 1;
    } else if (arg === '--filter-family') {
      filterFamily = argv[i + 1] ?? '';
      i += 1;
    } else if (arg === '--filter-card-names') {
      filterCardNames = (argv[i + 1] ?? '')
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);
      i += 1;
    } else if (arg === '--variant') {
      variant = argv[i + 1] ?? '';
      i += 1;
    }
  }
  if (!corpus) {
    throw new Error('Missing required --corpus <id-or-path> argument');
  }
  return { corpus, outdir, poolLimit, poolBatchSize, filterFamily, filterCardNames, variant };
}

function resolveCorpusPath(corpusArg: string): string {
  if (path.isAbsolute(corpusArg)) return corpusArg;
  if (corpusArg.endsWith('.json')) return path.resolve(corpusArg);
  return path.resolve(__dirname, '../test/data/deckbuild-corpora', `${corpusArg}.json`);
}

function loadCorpus(corpusArg: string): DeckbuildEvalCorpus {
  const corpusPath = resolveCorpusPath(corpusArg);
  return JSON.parse(fs.readFileSync(corpusPath, 'utf8')) as DeckbuildEvalCorpus;
}

function defaultOutdir(corpusId: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.resolve(process.cwd(), 'tmp', 'deckbuild-eval', `${corpusId}-${timestamp}`);
}

function findOracleIdsByCardNames(corpus: DeckbuildEvalCorpus, names: string[]): string[] {
  const wanted = new Set(names);
  return Object.entries(corpus.cardMeta)
    .filter(([, meta]) => wanted.has(meta.name))
    .map(([oracleId]) => oracleId);
}

function createVariant(variantArg?: string) {
  if (!variantArg || variantArg === 'baseline') return createLocalDeckbuildBaselineVariant();
  if (variantArg === 'swap-1') return createLocalDeckbuildSwapVariant();
  if (variantArg === 'land-trim-stable') return createLocalDeckbuildLandTrimStableVariant();
  const landTrimMatch = variantArg.match(/^land-trim-(\d+)$/);
  if (landTrimMatch) {
    return createLocalDeckbuildLandTrimVariant(parseInt(landTrimMatch[1]!, 10));
  }
  const targetedRepairMatch = variantArg.match(/^targeted-repair-(\d+)$/);
  if (targetedRepairMatch) {
    return createLocalDeckbuildTargetedRepairVariant(parseInt(targetedRepairMatch[1]!, 10));
  }
  const refillMatch = variantArg.match(/^refill-(\d+)(?:x(\d+))?$/);
  if (refillMatch) {
    return createLocalDeckbuildRefillVariant(
      parseInt(refillMatch[1]!, 10),
      refillMatch[2] ? parseInt(refillMatch[2], 10) : 1,
    );
  }
  const hillClimbMatch = variantArg.match(/^hillclimb-(\d+)$/);
  if (hillClimbMatch) {
    return createLocalDeckbuildHillClimbVariant(parseInt(hillClimbMatch[1]!, 10));
  }
  const seedMatch = variantArg.match(/^seed-(\d+)$/);
  if (seedMatch) {
    return createLocalDeckbuildSeedVariant(parseInt(seedMatch[1]!, 10));
  }
  throw new Error(`Unknown variant: ${variantArg}`);
}

async function main(): Promise<void> {
  if (!process.env.CDN_BASE_URL) {
    process.env.CDN_BASE_URL = DEFAULT_MODEL_BASE_URL;
  }

  const { corpus: corpusArg, outdir, poolLimit, poolBatchSize, filterFamily, filterCardNames, variant: variantArg } = parseArgs(process.argv.slice(2));
  const loadedCorpus = loadCorpus(corpusArg);
  const selectedFamily = filterFamily
    ? DECKBUILD_BENCHMARK_FAMILIES.find((family) => family.key === filterFamily)
    : undefined;
  if (filterFamily && !selectedFamily) {
    throw new Error(`Unknown benchmark family: ${filterFamily}`);
  }
  const filteredCorpus =
    selectedFamily || (filterCardNames && filterCardNames.length > 0)
      ? filterDeckbuildEvalCorpus(loadedCorpus, {
          benchmarkFamily: selectedFamily,
          cardNames: filterCardNames,
        })
      : loadedCorpus;
  const corpus =
    poolLimit && poolLimit > 0 && poolLimit < filteredCorpus.pools.length
      ? { ...filteredCorpus, id: `${filteredCorpus.id}-first-${poolLimit}`, pools: filteredCorpus.pools.slice(0, poolLimit) }
      : filteredCorpus;
  const variant = createVariant(variantArg);
  const moxOracleIds = findOracleIdsByCardNames(corpus, POWER_MOX_NAMES);
  process.stdout.write(
    `Evaluating ${corpus.pools.length} pool(s) from corpus ${corpus.id}${poolBatchSize ? ` in batches of ${poolBatchSize}` : ''}...\n`,
  );
  const result = await evaluateDeckbuildVariantWithBuilder(corpus, variant, {
    poolBatchSize,
    onPoolBatchComplete: (donePools, totalPools) => {
      process.stdout.write(`Built decks for ${donePools}/${totalPools} pool(s)\n`);
    },
    cardBenchmarkOracleIds: moxOracleIds,
    benchmarkFamilies: DECKBUILD_BENCHMARK_FAMILIES,
  });

  const outputDir = outdir ? path.resolve(outdir) : defaultOutdir(corpus.id);
  fs.mkdirSync(outputDir, { recursive: true });

  const jsonPath = path.join(outputDir, `${variant.id}.json`);
  const markdownPath = path.join(outputDir, `${variant.id}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
  fs.writeFileSync(markdownPath, formatDeckbuildEvalMarkdown(result), 'utf8');

  process.stdout.write(`Wrote:\n- ${jsonPath}\n- ${markdownPath}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exitCode = 1;
});
