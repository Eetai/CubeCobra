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

<<<<<<< HEAD
  return (
    <>
      <Card className="mb-3">
        <CardBody className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showRatings"
            checked={showRatings}
            onChange={(e) => setShowRatings(e.target.checked)}
          />
          <label htmlFor="showRatings">
            <Text>Show CubeCobra Pick Recommendation</Text>
          </label>
        </CardBody>
      </Card>
      <Row>
        <Col xs={6} sm={4} lg={3} xl={2}>
          <Text semibold lg>Pick Order</Text>
          <Flexbox direction="col" gap="2">
            {picksList
              .filter((list) => list.length > 0)
              .map((list, listindex) => {
                // Calculate base pick number for this pack
                let basePick = 0;
                for (let i = 0; i < listindex; i++) {
                  if (draft.InitialState?.[0]?.[i]?.cards?.length) {
                    basePick += draft.InitialState[0][i].cards.length;
                  }
                }
                
                // Calculate which pick in this pack should be bold
                const currentPickNum = parseInt(pickNumber);
                const pickInThisPack = currentPickNum >= basePick && currentPickNum < basePick + list.length ? 
                  currentPickNum - basePick : -1;

                return (
                  <CardListGroup
                    cards={list.map(({ cardIndex }) => draft.cards[cardIndex])}
                    heading={`Pack ${listindex + 1}`}
                    key={listindex}
                    selectedIndex={pickInThisPack}
                    onClick={(index) => setPickNumber((basePick + index).toString())}
                  />
                );
              })}
          </Flexbox>
        </Col>
        <Col xs={6} sm={8} lg={9} xl={10}>
          <Text semibold lg>{`Pack ${(pack || 0) + 1}: Pick ${pick}`}</Text>
          <CardGrid
            xs={2}
            sm={3}
            md={4}
            lg={5}
            xl={6}
            cards={cardsInPack.map((cardIndex) => draft.cards[cardIndex])}
            hrefFn={(card) => `/tool/card/${card?.details?.scryfall_id}`}
            ratings={showRatings ? ratings : undefined}
            selectedIndex={actualPickIndex}
          />
        </Col>
      </Row>
    </>
  );
};

const DraftmancerBreakdown: React.FC<BreakdownProps> = ({ draft, seatNumber, pickNumber, setPickNumber }) => {
  const { cardsInPack, pick, pack, picksList } = useMemo(() => {
    const log = draft.DraftmancerLog?.players[seatNumber];

    if (!log) {
      return {
        cardsInPack: [],
        pick: 0,
        pack: 0,
        picksList: [],
      };
    }

    const picksList = [];
    let subList = [];
    let cardsInPack: number[] = [];
    //The pick number within the pack, for the overall pick matching pickNumber
    let pick: number = 1;
    //Track the pick number within the pack as we traverse the overall picks, since Draftmancer doesn't segment into packs unlike CubeCobra
    let currentPackPick: number = 0;
    //The pack currently within
    let pack = 1;

    for (let i = 0; i < log.length; i++) {
      currentPackPick += 1;
      subList.push(log[i].pick);
      // if this is the last pack, or the next item is a new pack
      if (i === log.length - 1 || log[i].booster.length < log[i + 1].booster.length) {
        picksList.push(subList);
        subList = [];

        if (i < parseInt(pickNumber)) {
          pack += 1;
          currentPackPick = 0;
        }
      }

      if (i === parseInt(pickNumber)) {
        cardsInPack = log[i].booster;
        pick = currentPackPick;
=======
  const onPickClick = (packIndex: number, pickIndex: number) => {
    let picks = 0;
    for (let i = 0; i < packIndex; i++) {
      if (draft.InitialState?.[0]?.[i]?.cards?.length) {
        picks += draft.InitialState[0][i].cards.length;
>>>>>>> 9598f667 (wip with draftmancer overhaul)
      }
    }
    setPickNumber((picks + pickIndex).toString());
  };

  return (
<<<<<<< HEAD
    <Row>
      <Col xs={6} sm={4} lg={3} xl={2}>
        <Text semibold lg>
          Pick Order
        </Text>
        <Flexbox direction="col" gap="2">
          {picksList
            .filter((list) => list.length > 0)
            .map((list, listindex) => (
              <CardListGroup
                cards={list.map((cardIndex) => draft.cards[cardIndex])}
                heading={`Pack ${listindex + 1}`}
                key={listindex}
                onClick={(index) => {
                  let picks = 0;
                  for (let i = 0; i < listindex; i++) {
                    picks += picksList[i].length;
                  }
                  setPickNumber((picks + index).toString());
                }}
              />
            ))}
        </Flexbox>
      </Col>
      <Col xs={6} sm={8} lg={9} xl={10}>
        <Text semibold lg>{`Pack ${pack || 0}: Pick ${pick}`}</Text>
        <CardGrid
          xs={2}
          sm={3}
          md={4}
          lg={5}
          xl={6}
          cards={cardsInPack.map((cardIndex) => draft.cards[cardIndex])}
          hrefFn={(card) => `/tool/card/${card?.details?.scryfall_id}`}
        />
      </Col>
    </Row>
=======
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
>>>>>>> 9598f667 (wip with draftmancer overhaul)
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
