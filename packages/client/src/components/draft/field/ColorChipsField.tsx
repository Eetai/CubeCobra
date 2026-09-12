import React from 'react';

import { cardName } from '@utils/cardutil';
import CardType from '@utils/datatypes/Card';

import { Card, CardBody, CardHeader } from '../../base/Card';
import Text from '../../base/Text';
import withAutocard from '../../WithAutocard';
import { COLOR_CHIP_CLASS, groupByColor } from './util';
import { FlatFieldProps } from './types';

const AutocardChip = withAutocard('span');

const Zone: React.FC<{ title: string; cards: CardType[] }> = ({ title, cards }) => {
  const columns = groupByColor(cards);
  return (
    <div>
      <Text semibold lg>
        {title} · {cards.length}
      </Text>
      {cards.length === 0 ? (
        <div className="text-text-secondary text-sm mt-2">No cards yet.</div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-4">
          {columns.map(({ category, cards: colCards }) => (
            <div key={category} className="min-w-[140px]">
              <div className="text-xs uppercase tracking-wide text-text-secondary mb-1">
                {category} ({colCards.length})
              </div>
              <div className="flex flex-col gap-1">
                {colCards.map((card, i) => (
                  <AutocardChip
                    key={`${card.cardID}-${i}`}
                    card={card}
                    className={`px-2 py-0.5 rounded-full text-xxs font-semibold shadow-sm cursor-default truncate ${COLOR_CHIP_CLASS[category]}`}
                  >
                    {cardName(card)}
                  </AutocardChip>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/** Color Chips — drafted names as color-coded chips grouped into color columns. */
const ColorChipsField: React.FC<FlatFieldProps> = ({ mainboard, sideboard }) => (
  <Card className="my-3">
    <CardHeader>
      <Text semibold lg>
        Draft Pool
      </Text>
    </CardHeader>
    <CardBody className="flex flex-col gap-6">
      <Zone title="Mainboard" cards={mainboard} />
      <Zone title="Sideboard" cards={sideboard} />
    </CardBody>
  </Card>
);

export default ColorChipsField;
