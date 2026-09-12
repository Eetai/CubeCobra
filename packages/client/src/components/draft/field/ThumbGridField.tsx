import React from 'react';

import CardType from '@utils/datatypes/Card';

import { Card, CardBody, CardHeader } from '../../base/Card';
import Text from '../../base/Text';
import FoilCardImage from '../../FoilCardImage';
import { sortByCmcThenName } from './util';
import { FlatFieldProps } from './types';

const Zone: React.FC<{ title: string; cards: CardType[] }> = ({ title, cards }) => {
  const sorted = sortByCmcThenName(cards);
  return (
    <div>
      <Text semibold lg>
        {title} · {cards.length}
      </Text>
      {cards.length === 0 ? (
        <div className="text-text-secondary text-sm mt-2">No cards yet.</div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {sorted.map((card, i) => (
            <div
              key={`${card.cardID}-${i}`}
              className="w-16 md:w-20 rounded-md overflow-hidden shadow-md transition-transform duration-150 hover:scale-110 hover:z-10 relative"
              style={{ aspectRatio: '61 / 85' }}
            >
              <FoilCardImage card={card} autocard height="100%" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/** Thumbnail Grid — small non-overlapping card thumbnails sorted by CMC. */
const ThumbGridField: React.FC<FlatFieldProps> = ({ mainboard, sideboard }) => (
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

export default ThumbGridField;
