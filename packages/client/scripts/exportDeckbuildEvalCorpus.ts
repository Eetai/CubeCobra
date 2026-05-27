import fs from 'fs';
import path from 'path';

import type { SimulationRunData, SimulationSetupResponse } from '@utils/datatypes/SimulationReport';

import { buildDeckbuildEvalCorpusFromSimulation } from '../src/utils/deckbuildEval';

interface Args {
  runDataPath: string;
  setupPath: string;
  outPath?: string;
  id?: string;
  description?: string;
}

function parseArgs(argv: string[]): Args {
  let runDataPath = '';
  let setupPath = '';
  let outPath: string | undefined;
  let id: string | undefined;
  let description: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--run-data') {
      runDataPath = argv[i + 1] ?? '';
      i += 1;
    } else if (arg === '--setup') {
      setupPath = argv[i + 1] ?? '';
      i += 1;
    } else if (arg === '--out') {
      outPath = argv[i + 1] ?? '';
      i += 1;
    } else if (arg === '--id') {
      id = argv[i + 1] ?? '';
      i += 1;
    } else if (arg === '--description') {
      description = argv[i + 1] ?? '';
      i += 1;
    }
  }

  if (!runDataPath) throw new Error('Missing required --run-data <path> argument');
  if (!setupPath) throw new Error('Missing required --setup <path> argument');

  return { runDataPath, setupPath, outPath, id, description };
}

function loadJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8')) as T;
}

function defaultOutPath(corpusId: string): string {
  return path.resolve(process.cwd(), 'tmp', 'deckbuild-corpora', `${corpusId}.json`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const runData = loadJsonFile<SimulationRunData>(args.runDataPath);
  const setup = loadJsonFile<SimulationSetupResponse>(args.setupPath);

  const corpus = buildDeckbuildEvalCorpusFromSimulation(runData, setup, {
    id: args.id,
    description: args.description,
  });

  const outPath = path.resolve(args.outPath ?? defaultOutPath(corpus.id));
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(corpus, null, 2) + '\n', 'utf8');
  process.stdout.write(`Wrote:\n- ${outPath}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exitCode = 1;
});
