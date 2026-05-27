import fs from 'fs';
import path from 'path';

import { DECKBUILD_BENCHMARK_FAMILIES } from '../src/utils/deckbuildBenchmarkFamilies';
import {
  collectDeckbuildMissCases,
  filterDeckbuildEvalCorpus,
  type DeckbuildBenchmarkFamily,
  type DeckbuildEvalCorpus,
} from '../src/utils/deckbuildEval';
import { buildDeckbuildEntriesFromCorpus } from '../src/utils/deckbuildEvalRunner';
import { loadDraftBot, localBatchDeckbuild } from '../src/utils/draftBot';

const DEFAULT_MODEL_BASE_URL = 'https://cubecobra-public.s3.us-east-2.amazonaws.com';
const POWER_MOX_NAMES = ['Mox Pearl', 'Mox Sapphire', 'Mox Jet', 'Mox Ruby', 'Mox Emerald'];

interface Args {
  corpus: string;
  outdir?: string;
  poolLimit?: number;
  poolBatchSize?: number;
  filterFamily?: string;
}

function parseArgs(argv: string[]): Args {
  let corpus = '';
  let outdir: string | undefined;
  let poolLimit: number | undefined;
  let poolBatchSize: number | undefined;
  let filterFamily: string | undefined;
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
    }
  }
  if (!corpus) throw new Error('Missing required --corpus <id-or-path> argument');
  return { corpus, outdir, poolLimit, poolBatchSize, filterFamily };
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
  return path.resolve(process.cwd(), 'tmp', 'deckbuild-audit', `${corpusId}-${timestamp}`);
}

function findOracleIdsByCardNames(corpus: DeckbuildEvalCorpus, names: string[]): string[] {
  const wanted = new Set(names);
  return Object.entries(corpus.cardMeta)
    .filter(([, meta]) => wanted.has(meta.name))
    .map(([oracleId]) => oracleId);
}

async function main(): Promise<void> {
  if (!process.env.CDN_BASE_URL) {
    process.env.CDN_BASE_URL = DEFAULT_MODEL_BASE_URL;
  }

  const { corpus: corpusArg, outdir, poolLimit, poolBatchSize, filterFamily } = parseArgs(process.argv.slice(2));
  const loadedCorpus = loadCorpus(corpusArg);
  const selectedFamily = filterFamily
    ? DECKBUILD_BENCHMARK_FAMILIES.find((family) => family.key === filterFamily)
    : undefined;
  if (filterFamily && !selectedFamily) throw new Error(`Unknown benchmark family: ${filterFamily}`);

  const filteredCorpus = filterDeckbuildEvalCorpus(loadedCorpus, {
    benchmarkFamily: selectedFamily,
  });
  const corpus =
    poolLimit && poolLimit > 0 && poolLimit < filteredCorpus.pools.length
      ? { ...filteredCorpus, id: `${filteredCorpus.id}-first-${poolLimit}`, pools: filteredCorpus.pools.slice(0, poolLimit) }
      : filteredCorpus;

  const moxOracleIds = findOracleIdsByCardNames(corpus, POWER_MOX_NAMES);
  const entries = buildDeckbuildEntriesFromCorpus(corpus);
  const decks = [];

  process.stdout.write(
    `Auditing ${corpus.pools.length} pool(s) from corpus ${corpus.id}${poolBatchSize ? ` in batches of ${poolBatchSize}` : ''}...\n`,
  );

  await loadDraftBot();
  const batchSize = poolBatchSize && poolBatchSize > 0 ? poolBatchSize : entries.length;
  for (let start = 0; start < entries.length; start += batchSize) {
    const chunk = entries.slice(start, start + batchSize);
    const chunkDecks = await localBatchDeckbuild(chunk, undefined, undefined, new Set(moxOracleIds));
    decks.push(...chunkDecks);
    process.stdout.write(`Built decks for ${decks.length}/${entries.length} pool(s)\n`);
  }

  const misses = collectDeckbuildMissCases(corpus, decks, {
    cardBenchmarkOracleIds: moxOracleIds,
    benchmarkFamily: selectedFamily as DeckbuildBenchmarkFamily | undefined,
  });

  const outputDir = outdir ? path.resolve(outdir) : defaultOutdir(corpus.id);
  fs.mkdirSync(outputDir, { recursive: true });

  const jsonPath = path.join(outputDir, 'miss-cases.json');
  const markdownPath = path.join(outputDir, 'miss-cases.md');

  fs.writeFileSync(jsonPath, JSON.stringify(misses, null, 2) + '\n', 'utf8');
  const md = [
    '# Deckbuild Miss Cases',
    '',
    `- Corpus: \`${corpus.id}\``,
    `- Cases: ${misses.length}`,
    '',
    '| Card | Pool | Expected Colors | Phase 1 Rank | Phase 1 Rating | Phase 2 Best Rank | Gap To Pick | Considered | Top 10 Hits | Final Rank | Top Seed Cards |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
    ...misses.map((miss) =>
      `| ${miss.benchmarkLabel} | ${miss.poolId} | ${(miss.expectedMainColors ?? []).join('') || 'C'} | ${miss.phase1Rank ?? '—'} | ${miss.phase1Rating?.toFixed(3) ?? '—'} | ${miss.phase2BestRank ?? '—'} | ${miss.phase2BestGapToPick?.toFixed(3) ?? '—'} | ${miss.phase2TimesConsidered} | ${miss.phase2TimesTop10} | ${miss.phase2FinalRank ?? '—'} | ${miss.topSeedCards.join(', ')} |`,
    ),
    '',
  ].join('\n');
  fs.writeFileSync(markdownPath, md, 'utf8');

  process.stdout.write(`Wrote:\n- ${jsonPath}\n- ${markdownPath}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exitCode = 1;
});
