import fs from 'fs';
import path from 'path';

import { DECKBUILD_BENCHMARK_FAMILIES } from '../src/utils/deckbuildBenchmarkFamilies';
import { filterDeckbuildEvalCorpus, type DeckbuildEvalCorpus, type DeckbuildEvalResult } from '../src/utils/deckbuildEval';
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
const DEFAULT_VARIANTS = ['baseline', 'seed-6', 'seed-8', 'swap-1'];

interface Args {
  corpus: string;
  outdir?: string;
  poolLimit?: number;
  poolBatchSize?: number;
  filterFamily?: string;
  filterCardNames?: string[];
  variants: string[];
}

interface SummaryRow {
  variant: string;
  runtimeMs: number;
  status: 'ok' | 'failed';
  error?: string;
  numPools?: number;
  deckSizeFailures?: number;
  familyFastManaRate?: number;
  moxPearlRate?: number;
  moxSapphireRate?: number;
  moxJetRate?: number;
  moxRubyRate?: number;
  moxEmeraldRate?: number;
}

function parseArgs(argv: string[]): Args {
  let corpus = '';
  let outdir: string | undefined;
  let poolLimit: number | undefined;
  let poolBatchSize: number | undefined;
  let filterFamily: string | undefined;
  let filterCardNames: string[] | undefined;
  let variants: string[] = DEFAULT_VARIANTS;
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
    } else if (arg === '--variants') {
      variants = (argv[i + 1] ?? '')
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);
      i += 1;
    }
  }
  if (!corpus) throw new Error('Missing required --corpus <id-or-path> argument');
  return { corpus, outdir, poolLimit, poolBatchSize, filterFamily, filterCardNames, variants };
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
  return path.resolve(process.cwd(), 'tmp', 'deckbuild-eval-matrix', `${corpusId}-${timestamp}`);
}

function findOracleIdsByCardNames(corpus: DeckbuildEvalCorpus, names: string[]): string[] {
  const wanted = new Set(names);
  return Object.entries(corpus.cardMeta)
    .filter(([, meta]) => wanted.has(meta.name))
    .map(([oracleId]) => oracleId);
}

function createVariant(variantArg: string) {
  if (variantArg === 'baseline') return createLocalDeckbuildBaselineVariant();
  if (variantArg === 'swap-1') return createLocalDeckbuildSwapVariant();
  if (variantArg === 'land-trim-stable') return createLocalDeckbuildLandTrimStableVariant();
  const landTrimMatch = variantArg.match(/^land-trim-(\d+)$/);
  if (landTrimMatch) return createLocalDeckbuildLandTrimVariant(parseInt(landTrimMatch[1]!, 10));
  const targetedRepairMatch = variantArg.match(/^targeted-repair-(\d+)$/);
  if (targetedRepairMatch) return createLocalDeckbuildTargetedRepairVariant(parseInt(targetedRepairMatch[1]!, 10));
  const refillMatch = variantArg.match(/^refill-(\d+)(?:x(\d+))?$/);
  if (refillMatch) {
    return createLocalDeckbuildRefillVariant(
      parseInt(refillMatch[1]!, 10),
      refillMatch[2] ? parseInt(refillMatch[2], 10) : 1,
    );
  }
  const hillClimbMatch = variantArg.match(/^hillclimb-(\d+)$/);
  if (hillClimbMatch) return createLocalDeckbuildHillClimbVariant(parseInt(hillClimbMatch[1]!, 10));
  const seedMatch = variantArg.match(/^seed-(\d+)$/);
  if (seedMatch) return createLocalDeckbuildSeedVariant(parseInt(seedMatch[1]!, 10));
  throw new Error(`Unknown variant: ${variantArg}`);
}

function familyRate(result: DeckbuildEvalResult, familyKey: string): number | undefined {
  return result.familyBenchmarks.find((entry) => entry.key === familyKey)?.mainboardRate;
}

function cardRate(result: DeckbuildEvalResult, label: string): number | undefined {
  return result.cardBenchmarks.find((entry) => entry.label === label)?.mainboardRate;
}

function formatPct(value?: number): string {
  return value === undefined ? '—' : `${(value * 100).toFixed(1)}%`;
}

function writeSummary(outdir: string, rows: SummaryRow[]): void {
  const csvLines = [
    'variant,status,runtime_ms,pools,deck_size_failures,fast_mana_rate,mox_pearl_rate,mox_sapphire_rate,mox_jet_rate,mox_ruby_rate,mox_emerald_rate,error',
    ...rows.map((row) =>
      [
        row.variant,
        row.status,
        row.runtimeMs,
        row.numPools ?? '',
        row.deckSizeFailures ?? '',
        row.familyFastManaRate ?? '',
        row.moxPearlRate ?? '',
        row.moxSapphireRate ?? '',
        row.moxJetRate ?? '',
        row.moxRubyRate ?? '',
        row.moxEmeraldRate ?? '',
        JSON.stringify(row.error ?? ''),
      ].join(','),
    ),
  ].join('\n');

  const md = [
    '# Deckbuild Eval Matrix Summary',
    '',
    '| Variant | Status | Runtime | Pools | Deck Size Failures | Fast Mana | Mox Pearl | Mox Sapphire | Mox Jet | Mox Ruby | Mox Emerald |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...rows.map(
      (row) =>
        `| ${row.variant} | ${row.status} | ${(row.runtimeMs / 1000).toFixed(1)}s | ${row.numPools ?? '—'} | ${row.deckSizeFailures ?? '—'} | ${formatPct(row.familyFastManaRate)} | ${formatPct(row.moxPearlRate)} | ${formatPct(row.moxSapphireRate)} | ${formatPct(row.moxJetRate)} | ${formatPct(row.moxRubyRate)} | ${formatPct(row.moxEmeraldRate)} |`,
    ),
    '',
    ...rows
      .filter((row) => row.error)
      .map((row) => `- ${row.variant}: ${row.error}`),
    '',
  ].join('\n');

  fs.writeFileSync(path.join(outdir, 'summary.csv'), csvLines + '\n', 'utf8');
  fs.writeFileSync(path.join(outdir, 'summary.md'), md, 'utf8');
}

async function main(): Promise<void> {
  if (!process.env.CDN_BASE_URL) process.env.CDN_BASE_URL = DEFAULT_MODEL_BASE_URL;

  const { corpus: corpusArg, outdir, poolLimit, poolBatchSize, filterFamily, filterCardNames, variants } = parseArgs(
    process.argv.slice(2),
  );
  const loadedCorpus = loadCorpus(corpusArg);
  const selectedFamily = filterFamily
    ? DECKBUILD_BENCHMARK_FAMILIES.find((family) => family.key === filterFamily)
    : undefined;
  if (filterFamily && !selectedFamily) throw new Error(`Unknown benchmark family: ${filterFamily}`);

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
  const moxOracleIds = findOracleIdsByCardNames(corpus, POWER_MOX_NAMES);
  const outputDir = outdir ? path.resolve(outdir) : defaultOutdir(corpus.id);
  fs.mkdirSync(outputDir, { recursive: true });

  const rows: SummaryRow[] = [];
  writeSummary(outputDir, rows);

  for (const variantName of variants) {
    const started = Date.now();
    process.stdout.write(`\n=== Variant ${variantName} ===\n`);
    try {
      const variant = createVariant(variantName);
      const result = await evaluateDeckbuildVariantWithBuilder(corpus, variant, {
        poolBatchSize,
        onPoolBatchComplete: (donePools, totalPools) => {
          process.stdout.write(`[${variantName}] Built decks for ${donePools}/${totalPools} pool(s)\n`);
        },
        cardBenchmarkOracleIds: moxOracleIds,
        benchmarkFamilies: DECKBUILD_BENCHMARK_FAMILIES,
      });

      const variantOutdir = path.join(outputDir, variant.id);
      fs.mkdirSync(variantOutdir, { recursive: true });
      fs.writeFileSync(path.join(variantOutdir, `${variant.id}.json`), JSON.stringify(result, null, 2) + '\n', 'utf8');
      fs.writeFileSync(path.join(variantOutdir, `${variant.id}.md`), formatDeckbuildEvalMarkdown(result), 'utf8');

      rows.push({
        variant: variant.id,
        status: 'ok',
        runtimeMs: Date.now() - started,
        numPools: result.aggregate.numPools,
        deckSizeFailures: result.aggregate.deckSizeFailures,
        familyFastManaRate: familyRate(result, 'power-fast-mana'),
        moxPearlRate: cardRate(result, 'Mox Pearl'),
        moxSapphireRate: cardRate(result, 'Mox Sapphire'),
        moxJetRate: cardRate(result, 'Mox Jet'),
        moxRubyRate: cardRate(result, 'Mox Ruby'),
        moxEmeraldRate: cardRate(result, 'Mox Emerald'),
      });
      writeSummary(outputDir, rows);
      process.stdout.write(`Wrote ${variant.id} outputs to ${variantOutdir}\n`);
    } catch (err) {
      rows.push({
        variant: variantName,
        status: 'failed',
        runtimeMs: Date.now() - started,
        error: err instanceof Error ? err.message : String(err),
      });
      writeSummary(outputDir, rows);
      process.stderr.write(`Variant ${variantName} failed: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
    }
  }

  process.stdout.write(`\nSummary:\n- ${path.join(outputDir, 'summary.md')}\n- ${path.join(outputDir, 'summary.csv')}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exitCode = 1;
});
