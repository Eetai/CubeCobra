import React, { useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';

import {
  FIELD_VIEW_META,
  FIELD_VIEWS,
  FieldView,
  POOL_POSITION_META,
  POOL_POSITIONS,
  PoolPosition,
} from './field/types';
import { DRAFT_VARIANT_META, DRAFT_VARIANTS, DraftVariant } from './variants/types';

interface DraftVariantSwitcherProps {
  variant: DraftVariant;
  setVariant: (v: DraftVariant) => void;
  fieldView: FieldView;
  setFieldView: (v: FieldView) => void;
  poolPosition: PoolPosition;
  setPoolPosition: (v: PoolPosition) => void;
}

interface OptionRowProps {
  icon: string;
  label: string;
  blurb: string;
  active: boolean;
  onClick: () => void;
}

const OptionRow: React.FC<OptionRowProps> = ({ icon, label, blurb, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full flex items-center gap-2.5 px-3 py-1.5 sm:py-2 text-left transition ${
      active ? 'bg-button-primary/20' : 'hover:bg-bg-accent'
    }`}
  >
    <span className="text-base sm:text-lg w-5 text-center shrink-0">{icon}</span>
    <span className="flex flex-col min-w-0">
      <span className={`text-[13px] font-semibold ${active ? 'text-button-primary' : 'text-text'}`}>{label}</span>
      {/* Secondary description is dropped on phones to keep the panel short. */}
      <span className="hidden sm:block text-xxs text-text-secondary">{blurb}</span>
    </span>
    {active && <span className="ml-auto text-button-primary">●</span>}
  </button>
);

/**
 * Floating pill for live-switching the draft UI during a demo. The panel has two
 * sections: the pack style (variants) and the draft-pool display (field views).
 * Fixed to the bottom-right so it stays reachable regardless of which layout is
 * active.
 */
const DraftVariantSwitcher: React.FC<DraftVariantSwitcherProps> = ({
  variant,
  setVariant,
  fieldView,
  setFieldView,
  poolPosition,
  setPoolPosition,
}) => {
  const [open, setOpen] = useState(false);
  const meta = DRAFT_VARIANT_META[variant];

  return (
    <div className="fixed bottom-4 right-4 z-[1000] flex flex-col items-end gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="w-[15rem] max-w-[calc(100vw-1.5rem)] max-h-[72vh] overflow-y-auto rounded-2xl bg-bg-active/95 backdrop-blur border border-border shadow-2xl"
          >
            <div className="px-3 py-1.5 text-[11px] uppercase tracking-widest text-text-secondary border-b border-border sticky top-0 bg-bg-active/95 backdrop-blur">
              Pack Style
            </div>
            {DRAFT_VARIANTS.map((v) => {
              const m = DRAFT_VARIANT_META[v];
              return (
                <OptionRow
                  key={v}
                  icon={m.icon}
                  label={m.label}
                  blurb={m.blurb}
                  active={v === variant}
                  onClick={() => setVariant(v)}
                />
              );
            })}

            <div className="px-3 py-1.5 text-[11px] uppercase tracking-widest text-text-secondary border-y border-border sticky top-0 bg-bg-active/95 backdrop-blur">
              Draft Pool
            </div>
            {FIELD_VIEWS.map((v) => {
              const m = FIELD_VIEW_META[v];
              return (
                <OptionRow
                  key={v}
                  icon={m.icon}
                  label={m.label}
                  blurb={m.blurb}
                  active={v === fieldView}
                  onClick={() => setFieldView(v)}
                />
              );
            })}

            <div className="px-3 py-1.5 text-[11px] uppercase tracking-widest text-text-secondary border-y border-border sticky top-0 bg-bg-active/95 backdrop-blur">
              Pool Position
            </div>
            {POOL_POSITIONS.map((v) => {
              const m = POOL_POSITION_META[v];
              return (
                <OptionRow
                  key={v}
                  icon={m.icon}
                  label={m.label}
                  blurb={m.blurb}
                  active={v === poolPosition}
                  onClick={() => setPoolPosition(v)}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full bg-button-primary text-button-text px-4 py-2.5 shadow-2xl hover:bg-button-primary-active transition"
      >
        <span className="text-lg">{meta.icon}</span>
        <span className="text-sm font-semibold">{meta.label}</span>
        <span className="text-xs opacity-70">▾</span>
      </motion.button>
    </div>
  );
};

export default DraftVariantSwitcher;
