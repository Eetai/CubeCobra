import React, { useState } from 'react';

import { cardName } from '@utils/cardutil';
import CardType from '@utils/datatypes/Card';
import { AnimatePresence, motion } from 'framer-motion';

import { Card } from '../../base/Card';
import withAutocard from '../../WithAutocard';
import { cmcBucketLabel, groupByCmc } from './util';
import { FlatFieldProps } from './types';

const AutocardName = withAutocard('span');

const Zone: React.FC<{ title: string; cards: CardType[]; defaultOpen?: boolean }> = ({
  title,
  cards,
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const groups = groupByCmc(cards);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 py-3 px-4 hover:bg-bg-active transition text-left"
      >
        <motion.span animate={{ rotate: open ? 90 : 0 }} className="text-text-secondary">
          ▸
        </motion.span>
        <span className="font-semibold">{title}</span>
        <span className="text-text-secondary">— {cards.length} cards</span>
      </button>
      <AnimatePresence initial={false}>
        {open && cards.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 flex flex-col gap-2">
              {groups.map(({ bucket, cards: bucketCards }) => (
                <div key={bucket}>
                  <span className="text-xs uppercase tracking-wide text-text-secondary">{cmcBucketLabel(bucket)}:</span>{' '}
                  {bucketCards.map((card, i) => (
                    <React.Fragment key={`${card.cardID}-${i}`}>
                      <AutocardName card={card} className="text-sm cursor-default hover:text-link">
                        {cardName(card)}
                      </AutocardName>
                      {i < bucketCards.length - 1 ? ', ' : ''}
                    </React.Fragment>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/** Collapsible — titled bars per zone that expand to reveal a CMC-grouped name list. */
const CollapsibleField: React.FC<FlatFieldProps> = ({ mainboard, sideboard }) => (
  <Card className="my-3">
    <Zone title="Mainboard" cards={mainboard} defaultOpen />
    <Zone title="Sideboard" cards={sideboard} />
  </Card>
);

export default CollapsibleField;
