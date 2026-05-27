import fs from 'fs';
import path from 'path';

import type { DeckbuildEvalCorpus } from '../src/utils/deckbuildEval';
import type { DeckbuildEntry } from '../src/utils/draftBot';
import { loadDraftBot, localBatchDeckbuild } from '../src/utils/draftBot';

const DEFAULT_MODEL_BASE_URL = 'https://cubecobra-public.s3.us-east-2.amazonaws.com';

function parseArgs(argv: string[]): { corpus: string } {
  let corpus = '';
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--corpus') {
      corpus = argv[i + 1] ?? '';
      i += 1;
    }
  }
  if (!corpus) throw new Error('Missing required --corpus <path> argument');
  return { corpus };
}

function loadCorpus(corpusArg: string): DeckbuildEvalCorpus {
  const corpusPath = path.isAbsolute(corpusArg) ? corpusArg : path.resolve(corpusArg);
  return JSON.parse(fs.readFileSync(corpusPath, 'utf8')) as DeckbuildEvalCorpus;
}

function buildEntries(corpus: DeckbuildEvalCorpus): DeckbuildEntry[] {
  return corpus.pools.map((pool) => ({
    pool: pool.pool,
    cardMeta: corpus.cardMeta,
    basics: corpus.basics,
    maxSpells: corpus.deckbuildSpells,
    maxLands: corpus.deckbuildLands,
  }));
}

function nameFor(corpus: DeckbuildEvalCorpus, oracleId: string): string {
  return corpus.cardMeta[oracleId]?.name ?? corpus.basics.find((basic) => basic.oracleId === oracleId)?.name ?? oracleId;
}

async function main(): Promise<void> {
  if (!process.env.CDN_BASE_URL) process.env.CDN_BASE_URL = DEFAULT_MODEL_BASE_URL;

  const { corpus: corpusArg } = parseArgs(process.argv.slice(2));
  const corpus = loadCorpus(corpusArg);
  const entries = buildEntries(corpus);

  await loadDraftBot();

  const baseline = await localBatchDeckbuild(entries, 32);
  const hillclimb = await localBatchDeckbuild(entries, 32, undefined, {
    maxPostBuildHillClimbSwaps: 3,
    recordOptimizationTrace: true,
  });

  for (let i = 0; i < corpus.pools.length; i += 1) {
    const pool = corpus.pools[i]!;
    const baselineDeck = baseline[i]!;
    const hillclimbDeck = hillclimb[i]!;
    const rubyOracle = pool.pool.find((oracleId) => corpus.cardMeta[oracleId]?.name === 'Mox Ruby');
    const rubyInBaseline = rubyOracle ? baselineDeck.mainboard.includes(rubyOracle) : false;
    const rubyInHillclimb = rubyOracle ? hillclimbDeck.mainboard.includes(rubyOracle) : false;

    process.stdout.write(`\n## ${pool.id}\n`);
    process.stdout.write(`Baseline Ruby included: ${rubyInBaseline}\n`);
    process.stdout.write(`Hillclimb-3 Ruby included: ${rubyInHillclimb}\n`);
    process.stdout.write(`Accepted swaps:\n`);
    for (const step of hillclimbDeck.optimizationTrace ?? []) {
      process.stdout.write(
        `- [${step.step}] add ${nameFor(corpus, step.addOracle)} / cut ${nameFor(corpus, step.cutOracle)} / gain ${Number.isFinite(step.gain) ? step.gain.toFixed(3) : 'n/a'}\n`,
      );
    }
    process.stdout.write('\nFinal mainboard-only additions vs baseline:\n');
    const baselineSet = new Set(baselineDeck.mainboard);
    const added = hillclimbDeck.mainboard.filter((oracle) => !baselineSet.has(oracle));
    for (const oracle of added) process.stdout.write(`- ${nameFor(corpus, oracle)}\n`);
  }
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exitCode = 1;
});
