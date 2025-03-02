import React, { useCallback, useState } from 'react';

import { DndContext } from '@dnd-kit/core';

import Pack from 'components/Pack';
import RenderToRoot from 'components/RenderToRoot';
import { DisplayContextProvider } from 'contexts/DisplayContext';
import Cube from 'datatypes/Cube';
import Draft from 'datatypes/Draft';
import DraftLocation, { addCard, removeCard } from 'drafting/DraftLocation';
import { locations } from 'drafting/DraftLocation';
import CubeLayout from 'layouts/CubeLayout';
import MainLayout from 'layouts/MainLayout';

import { getCardDefaultRowColumn } from '../../util/draftutil';
import CardDragOverlay from '../components/CardDragOverlay';
import DraftDeckArea from '../components/DraftDeckArea';
import DraftHeader from '../components/DraftHeader';
import FadeOverlay from '../components/FadeOverlay';
import { AnimationProvider } from '../contexts/AnimationContext';
import useDraft from '../hooks/useDraft';
import { createSafeCard } from '../utils/prefetchUtil';

interface CubeDraftPageProps {
  cube: Cube;
  draft: Draft;
  loginCallback?: string;
}

const CubeDraftPage: React.FC<CubeDraftPageProps> = ({ cube, draft, loginCallback }) => {
  const [dragStartTime, setDragStartTime] = useState<number | null>(null);
  const [activeCard, setActiveCard] = useState<{ card: ReturnType<typeof createSafeCard> } | null>(null);
  const [showRatings, setShowRatings] = useState(false);

  const { 
    state, 
    mainboard, 
    sideboard, 
    ratings,
    draftLoading, 
    predictionsLoading,
    predictError,
    retryInProgress,
    fadeTransition,
    packTitle,
    packDisabled,
    makePick,
    selectCardByIndex,
    handleRetryPredict,
    getLocationReferences
  } = useDraft(draft);

  // Card movement handler functions
  const moveCardBetweenDeckStacks = useCallback(
    (source: DraftLocation, target: DraftLocation) => {
      const { board: sourceBoard, setter: sourceSetter } = getLocationReferences(source.type);

      //Moving within the same DeckStack
      if (source.type === target.type) {
        const [card, newCards] = removeCard(sourceBoard, source);
        sourceSetter(addCard(newCards, target, card));
      } else {
        const { board: targetBoard, setter: targetSetter } = getLocationReferences(target.type);
        const [card, newCards] = removeCard(sourceBoard, source);
        //Add card to the target, then update the source with the cards minus the moved card
        targetSetter(addCard(targetBoard, target, card));
        sourceSetter(newCards);
      }
    },
    [getLocationReferences],
  );

  const applyCardClickOnDeckStack = useCallback(
    (source: DraftLocation) => {
      //Determine the card which was clicked in the board, so we can calculate its standard row/col destination
      const { board: sourceBoard } = getLocationReferences(source.type);
      const cardIndex = sourceBoard[source.row][source.col][source.index];
      const card = draft.cards[cardIndex];
      const { row, col } = getCardDefaultRowColumn(card);

      const targetLocation = source.type === locations.deck ? locations.sideboard : locations.deck;
      //The sideboard only has one row, unlike the deck with has 1 row for creatures and 1 for non-creatures
      const targetRow = targetLocation === locations.sideboard ? 0 : row;
      const { board: targetBoard } = getLocationReferences(targetLocation);

      //The card should be added to the end of the stack of cards at the grid position (row/col). Be extra careful
      //with the boards (using .? operator) even though they are pre-populated via setupPicks() at the top
      const targetIndex = targetBoard?.[targetRow]?.[col]?.[source.index] || 0;
      moveCardBetweenDeckStacks(source, new DraftLocation(targetLocation, targetRow, col, targetIndex));
    },
    [draft.cards, getLocationReferences, moveCardBetweenDeckStacks],
  );

  const handlePackToDeck = useCallback(
    (source: DraftLocation, target: DraftLocation) => {
      // When dragging a card from the pack to the deck or sideboard
      makePick(source.index, target.type, target.row, target.col);
    },
    [makePick]
  );

  const handleDeckToSideboard = useCallback(
    (source: DraftLocation, target: DraftLocation) => {
      // Moving cards between deck and sideboard
      moveCardBetweenDeckStacks(source, target);
    },
    [moveCardBetweenDeckStacks]
  );

  const handleSameLocationClick = useCallback(
    (source: DraftLocation) => {
      if (source.type === locations.pack) {
        // For pack: A quick click/drop is treated as a pick
        return selectCardByIndex(source.index);
      } else if (source.type === locations.deck || source.type === locations.sideboard) {
        // For deck/sideboard: Click toggles between deck and sideboard
        applyCardClickOnDeckStack(source);
      }
    },
    [selectCardByIndex, applyCardClickOnDeckStack]
  );

  const onMoveCard = useCallback(
    async (event: any) => {
      const { active, over } = event;

      // If drag and drop ends without a collision, do nothing
      if (!over) {
        return;
      }

      const source = active.data.current as DraftLocation;
      const target = over.data.current as DraftLocation;

      // Case 1: Drop on the same location
      if (source.equals(target)) {
        const dragTime = Date.now() - (dragStartTime ?? 0);
        if (dragTime < 200) {
          return handleSameLocationClick(source);
        }
        return; // No action if it's a drag to the same place (not a click)
      }

      // Case 2: Invalid target - can't drop onto a pack
      if (target.type === locations.pack) {
        return;
      }

      // Case 3: Card from pack to deck/sideboard
      if (source.type === locations.pack) {
        return handlePackToDeck(source, target);
      }

      // Case 4: Card between deck and sideboard
      return handleDeckToSideboard(source, target);
    },
    [dragStartTime, handleSameLocationClick, handlePackToDeck, handleDeckToSideboard]
  );

  return (
    <>
      <link rel="stylesheet" href="/css/drag-overlay-fix.css" />
      <MainLayout loginCallback={loginCallback}>
        <DisplayContextProvider cubeID={cube.id}>
          <CubeLayout cube={cube} activeLink="playtest">
            <AnimationProvider>
              <FadeOverlay fadeTransition={fadeTransition} />
              <DraftHeader />
              <DndContext 
                onDragEnd={onMoveCard} 
                onDragStart={(event) => {
                  setDragStartTime(Date.now());
                  // Find the card that's being dragged
                  const source = event.active.data.current as DraftLocation;
                  if (source.type === locations.pack) {
                    const cardIndex = state.seats[0].pack[source.index];
                    setActiveCard({ card: createSafeCard(draft.cards[cardIndex]) });
                  } else {
                    const { board } = getLocationReferences(source.type);
                    const cardIndex = board[source.row][source.col][source.index];
                    setActiveCard({ card: createSafeCard(draft.cards[cardIndex]) });
                  }
                }}
              >
                <div className="relative">
                  {state?.seats?.[0]?.pack?.length > 0 ? (
                    <Pack
                      pack={state.seats[0].pack.map((index) => createSafeCard(draft.cards[index]))}
                      loading={draftLoading}
                      loadingPredictions={predictionsLoading}
                      title={packTitle}
                      disabled={packDisabled}
                      ratings={ratings}
                      showRatings={showRatings}
                      setShowRatings={setShowRatings}
                      error={predictError}
                      onRetry={handleRetryPredict}
                      retryInProgress={retryInProgress}
                      onPickMade={(cardIndex) => {
                        if (cardIndex === undefined || state.seats[0].pack.length <= cardIndex) {
                          console.error('Invalid card index for pick:', cardIndex);
                          return;
                        }
                        
                        // Get the card and determine where to put it
                        const cardIndex2 = state.seats[0].pack[cardIndex];
                        const card = draft.cards[cardIndex2];
                        const { row, col } = getCardDefaultRowColumn(card);
                        
                        // Make the pick into the mainboard
                        makePick(cardIndex, locations.deck, row, col);
                      }}
                    />
                  ) : null}
                  
                  <DraftDeckArea 
                    mainboard={mainboard}
                    sideboard={sideboard}
                    cards={draft.cards}
                  />
                </div>
                <CardDragOverlay activeCard={activeCard} />
              </DndContext>
            </AnimationProvider>
          </CubeLayout>
        </DisplayContextProvider>
      </MainLayout>
    </>
  );
};

export default RenderToRoot(CubeDraftPage);
