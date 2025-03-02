import React from 'react';

import { locations } from '../drafting/DraftLocation';
import { makeSubtitle } from '../utils/cardutil';
import { createSafeCard } from '../utils/prefetchUtil';
import { Card } from './base/Card';
import DeckStacks from './DeckStacks';

interface DraftDeckAreaProps {
  mainboard: any[][][];
  sideboard: any[][][];
  cards: any[];
}

const DraftDeckArea: React.FC<DraftDeckAreaProps> = ({ mainboard, sideboard, cards }) => {
  return (
    <Card className="my-3">
      <DeckStacks
        cards={mainboard.map(row => row.map(col => col.map(index => createSafeCard(cards[index]))))}
        title="Mainboard"
        subtitle={makeSubtitle(mainboard.flat(3).map(index => createSafeCard(cards[index])))}
        locationType={locations.deck}
        xs={4}
        lg={8}
      />
      <DeckStacks
        cards={sideboard.map(row => row.map(col => col.map(index => createSafeCard(cards[index]))))}
        title="Sideboard"
        locationType={locations.sideboard}
        xs={4}
        lg={8}
      />
    </Card>
  );
};

export default DraftDeckArea;
