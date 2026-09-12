import React from 'react';

import { makeSubtitle } from '@utils/cardutil';
import CardType from '@utils/datatypes/Card';

import { locations } from '../../../drafting/DraftLocation';
import { Card } from '../../base/Card';
import DeckStacks from '../../DeckStacks';
import CollapsibleField from './CollapsibleField';
import ColorChipsField from './ColorChipsField';
import TextListField from './TextListField';
import ThumbGridField from './ThumbGridField';
import { FieldView, FlatFieldProps } from './types';

interface DraftFieldProps {
  view: FieldView;
  // Structured boards (row → col → stack) as used by the draggable card stacks.
  mainboard: CardType[][][];
  sideboard: CardType[][][];
}

const FLAT_VIEWS: Record<Exclude<FieldView, 'stacks'>, React.FC<FlatFieldProps>> = {
  list: TextListField,
  chips: ColorChipsField,
  grid: ThumbGridField,
  collapse: CollapsibleField,
};

/**
 * Renders the drafted pool in the chosen display mode. `stacks` is the original
 * interactive drag-and-drop view; every other mode is a lighter, display-only
 * summary derived from the same board data (flattened to a card list per zone).
 */
const DraftField: React.FC<DraftFieldProps> = ({ view, mainboard, sideboard }) => {
  if (view === 'stacks') {
    return (
      <Card className="my-3">
        <DeckStacks
          cards={mainboard}
          title="Mainboard"
          subtitle={makeSubtitle(mainboard.flat(2))}
          locationType={locations.deck}
          xs={4}
          lg={8}
        />
        <DeckStacks cards={sideboard} title="Sideboard" locationType={locations.sideboard} xs={4} lg={8} />
      </Card>
    );
  }

  const FlatView = FLAT_VIEWS[view];
  return <FlatView mainboard={mainboard.flat(2)} sideboard={sideboard.flat(2)} />;
};

export default DraftField;
