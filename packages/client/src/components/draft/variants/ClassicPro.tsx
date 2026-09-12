import React from 'react';

import { motion } from 'framer-motion';

import DraftLocation from '../../../drafting/DraftLocation';
import useLocalStorage from '../../../hooks/useLocalStorage';
import { Col, NumCols, Row } from '../../base/Layout';
import Select from '../../base/Select';
import DraggableCard from '../../DraggableCard';
import FoilCardImage from '../../FoilCardImage';
import { VariantProps } from './types';

// Auto responsive column counts, matching the original Pack grid.
const AUTO_ROW_COLUMN_PROPS = { md: 4, lg: 5, xl: 6, xxl: 8 } as const;

type CardsPerRowSetting = 'auto' | NumCols;

const CARDS_PER_ROW_OPTIONS = [
  { value: 'auto', label: 'Auto Cards Per Row' },
  ...([1, 2, 3, 4, 5, 6, 7, 8] as const).map((n) => ({
    value: `${n}`,
    label: `${n} Card${n === 1 ? '' : 's'} Per Row`,
  })),
];

/**
 * Classic Pro — the familiar responsive grid, leveled up: a staggered fade-in on
 * each new pack, a soft shadow glow on hover, and rating pills that fade in with
 * an accent ring on the bot's top pick. Retains full drag-and-drop parity with
 * the original pack (drag to deck/sideboard) via DraggableCard.
 *
 * NOTE: the enhancements here are deliberately transform-free on the draggable's
 * ancestors. dnd-kit hit-tests against getBoundingClientRect, and each pack card
 * is also its own drop target, so a hover/scale transform on the wrapper made
 * drags resolve back onto the card itself — releasing then registered as a
 * quick-click pick straight to the mainboard. Opacity + box-shadow give the same
 * "pro" feel without disturbing drag coordinates.
 */
const ClassicPro: React.FC<VariantProps> = ({ pack, ratings, maxRating, showRatings, disabled }) => {
  const [cardsPerRow, setCardsPerRow] = useLocalStorage<CardsPerRowSetting>('draftPackCardsPerRow', 'auto');

  return (
    <div>
      <div className="flex justify-end mb-3">
        <div className="w-40 shrink-0">
          <Select
            dense
            value={`${cardsPerRow}`}
            setValue={(value) => setCardsPerRow(value === 'auto' ? 'auto' : (parseInt(value, 10) as NumCols))}
            className="bg-bg-active"
            options={CARDS_PER_ROW_OPTIONS}
          />
        </div>
      </div>
      <Row className="g-0" {...(cardsPerRow === 'auto' ? AUTO_ROW_COLUMN_PROPS : { xs: cardsPerRow })}>
        {pack.map((card, index) => {
          const rating = ratings?.[index];
          const isTop = rating !== undefined && rating === maxRating && maxRating > 0;
          return (
            <Col key={`classic-${card.details?.scryfall_id}-${index}`} xs={1} className="aspect-[61/85]">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.28, delay: Math.min(index * 0.025, 0.4), ease: 'easeOut' }}
                className="relative p-1"
              >
                <div
                  className={`relative rounded-lg transition-shadow duration-200 hover:shadow-[0_10px_30px_-6px_rgba(0,0,0,0.55)] ${
                    isTop && showRatings ? 'ring-[3px] ring-offset-0 ring-[#3b82f6] rounded-lg' : ''
                  }`}
                >
                  {disabled ? (
                    <FoilCardImage card={card} autocard />
                  ) : (
                    <DraggableCard location={DraftLocation.pack(index)} data-index={index} card={card} />
                  )}
                  {rating !== undefined && showRatings && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`absolute bottom-[6%] left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md text-xxs font-bold tracking-tight text-white shadow-lg ${
                        isTop ? 'bg-[#3b82f6]/95' : 'bg-black/75'
                      }`}
                      title={`Bot rates this card ${Math.round(rating * 100)}% for this pick`}
                    >
                      {Math.round(rating * 100)}%
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default ClassicPro;
