import React from 'react';

import { cardName } from '@utils/cardutil';
import CardType from '@utils/datatypes/Card';

import { Card, CardBody, CardHeader } from '../../base/Card';
import Text from '../../base/Text';
import withAutocard from '../../WithAutocard';
import { cmcBucketLabel, groupByCmc } from './util';
import { FlatFieldProps } from './types';

const AutocardSpan = withAutocard('span');

const Zone: React.FC<{ title: string; cards: CardType[] }> = ({ title, cards }) => {
  const groups = groupByCmc(cards);
  return (
    <div className="flex-1 min-w-[200px]">
      <Text semibold lg>
        {title} · {cards.length}
      </Text>
      {cards.length === 0 ? (
        <div className="text-text-secondary text-sm mt-2">No cards yet.</div>
      ) : (
        <div className="mt-2 flex flex-col gap-3">
          {groups.map(({ bucket, cards: bucketCards }) => (
            <div key={bucket}>
              <div className="text-xs uppercase tracking-wide text-text-secondary border-b border-border pb-0.5 mb-1">
                {cmcBucketLabel(bucket)} ({bucketCards.length})
              </div>
              <ul className="flex flex-col gap-0.5">
                {bucketCards.map((card, i) => (
                  <li key={`${card.cardID}-${i}`} className="text-sm">
                    <AutocardSpan card={card} className="cursor-default hover:text-link">
                      {cardName(card)}
                    </AutocardSpan>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/** Text List — drafted names grouped into CMC buckets, no images. */
const TextListField: React.FC<FlatFieldProps> = ({ mainboard, sideboard }) => (
  <Card className="my-3">
    <CardHeader>
      <Text semibold lg>
        Draft Pool
      </Text>
    </CardHeader>
    <CardBody>
      <div className="flex flex-wrap gap-6">
        <Zone title="Mainboard" cards={mainboard} />
        <Zone title="Sideboard" cards={sideboard} />
      </div>
    </CardBody>
  </Card>
);

export default TextListField;
