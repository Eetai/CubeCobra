import type { DeckbuildEvalResult } from './deckbuildEval';

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function renderBenchmarkTable<T extends { key: string; draftedCount: number; mainboardCount: number; sideboardCount: number; omittedCount: number; mainboardRate: number }>(
  title: string,
  rows: T[],
  labelFor: (row: T) => string,
): string {
  if (rows.length === 0) return `## ${title}\n\n_No entries._\n`;

  const header = '| Benchmark | Drafted | Mainboard | Sideboard | Omitted | Mainboard Rate |\n| --- | ---: | ---: | ---: | ---: | ---: |';
  const body = rows
    .map(
      (row) =>
        `| ${labelFor(row)} | ${row.draftedCount} | ${row.mainboardCount} | ${row.sideboardCount} | ${row.omittedCount} | ${formatPct(row.mainboardRate)} |`,
    )
    .join('\n');

  return `## ${title}\n\n${header}\n${body}\n`;
}

export function formatDeckbuildEvalMarkdown(result: DeckbuildEvalResult): string {
  const { aggregate } = result;
  const lines = [
    `# Deckbuild Eval: ${result.variantId}`,
    '',
    `- Corpus: \`${result.corpusId}\``,
    `- Generated: ${result.generatedAt}`,
    '',
    '## Aggregate',
    '',
    `- Pools: ${aggregate.numPools}`,
    `- Deck size failures: ${aggregate.deckSizeFailures}`,
    `- Avg mainboard size: ${aggregate.avgMainboardSize.toFixed(2)}`,
    `- Avg sideboard size: ${aggregate.avgSideboardSize.toFixed(2)}`,
    `- Avg mainboard CMC: ${aggregate.avgMainboardCmc.toFixed(2)}`,
    `- Avg mainboard nonbasic count: ${aggregate.avgMainboardNonbasicCount.toFixed(2)}`,
    '',
    renderBenchmarkTable('Card Benchmarks', result.cardBenchmarks, (row) => row.label),
    '',
    renderBenchmarkTable('Family Benchmarks', result.familyBenchmarks, (row) => row.description),
  ];
  return lines.join('\n').trimEnd() + '\n';
}
