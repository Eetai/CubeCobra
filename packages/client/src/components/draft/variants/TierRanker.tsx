import React from 'react';

import { cardName } from '@utils/cardutil';
import { motion } from 'framer-motion';

import FoilCardImage from '../../FoilCardImage';
import { VariantProps } from './types';

// Map a normalized 0..1 score to a red→amber→green heat hue.
const heatColor = (t: number) => `hsl(${Math.round(t * 130)}, 85%, 50%)`;

/**
 * Tier Ranker — a data-forward "power ranking". Cards are sorted by the bot's
 * rating with a heat glow (green = strong, red = weak), a rank badge, and an
 * animated rating bar. Leans into the ML angle. Falls back to pack order when
 * ratings aren't loaded yet.
 */
const TierRanker: React.FC<VariantProps> = ({ pack, ratings, maxRating, disabled, isTrashStep, commit }) => {
  const order = pack
    .map((card, index) => ({ card, index, rating: ratings?.[index] ?? 0 }))
    .sort((a, b) => b.rating - a.rating);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {order.map(({ card, index, rating }, rank) => {
        const norm = maxRating > 0 ? rating / maxRating : 0;
        const color = heatColor(norm);
        return (
          <motion.div
            key={`tier-${card.details?.scryfall_id}-${index}`}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26, delay: Math.min(rank * 0.02, 0.3) }}
            whileHover={disabled ? undefined : { y: -6, scale: 1.04, zIndex: 10 }}
            className="relative cursor-pointer"
            onClick={() => !disabled && commit(index)}
          >
            <div
              className="rounded-xl overflow-hidden"
              style={{ boxShadow: rating > 0 ? `0 0 0 2px ${color}, 0 8px 24px -8px ${color}` : undefined }}
            >
              <div className="relative" style={{ aspectRatio: '61 / 85' }}>
                <FoilCardImage card={card} autocard height="100%" />
                <div
                  className="absolute top-1 left-1 h-6 w-6 rounded-full flex items-center justify-center text-xs font-extrabold text-black shadow"
                  style={{ backgroundColor: color }}
                >
                  {rank + 1}
                </div>
              </div>
              {ratings && (
                <div className="bg-bg-active px-2 py-1.5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xxs truncate text-text-secondary max-w-[70%]">{cardName(card)}</span>
                    <span className="text-xxs font-bold" style={{ color }}>
                      {Math.round(rating * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-black/30 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round(norm * 100)}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )}
            </div>
            <div
              className={`absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition flex items-center justify-center ${
                disabled ? 'hidden' : ''
              }`}
            >
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg ${
                  isTrashStep ? 'bg-button-danger' : 'bg-button-primary'
                }`}
              >
                {isTrashStep ? 'Trash' : 'Pick'}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default TierRanker;
