import React, { useEffect, useMemo, useState } from 'react';

import Deck from '../../datatypes/Draft';
import { getDrafterState } from '../../util/draftutil';
import useLocalStorage from '../hooks/useLocalStorage';
import useQueryParam from '../hooks/useQueryParam';
import Text from './base/Text';
import DraftBreakdownDisplay from './draft/DraftBreakdownDisplay';

export const ACTION_LABELS = Object.freeze({
  pick: 'Picked ',
  trash: 'Trash ',
  pickrandom: 'Randomly Picked ',
  trashrandom: 'Randomly Trashed ',
});

interface BreakdownProps {
  draft: Deck;
  seatNumber: number;
  pickNumber: string;
  setPickNumber: (pickNumber: string) => void;
}

const CubeBreakdown: React.FC<BreakdownProps> = ({ draft, seatNumber, pickNumber, setPickNumber }) => {
  const [ratings, setRatings] = useState<number[]>([]);
  const [pickScores, setPickScores] = useState<{[key: string]: number}>({});
  const [showRatings, setShowRatings] = useLocalStorage(`showDraftRatings-${draft.id}`, true);

  // Handle both CubeCobra and Draftmancer drafts
  const { cardsInPack, pick = 0, pack = 0, picksList } = useMemo(() => {
    if (draft.DraftmancerLog) {
      const log = draft.DraftmancerLog.players[seatNumber];
      if (!log) {
        return { cardsInPack: [], pick: 0, pack: 0, picksList: [] };
      }

      const draftPicksList = [];
      let subList = [];
      let draftCardsInPack: number[] = [];
      let currentPick = 0;
      let currentPack = 1;

      for (let i = 0; i < log.length; i++) {
        subList.push(log[i].pick);
        if (i === log.length - 1 || log[i].booster.length < log[i + 1].booster.length) {
          draftPicksList.push(subList.map(cardIndex => ({ cardIndex })));
          subList = [];

          if (i < parseInt(pickNumber)) {
            currentPack += 1;
          }
        }

        if (i === parseInt(pickNumber)) {
          draftCardsInPack = log[i].booster;
          currentPick = log[i].pick;
        }
      }

      return {
        cardsInPack: draftCardsInPack.map(index => ({ cardIndex: index })),
        pick: currentPick,
        pack: currentPack - 1,
        picksList: draftPicksList
      };
    }

    const drafterState = getDrafterState(draft, seatNumber, parseInt(pickNumber));
    return {
      cardsInPack: drafterState.cardsInPack.map(index => ({ cardIndex: index })),
      pick: drafterState.pick ?? 0,
      pack: drafterState.pack ?? 0,
      picksList: drafterState.picksList.map(list => 
        list.map(item => ({ cardIndex: typeof item === 'number' ? item : item.cardIndex }))
      )
    };
  }, [draft, seatNumber, pickNumber]);

  // Get the actual pick that was made in this pack
  const currentPackPicks = picksList[pack] ?? [];
  const currentPickData = currentPackPicks[pick - 1];
  const actualPickIndex = cardsInPack.findIndex(
    item => item.cardIndex === (currentPickData ? currentPickData.cardIndex : undefined)
  );

  // Create a stable key for the current pick
  const pickKey = useMemo(() => `${pack}-${pick}`, [pack, pick]);

  // Only fetch predictions when pack changes
  useEffect(() => {
    const fetchPredictions = async () => {
      if (!cardsInPack.length) return;
      if (pickScores[pickKey] !== undefined) return;

      try {
        const allPicks: number[] = [];
        for (let packIndex = 0; packIndex <= (pack || 0); packIndex++) {
          const packPicks = picksList[packIndex] || [];
          const picksToInclude = packIndex === pack ? pick - 1 : packPicks.length;
          for (let i = 0; i < picksToInclude; i++) {
            const pick = packPicks[i];
            if (pick?.cardIndex !== undefined) {
              allPicks.push(pick.cardIndex);
            }
          }
        }

        const response = await fetch(`/api/draftbots/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pack: cardsInPack.map(item => draft.cards[item.cardIndex]?.details?.oracle_id).filter(Boolean),
            picks: allPicks.map(idx => draft.cards[idx]?.details?.oracle_id).filter(Boolean)
          })
        });

        if (response.ok) {
          const data = await response.json();
          const newRatings = new Array(cardsInPack.length).fill(0);
          data.prediction.forEach((pred: { oracle: string; rating: number }) => {
            const cardIndex = cardsInPack.findIndex(
              idx => draft.cards[idx.cardIndex].details?.oracle_id === pred.oracle
            );
            if (cardIndex !== -1) {
              newRatings[cardIndex] = pred.rating;
            }
          });

          if (actualPickIndex !== -1) {
            const maxRating = Math.max(...newRatings);
            const pickedRating = newRatings[actualPickIndex];
            const score = Math.round((pickedRating - maxRating) * 100);
            setPickScores(prev => ({
              ...prev,
              [`${pack}-${pick}`]: score
            }));
          }

          setRatings(newRatings);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching predictions:', error);
      }
    };

    fetchPredictions();
  }, [draft.cards, cardsInPack, pickKey, actualPickIndex, pack, pick, pickScores, picksList]);

  const onPickClick = (packIndex: number, pickIndex: number) => {
    let picks = 0;
    for (let i = 0; i < packIndex; i++) {
      if (draft.InitialState?.[0]?.[i]?.cards?.length) {
        picks += draft.InitialState[0][i].cards.length;
      }
    }
    setPickNumber((picks + pickIndex).toString());
  };

  return (
    <DraftBreakdownDisplay
      showRatings={showRatings}
      setShowRatings={setShowRatings}
      packNumber={pack}
      pickNumber={pick}
      cardsInPack={cardsInPack}
      picksList={picksList}
      ratings={showRatings ? ratings : undefined}
      actualPickIndex={actualPickIndex}
      cards={draft.cards}
      onPickClick={onPickClick}
    />
  );
};

interface DecksPickBreakdownProps {
  draft: Deck;
  seatNumber: number;
  defaultIndex?: string;
  currentPickNumber?: string;
  basePickNumber?: string;
}

const DecksPickBreakdown: React.FC<DecksPickBreakdownProps> = ({ draft, seatNumber, defaultIndex = '0' }) => {
  const [pickNumber, setPickNumber] = useQueryParam('pick', defaultIndex);

  if (!draft.InitialState && !draft.DraftmancerLog) {
    return <Text>Sorry, we cannot display the pick breakdown for this draft.</Text>;
  }

  return (
    <CubeBreakdown 
      pickNumber={pickNumber} 
      seatNumber={seatNumber} 
      draft={draft} 
      setPickNumber={setPickNumber} 
    />
  );
};

export default DecksPickBreakdown;