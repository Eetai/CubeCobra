import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { cardName } from '@utils/cardutil';
import CardType from '@utils/datatypes/Card';
import { AnimatePresence, motion } from 'framer-motion';

import FoilCardImage from '../../FoilCardImage';
import { VariantProps } from './types';

/**
 * Geometry that distinguishes the Arena-family layouts. Everything else — the
 * deal-in, sweep-out, hover-peek, and tap-to-raise/tap-to-draft interaction — is
 * shared, so the variants stay in lockstep and there is only one place to fix.
 *
 * - `arc`: a splayed hand along the bottom. Width-aware, and when a single row
 *   would pack cards tighter than ~half a card apart it wraps into two tiered
 *   arcs so every card stays visible.
 * - `grid`: a fit-to-window grid — columns and rows sized so the whole pack is
 *   visible at once with no scrolling.
 */
export interface SplayConfig {
  type: 'arc' | 'grid';
  // arc only:
  gapFactor?: number; // fraction of a card's width between adjacent centers
  arcHeight?: number; // downward drop (px) of the outermost card
  tiltMax?: number; // rotation (deg) of the outermost card
  // grid only:
  gap?: number; // gap (px) between grid cells
}

// How far a card lifts above its resting baseline when raised / hovered (px).
const RAISE = 122;
const PEEK = 62;

const range = (a: number, b: number): number[] => {
  const out: number[] = [];
  for (let k = a; k < b; k += 1) out.push(k);
  return out;
};

// Responsive card width (px) for the arc, used directly in the spacing math so
// the layout and the rendered size can never disagree.
const cardWidthFor = (containerWidth: number): number => {
  if (containerWidth < 500) return 90;
  if (containerWidth < 768) return 112;
  if (containerWidth < 1200) return 138;
  return 160;
};

interface ArcPos {
  offsetX: number;
  dip: number;
  tilt: number;
  bottom: number;
  z: number;
}

interface ArenaSplayProps extends VariantProps {
  config: SplayConfig;
}

const ArenaSplay: React.FC<ArenaSplayProps> = ({
  pack,
  ratings,
  maxRating,
  showRatings,
  loading,
  disabled,
  isTrashStep,
  commit,
  config,
}) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(() => (typeof window !== 'undefined' ? window.innerWidth : 1200));
  const [height, setHeight] = useState<number>(400);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      setWidth(el.clientWidth);
      setHeight(el.clientHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Stable, identity-based keys so a fresh pack animates as a full turnover
  // rather than morphing card-to-card. Duplicate cards in one pack get suffixed.
  const keys = useMemo(() => {
    const seen = new Map<string, number>();
    return pack.map((card, i) => {
      const id = card.details?.scryfall_id ?? card.cardID ?? `idx-${i}`;
      const occ = seen.get(id) ?? 0;
      seen.set(id, occ + 1);
      return `${id}#${occ}`;
    });
  }, [pack]);

  // A new pack means any previous selection/hover no longer refers to the same card.
  const handSignature = keys.join('|');
  useEffect(() => {
    setSelected(null);
    setHovered(null);
  }, [handSignature]);

  const interactive = !disabled && !loading;
  const onCardClick = (index: number) => {
    if (!interactive) return;
    if (selected === index) commit(index);
    else setSelected(index);
  };

  const n = pack.length;

  // Shared card face: image, top-pick ring, rating pill, and the raised-card
  // "tap to draft" affordance. Identical across both layouts.
  const cardFace = (card: CardType, index: number, isRaised: boolean) => {
    const rating = ratings?.[index];
    const isTop = rating !== undefined && rating === maxRating && maxRating > 0;
    return (
      <>
        <div
          className={`rounded-xl overflow-hidden shadow-[0_16px_34px_-12px_rgba(0,0,0,0.85)] ${
            isTop && showRatings ? 'ring-[3px] ring-[#3b82f6]' : ''
          } ${isRaised ? 'ring-2 ring-white/90' : ''}`}
          style={{ aspectRatio: '61 / 85' }}
        >
          <FoilCardImage card={card} autocard height="100%" />
        </div>
        {rating !== undefined && showRatings && (
          <div
            className={`absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-xxs font-bold text-white shadow-lg ${
              isTop ? 'bg-[#3b82f6]' : 'bg-black/80'
            }`}
          >
            {Math.round(rating * 100)}%
          </div>
        )}
        <AnimatePresence>
          {isRaised && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap flex flex-col items-center gap-0.5"
            >
              <span
                className={`px-3 py-0.5 rounded-full text-xxs font-bold text-white shadow-lg ${
                  isTrashStep ? 'bg-button-danger' : 'bg-button-primary'
                }`}
              >
                Tap to {isTrashStep ? 'trash' : 'draft'}
              </span>
              <span className="text-xxs text-text-secondary max-w-40 truncate">{cardName(card)}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  };

  const stageClass = 'relative w-full select-none';
  const stageStyle: React.CSSProperties = { height: '46vh', minHeight: 340 };

  // ---- Grid layout: fit every card in the window (columns × rows). ----
  if (config.type === 'grid') {
    const g = config.gap ?? 6;
    const W = width - 20;
    const H = height - 16;
    let best = { c: 1, size: 0 };
    for (let c = 1; c <= Math.max(1, n); c += 1) {
      const r = Math.ceil(n / c);
      let w = (W - (c - 1) * g) / c;
      const totalH = r * ((w * 85) / 61) + (r - 1) * g;
      if (totalH > H) w = ((H - (r - 1) * g) / r) * (61 / 85);
      if (w > best.size) best = { c, size: w };
    }
    const cols = best.c;
    const cell = Math.max(28, Math.floor(best.size));

    return (
      <div ref={containerRef} className={stageClass} style={stageStyle}>
        <div
          className="absolute inset-0 grid p-2 overflow-visible"
          style={{
            gridTemplateColumns: `repeat(${cols}, ${cell}px)`,
            gap: `${g}px`,
            alignContent: 'center',
            justifyContent: 'center',
          }}
        >
          <AnimatePresence mode="popLayout">
            {pack.map((card, index) => {
              const isRaised = selected === index;
              const isHovered = hovered === index && !isRaised;
              return (
                <motion.div
                  key={keys[index]}
                  layout
                  className="relative cursor-pointer"
                  style={{ width: cell, zIndex: isRaised ? 300 : isHovered ? 200 : 1 }}
                  initial={{ x: -260, rotate: -24, scale: 0.7, opacity: 0 }}
                  animate={{ x: 0, rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ y: -240, scale: 1.1, opacity: 0, transition: { duration: 0.28 } }}
                  transition={{ type: 'spring', stiffness: 300, damping: 26, delay: index * 0.05 }}
                >
                  <motion.div
                    animate={{ scale: isRaised ? 1.55 : isHovered ? 1.14 : 1 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                    className="relative"
                    onHoverStart={() => interactive && setHovered(index)}
                    onHoverEnd={() => setHovered((h) => (h === index ? null : h))}
                    onClick={() => onCardClick(index)}
                  >
                    {cardFace(card, index, isRaised)}
                  </motion.div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ---- Arc layout: one splayed row, wrapping to two tiered arcs when tight. ----
  const cardWidth = cardWidthFor(width);
  const cardHeight = (cardWidth * 85) / 61;
  const usable = Math.max(cardWidth, width - cardWidth - 16);
  const comfortGap = cardWidth * 0.5;
  const twoRows = n > Math.max(1, Math.floor(usable / comfortGap) + 1);
  const split = Math.ceil(n / 2);
  const rows = twoRows ? [range(0, split), range(split, n)] : [range(0, n)];
  const arcH = twoRows ? (config.arcHeight ?? 0) * 0.5 : (config.arcHeight ?? 0);
  const pos: ArcPos[] = new Array(n);
  rows.forEach((idxs, r) => {
    const len = idxs.length;
    const rowHalf = (len - 1) / 2;
    const gap = len > 1 ? Math.min(cardWidth * (config.gapFactor ?? 0.7), usable / (len - 1)) : 0;
    const bottom = !twoRows
      ? Math.max(70, (height - cardHeight) * 0.42)
      : r === 0
        ? Math.max(120, (height - cardHeight) * 0.6)
        : Math.max(16, (height - cardHeight) * 0.12);
    idxs.forEach((cardIndex, j) => {
      const t = rowHalf === 0 ? 0 : (j - rowHalf) / rowHalf;
      pos[cardIndex] = {
        offsetX: (j - rowHalf) * gap,
        dip: t * t * arcH,
        tilt: t * (config.tiltMax ?? 0),
        bottom,
        z: r === 0 ? j : 100 + j,
      };
    });
  });

  return (
    <div ref={containerRef} className={stageClass} style={stageStyle}>
      <div className="absolute inset-0">
        <AnimatePresence mode="popLayout">
          {pack.map((card, index) => {
            const p = pos[index];
            const isRaised = selected === index;
            const isHovered = hovered === index && !isRaised;

            // Raised/hovered cards settle at the same height and upright,
            // regardless of their resting arc position, so the peek is uniform.
            const innerY = isRaised ? -(RAISE + p.dip) : isHovered ? -(PEEK + p.dip) : 0;
            const innerRotate = isRaised || isHovered ? -p.tilt : 0;
            const innerScale = isRaised ? 1.18 : isHovered ? 1.08 : 1;

            return (
              // Outer layer owns the horizontal deal-in / sweep-out, staggered by
              // index so cards arrive one at a time. Its resting target is
              // constant, so the stagger never delays the raise interaction.
              <motion.div
                key={keys[index]}
                className="absolute left-1/2"
                style={{
                  bottom: p.bottom,
                  zIndex: isRaised ? 300 : isHovered ? 200 : p.z,
                  transformOrigin: 'bottom center',
                }}
                initial={{ x: -700, y: 0, rotate: -32, opacity: 0 }}
                animate={{ x: p.offsetX, y: p.dip, rotate: p.tilt, opacity: 1 }}
                exit={{ x: 700, y: 0, rotate: 32, opacity: 0, transition: { duration: 0.3, delay: index * 0.02 } }}
                transition={{ type: 'spring', stiffness: 300, damping: 26, delay: index * 0.06 }}
              >
                {/* Inner layer owns the raise/hover peek with an instant,
                    delay-free transition; rotation is countered so a lifted card
                    sits perfectly upright. */}
                <motion.div
                  className="cursor-pointer"
                  style={{ width: cardWidth, marginLeft: -cardWidth / 2 }}
                  animate={{ y: innerY, rotate: innerRotate, scale: innerScale }}
                  transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                  onHoverStart={() => interactive && setHovered(index)}
                  onHoverEnd={() => setHovered((h) => (h === index ? null : h))}
                  onClick={() => onCardClick(index)}
                >
                  {cardFace(card, index, isRaised)}
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Configured Arena-family variants. Each is a thin wrapper over the shared base.
const FAN_CONFIG: SplayConfig = { type: 'arc', gapFactor: 0.76, arcHeight: 34, tiltMax: 8 };
const ARC_CONFIG: SplayConfig = { type: 'arc', gapFactor: 0.52, arcHeight: 94, tiltMax: 16 };
const GRID_CONFIG: SplayConfig = { type: 'grid', gap: 6 };

export const ArenaFan: React.FC<VariantProps> = (props) => <ArenaSplay {...props} config={FAN_CONFIG} />;
ArenaFan.displayName = 'ArenaFan';

export const ArenaArc: React.FC<VariantProps> = (props) => <ArenaSplay {...props} config={ARC_CONFIG} />;
ArenaArc.displayName = 'ArenaArc';

export const ArenaGrid: React.FC<VariantProps> = (props) => <ArenaSplay {...props} config={GRID_CONFIG} />;
ArenaGrid.displayName = 'ArenaGrid';

export default ArenaSplay;
