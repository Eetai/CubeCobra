/* eslint-disable camelcase */
import React, { useEffect, useRef, useState } from 'react';

import type {
  BuiltDeck,
  CardMeta,
  SimulatedPickCard,
  SimulatedPool,
  SimulationRunData,
} from '@utils/datatypes/SimulationReport';

import { Modal, ModalBody, ModalHeader } from '../base/Modal';
import { Flexbox } from '../base/Layout';
import Button from '../base/Button';
import Select from '../base/Select';
import Text from '../base/Text';
import SimDeckView from './SimDeckView';
import SimulatorPickBreakdown, { PickCard } from './SimulatorPickBreakdown';
import { DeckbuildEntry, loadDraftBot, localBatchDeckbuild } from '../../utils/draftBot';

type PoolViewMode = 'pool' | 'deck' | 'fullPickOrder' | 'deckbuildDebug';

const DECKBUILD_DEBUG_STRATEGY_OPTIONS = [
  { value: 'baseline', label: 'Default deckbuilder' },
  { value: 'targeted-repair-2', label: 'Targeted Repair-2' },
  { value: 'land-trim-2', label: 'Land Trim-2' },
  { value: 'land-trim-stable', label: 'Land Trim-Stable' },
  { value: 'hillclimb-3', label: 'Hillclimb-3' },
];

export const ViewToggle: React.FC<{
  mode: PoolViewMode;
  onChange: (m: PoolViewMode) => void;
  hasDeck: boolean;
  hasFullPickOrder: boolean;
  hasDeckbuildDebug: boolean;
  deckLoading?: boolean;
}> = ({ mode, onChange, hasDeck, hasFullPickOrder, hasDeckbuildDebug, deckLoading }) => (
  <Flexbox direction="row" gap="1" className="rounded-lg border border-border/70 bg-bg-accent/50 p-1">
    {(['deck', 'pool', 'fullPickOrder', 'deckbuildDebug'] as const).map((m) => (
      <button
        key={m}
        type="button"
        disabled={
          (m === 'deck' && !hasDeck) ||
          (m === 'fullPickOrder' && !hasFullPickOrder) ||
          (m === 'deckbuildDebug' && !hasDeckbuildDebug)
        }
        onClick={() => onChange(m)}
        className={[
          'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
          mode === m
            ? 'bg-link text-white shadow-sm'
            : 'bg-transparent text-text-secondary hover:bg-bg-active hover:text-text',
          ((m === 'deck' && !hasDeck) ||
            (m === 'fullPickOrder' && !hasFullPickOrder) ||
            (m === 'deckbuildDebug' && !hasDeckbuildDebug))
            ? 'opacity-40 cursor-not-allowed hover:bg-transparent hover:text-text-secondary'
            : '',
        ].join(' ')}
      >
        {m === 'deck'
          ? (deckLoading ? 'Building…' : 'Deck')
          : m === 'pool'
            ? 'Pick Order'
            : m === 'fullPickOrder'
              ? 'Full pick order'
              : 'Deckbuild Debug'}
      </button>
    ))}
  </Flexbox>
);

const DebugCardRow: React.FC<{
  label: string;
  oracle: string;
  cardMeta: Record<string, CardMeta>;
  rating?: number;
}> = ({ label, oracle, cardMeta, rating }) => {
  const meta = cardMeta[oracle];
  return (
    <div className="flex items-center gap-3 rounded border border-border/70 bg-bg-accent/30 px-2 py-1.5">
      <Text xs className="w-10 shrink-0 text-text-secondary">
        {label}
      </Text>
      {meta?.imageUrl ? (
        <img
          src={meta.imageUrl}
          alt={meta.name}
          className="h-12 w-9 rounded object-cover border border-black/10 shrink-0"
        />
      ) : (
        <div className="h-12 w-9 rounded border border-border/70 bg-bg shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <Text sm className="truncate">
          {meta?.name ?? oracle}
        </Text>
        <Text xs className="text-text-secondary truncate">
          {meta?.type ?? 'Unknown'}
        </Text>
      </div>
      {rating !== undefined && Number.isFinite(rating) && (
        <Text xs className="shrink-0 text-text-secondary">
          {rating.toFixed(3)}
        </Text>
      )}
    </div>
  );
};

const DebugRepairEvaluationRow: React.FC<{
  label: string;
  candidateOracle: string;
  replacementOracle: string;
  cardMeta: Record<string, CardMeta>;
  candidateRating: number;
  replacementRating: number;
  gain: number;
  applied: boolean;
  savedByRedraft?: boolean;
  redraftPickOracle?: string;
  redraftBeatenByOracles?: string[];
}> = ({
  label,
  candidateOracle,
  replacementOracle,
  cardMeta,
  candidateRating,
  replacementRating,
  gain,
  applied,
  savedByRedraft,
  redraftPickOracle,
  redraftBeatenByOracles,
}) => (
  <div className="rounded border border-border/70 bg-bg-accent/30 px-3 py-2">
    <div className="flex items-center justify-between gap-3">
      <Text xs className="text-text-secondary">{label}</Text>
      <Text xs className={applied ? 'text-green-300' : savedByRedraft ? 'text-link' : gain > 0 ? 'text-link' : 'text-text-secondary'}>
        {applied ? 'cut' : savedByRedraft ? 'saved by redraft' : gain > 0 ? 'candidate' : 'kept'} · +{gain.toFixed(3)}
      </Text>
    </div>
    <Text sm>{cardMeta[candidateOracle]?.name ?? candidateOracle}</Text>
    <Text xs className="text-text-secondary">
      vs {cardMeta[replacementOracle]?.name ?? replacementOracle}
    </Text>
    <Text xs className="text-text-secondary">
      {cardMeta[candidateOracle]?.name ?? candidateOracle}: {candidateRating.toFixed(3)} → {cardMeta[replacementOracle]?.name ?? replacementOracle}: {replacementRating.toFixed(3)}
    </Text>
    {savedByRedraft ? (
      <Text xs className="text-text-secondary">
        Saved by redraft
      </Text>
    ) : redraftBeatenByOracles && redraftBeatenByOracles.length > 0 ? (
      <Text xs className="text-text-secondary">
        Picked over by {redraftBeatenByOracles.map((oracle) => cardMeta[oracle]?.name ?? oracle).join(', ')}
      </Text>
    ) : redraftPickOracle && redraftPickOracle !== candidateOracle ? (
      <Text xs className="text-text-secondary">
        Picked over by {cardMeta[redraftPickOracle]?.name ?? redraftPickOracle}
      </Text>
    ) : null}
  </div>
);

const DeckbuildDebugContent: React.FC<{
  pool: SimulatedPool;
  cardMeta: Record<string, CardMeta>;
  runData: SimulationRunData;
}> = ({ pool, cardMeta, runData }) => {
  const [strategy, setStrategy] = useState(runData.setupData?.deckbuildVariant ?? 'baseline');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugDeck, setDebugDeck] = useState<BuiltDeck | null>(null);

  useEffect(() => {
    setStrategy(runData.setupData?.deckbuildVariant ?? 'baseline');
    setDebugDeck(null);
    setError(null);
  }, [pool.poolIndex, runData.setupData?.deckbuildVariant]);

  const runDebugBuild = async () => {
    if (!runData.setupData) {
      setError('Deckbuild debug is unavailable for this saved run.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await loadDraftBot();
      const entry: DeckbuildEntry = {
        pool: pool.picks.map((pick) => pick.oracle_id),
        cardMeta,
        basics: runData.setupData.basics,
        maxSpells: runData.setupData.deckbuildSpells,
        maxLands: runData.setupData.deckbuildLands,
      };
      const options =
        strategy === 'hillclimb-3'
          ? { maxPostBuildHillClimbSwaps: 3, recordOptimizationTrace: true, recordDetailedTrace: true }
          : strategy === 'land-trim-stable'
            ? { landTrimUntilStable: true, recordOptimizationTrace: true, recordDetailedTrace: true }
          : strategy === 'land-trim-2'
            ? { landTrimMaxSwaps: 2, recordOptimizationTrace: true, recordDetailedTrace: true }
          : strategy === 'targeted-repair-2'
            ? {
                targetedRepairMaxSwaps: 2,
                targetedRepairTopCandidates: 4,
                targetedRepairBottomMainboard: 6,
                recordOptimizationTrace: true,
                recordDetailedTrace: true,
              }
            : { recordOptimizationTrace: true, recordDetailedTrace: true };
      const [deck] = await localBatchDeckbuild([entry], 32, undefined, options);
      setDebugDeck(deck ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!runData.setupData) return;
    void runDebugBuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool.poolIndex, strategy, runData.setupData]);

  if (!runData.setupData) {
    return (
      <div className="p-4">
        <Text sm className="text-text-secondary">
          Deckbuild debug is unavailable for this run because the saved setup data is missing.
        </Text>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex flex-col gap-1.5 min-w-[220px]">
          <label className="text-xs font-medium text-text-secondary" htmlFor="deckbuildDebugStrategy">
            Strategy
          </label>
          <Select id="deckbuildDebugStrategy" options={DECKBUILD_DEBUG_STRATEGY_OPTIONS} value={strategy} setValue={setStrategy} />
        </div>
        <Button type="button" onClick={() => void runDebugBuild()} disabled={loading}>
          {loading ? 'Running…' : 'Rerun'}
        </Button>
      </div>

      {error && (
        <div className="rounded border border-red-700/40 bg-red-900/10 px-3 py-2">
          <Text sm className="text-red-200">{error}</Text>
        </div>
      )}

      {!debugDeck ? null : (
        <>
          {(strategy === 'land-trim-2' || strategy === 'land-trim-stable') && debugDeck.repairEvaluationTrace?.length ? (
            <div className="flex flex-col gap-2">
              <Text sm semibold>Land Trim Review</Text>
              {debugDeck.repairEvaluationTrace
                .filter((step) => step.strategy === strategy)
                .map((step, index) => (
                  <DebugRepairEvaluationRow
                    key={`land-review-${step.step}-${step.candidateOracle}-${step.replacementOracle}`}
                    label={`#${index + 1} · pass ${step.step}`}
                    candidateOracle={step.candidateOracle}
                    replacementOracle={step.replacementOracle}
                    cardMeta={cardMeta}
                    candidateRating={step.candidateRating}
                    replacementRating={step.replacementRating}
                    gain={step.gain}
                    applied={step.applied}
                    savedByRedraft={step.savedByRedraft}
                    redraftPickOracle={step.redraftPickOracle}
                    redraftBeatenByOracles={step.redraftBeatenByOracles}
                  />
                ))}
            </div>
          ) : null}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Text sm semibold>Phase 1 Seed</Text>
              {debugDeck.deckbuildTrace?.phase1Seed.length ? (
                debugDeck.deckbuildTrace.phase1Seed.map((step) => (
                  <DebugCardRow
                    key={`p1-${step.step}-${step.oracle}`}
                    label={`#${step.step}`}
                    oracle={step.oracle}
                    cardMeta={cardMeta}
                    rating={step.rating}
                  />
                ))
              ) : (
                <Text xs className="text-text-secondary">No phase 1 seed trace.</Text>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Text sm semibold>Phase 2 Fill</Text>
              {debugDeck.deckbuildTrace?.phase2Picks.length ? (
                debugDeck.deckbuildTrace.phase2Picks.map((step) => (
                  <DebugCardRow
                    key={`p2-${step.step}-${step.oracle}`}
                    label={`#${step.step}`}
                    oracle={step.oracle}
                    cardMeta={cardMeta}
                    rating={step.rating}
                  />
                ))
              ) : (
                <Text xs className="text-text-secondary">No phase 2 fill trace.</Text>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Text sm semibold>Repairs</Text>
              {debugDeck.optimizationTrace?.length ? (
                debugDeck.optimizationTrace.map((step) => (
                  <div key={`${step.strategy}-${step.step}`} className="rounded border border-border/70 bg-bg-accent/30 px-3 py-2">
                    <Text xs className="text-text-secondary">{step.strategy} · step {step.step}</Text>
                    <Text sm>+ {cardMeta[step.addOracle]?.name ?? step.addOracle}</Text>
                    <Text sm>- {cardMeta[step.cutOracle]?.name ?? step.cutOracle}</Text>
                    {Number.isFinite(step.gain) && (
                      <Text xs className="text-text-secondary">gain {step.gain.toFixed(3)}</Text>
                    )}
                  </div>
                ))
              ) : (
                <Text xs className="text-text-secondary">No repair steps were applied.</Text>
              )}
              {debugDeck.deckbuildTrace?.basicsAdded.length ? (
                <div className="rounded border border-border/70 bg-bg-accent/30 px-3 py-2">
                  <Text sm semibold>Basics Added</Text>
                  <Text xs className="text-text-secondary">
                    {debugDeck.deckbuildTrace.basicsAdded.map((oracle) => cardMeta[oracle]?.name ?? oracle).join(', ')}
                  </Text>
                </div>
              ) : null}
            </div>
          </div>

          <div className="pt-2 border-t border-border/70">
            <Text sm semibold className="mb-2">Final Deck</Text>
            <SimDeckView deck={debugDeck} cardMeta={cardMeta} />
          </div>
        </>
      )}
    </div>
  );
};

export const PoolExpansionContent: React.FC<{
  pool: SimulatedPool;
  mode: PoolViewMode;
  deck: BuiltDeck | null;
  cardMeta: Record<string, CardMeta>;
  runData: SimulationRunData;
  highlightOracle?: string;
}> = ({ pool, mode, deck, cardMeta, runData, highlightOracle }) => {
  if (mode === 'deck' && deck && (deck.mainboard.length > 0 || deck.sideboard.length > 0)) {
    return <SimDeckView deck={deck} cardMeta={cardMeta} />;
  }
  if (mode === 'fullPickOrder') {
    return <SimulatorPickBreakdown pool={pool} runData={runData} />;
  }
  if (mode === 'deckbuildDebug') {
    return <DeckbuildDebugContent pool={pool} cardMeta={cardMeta} runData={runData} />;
  }
  const orderedPicks = [...pool.picks].sort((a, b) => a.packNumber - b.packNumber || a.pickNumber - b.pickNumber);
  return (
    <div className="p-3 overflow-x-auto">
      <Flexbox direction="col" gap="2">
        {[0, 1, 2].map((packNum) => {
          const packPicks = orderedPicks.filter((p) => p.packNumber === packNum);
          if (packPicks.length === 0) return null;
          return (
            <div key={packNum}>
              <Text xs className="text-text-secondary mb-1 font-semibold uppercase tracking-wider">
                Pack {packNum + 1}
              </Text>
              <div className="flex flex-row gap-1.5 flex-wrap">
                {packPicks.map((pick) => (
                  <PickCard
                    key={`${pick.packNumber}-${pick.pickNumber}`}
                    pick={pick}
                    isSelected={pick.oracle_id === highlightOracle}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </Flexbox>
    </div>
  );
};

export const PoolInspectionModal: React.FC<{
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  pool: SimulatedPool | null;
  deck: BuiltDeck | null;
  cardMeta: Record<string, CardMeta>;
  runData: SimulationRunData;
  themes: string[];
  archetypeLabel?: string | null;
  highlightOracle?: string;
  deckLoading?: boolean;
  themeBreakdown?: { bucket: string; cards: { name: string; rawTags: string[] }[] }[];
}> = ({
  isOpen,
  setOpen,
  pool,
  deck,
  cardMeta,
  runData,
  themes,
  archetypeLabel,
  highlightOracle,
  deckLoading,
  themeBreakdown,
}) => {
  // Keep last opened pool around so the leave transition has data to render against.
  const lastPoolRef = useRef<{
    pool: SimulatedPool;
    deck: BuiltDeck | null;
    themes: string[];
    archetypeLabel: string | null | undefined;
    themeBreakdown: typeof themeBreakdown;
  } | null>(null);
  if (pool) {
    lastPoolRef.current = { pool, deck, themes, archetypeLabel, themeBreakdown };
  }
  const snapshot = pool
    ? { pool, deck, themes, archetypeLabel, themeBreakdown }
    : lastPoolRef.current;

  const renderPool = snapshot?.pool ?? null;
  const renderDeck = snapshot?.deck ?? null;
  const renderThemes = snapshot?.themes ?? [];
  const renderArchetypeLabel = snapshot?.archetypeLabel ?? null;
  const renderThemeBreakdown = snapshot?.themeBreakdown;

  const hasDeck = !!renderDeck && (renderDeck.mainboard.length > 0 || renderDeck.sideboard.length > 0);
  const hasFullPickOrder = !!runData.setupData;
  const hasDeckbuildDebug = !!runData.setupData;

  const [viewMode, setViewMode] = useState<PoolViewMode>('deck');
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  // Reset internal state each time the modal opens for a new pool.
  useEffect(() => {
    if (!isOpen) return;
    setViewMode(hasDeck ? 'deck' : hasDeckbuildDebug ? 'deckbuildDebug' : hasFullPickOrder ? 'fullPickOrder' : 'pool');
    setBreakdownOpen(false);
  }, [isOpen, renderPool?.poolIndex, hasDeck, hasFullPickOrder, hasDeckbuildDebug]);

  if (!renderPool) return null;

  return (
    <Modal
      xxl
      scrollable
      isOpen={isOpen}
      setOpen={setOpen}
      offsetClassName="pt-4 md:pt-8"
      backdropClassName="bg-opacity-60 backdrop-blur-[2px]"
      panelClassName="rounded-xl border-border/70 bg-bg shadow-2xl"
    >
      <ModalHeader setOpen={setOpen} className="!bg-transparent !px-5 !py-3 border-b border-border/70">
        {/* Single header row: identity left, view toggle right */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* Identity */}
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-base leading-tight">
                Draft {renderPool.draftIndex + 1} · Seat {renderPool.seatIndex + 1}
              </span>
              {(renderArchetypeLabel || (renderPool.archetype && renderPool.archetype !== 'C')) && (
                <span className="text-sm text-text-secondary">
                  {renderPool.archetype && renderPool.archetype !== 'C' && renderPool.archetype}
                  {renderArchetypeLabel && (
                    <span className="text-link ml-1">{renderArchetypeLabel}</span>
                  )}
                </span>
              )}
            </div>
            {renderThemes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {renderThemes.slice(0, 5).map((t) => (
                  <span key={t} className="inline-flex text-[10px] bg-bg-accent border border-border/60 rounded px-1.5 py-0.5 text-text-secondary">
                    {t}
                  </span>
                ))}
                {renderThemes.length > 5 && (
                  <span className="text-[10px] text-text-secondary self-center">+{renderThemes.length - 5} more</span>
                )}
                {renderThemeBreakdown && renderThemeBreakdown.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setBreakdownOpen((o) => !o)}
                    className="text-[10px] text-text-secondary hover:text-text transition-colors underline underline-offset-2"
                  >
                    {breakdownOpen ? 'hide details' : 'details'}
                  </button>
                )}
              </div>
            )}
            {breakdownOpen && renderThemeBreakdown && renderThemeBreakdown.length > 0 && (
              <div className="rounded-lg border border-border/70 bg-bg-accent/35 px-3 py-2 text-[10px] font-mono leading-tight max-h-40 overflow-y-auto">
                {renderThemeBreakdown.map(({ bucket, cards }) => (
                  <div key={bucket} className="mb-1.5">
                    <span className="font-bold text-link">{bucket} ({cards.length})</span>
                    <div className="ml-2">
                      {cards.map(({ name, rawTags }) => (
                        <div key={name} className="text-text-secondary">
                          {name} <span className="opacity-50">[{rawTags.join(', ')}]</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* View toggle — right side of header */}
          <div className="shrink-0">
            <ViewToggle
              mode={viewMode}
              onChange={setViewMode}
              hasDeck={hasDeck}
              hasFullPickOrder={hasFullPickOrder}
              hasDeckbuildDebug={hasDeckbuildDebug}
              deckLoading={deckLoading}
            />
          </div>
        </div>
      </ModalHeader>
      <ModalBody scrollable className="!p-0 !border-y-0 bg-bg">
        <PoolExpansionContent
          pool={renderPool}
          mode={viewMode}
          deck={renderDeck}
          cardMeta={cardMeta}
          runData={runData}
          highlightOracle={highlightOracle}
        />
      </ModalBody>
    </Modal>
  );
};

export default PoolInspectionModal;
