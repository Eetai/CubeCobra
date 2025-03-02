import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTransition } from '@react-spring/web';
import type { PredictResponse } from 'src/router/routes/api/draftbots/batchpredict.ts';
import type { State } from 'src/router/routes/draft/finish.ts';

import { CSRFContext } from 'contexts/CSRFContext';
import Draft, { DraftStep } from 'datatypes/Draft';
import { location, locations } from 'drafting/DraftLocation';
import useLocalStorage from 'hooks/useLocalStorage';
import { createSafeCard } from '../utils/prefetchUtil';
import { getCardDefaultRowColumn, setupPicks } from '../../util/draftutil';

interface BatchPredictRequest {
  pack: string[];
  picks: string[];
}

interface DraftState {
  loading: boolean;
  predictionsLoading: boolean;
  predictError: boolean;
  retryInProgress: boolean;
}

// Utility functions for the hook
const fetchBatchPredict = async (inputs: BatchPredictRequest[]): Promise<PredictResponse> => {
  const response = await fetch('/api/draftbots/batchpredict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch batch predictions');
  }

  return response.json();
};

const processPredictions = (json: PredictResponse, packCards: any[]) => {
  // Create a map of oracle IDs to ratings
  const predictionsMap = new Map(json.prediction[0].map((p) => [p.oracle, p.rating]));
  // Then add ratings to packCards while maintaining pack order
  return packCards.map((card) => predictionsMap.get(card.oracle_id) || 0);
};

const getInitialState = (draft: Draft): State => {
  const stepQueue: DraftStep[] = [];

  if (draft.InitialState) {
    // only look at the first seat
    const seat = draft.InitialState[0];

    for (const pack of seat) {
      stepQueue.push(...pack.steps, { action: 'endpack', amount: null });
    }
  }

  // if there are no picks made, return the initial state
  return {
    seats: draft.seats.map((_, index) => ({
      picks: [],
      trashed: [],
      pack: draft.InitialState ? draft.InitialState[index][0].cards : [],
    })),
    stepQueue,
    pack: 1,
    pick: 1,
  };
};

// Main hook implementation
export const useDraft = (draft: Draft) => {
  const [state, setState] = useLocalStorage(`draftstate-${draft.id}`, getInitialState(draft));
  const [mainboard, setMainboard] = useLocalStorage(`mainboard-${draft.id}`, setupPicks(2, 8));
  const [sideboard, setSideboard] = useLocalStorage(`sideboard-${draft.id}`, setupPicks(1, 8));
  const [ratings, setRatings] = useState<number[]>([]);
  const [currentPredictions, setCurrentPredictions] = useState<PredictResponse | null>(null);
  const [draftState, setDraftState] = useState<DraftState>({
    loading: false,
    predictionsLoading: false,
    predictError: false,
    retryInProgress: false,
  });
  const [isFading, setIsFading] = useState(false);
  const { csrfFetch } = useContext(CSRFContext);

  // Transition effect for draft completion fade
  const fadeTransition = useTransition(isFading, {
    from: { opacity: 0, backdropFilter: 'blur(0px)', backgroundColor: 'rgba(0, 0, 0, 0)' },
    enter: { opacity: 1, backdropFilter: 'blur(5px)', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
    leave: { opacity: 0, backdropFilter: 'blur(0px)', backgroundColor: 'rgba(0, 0, 0, 0)' },
    config: { duration: 1000, tension: 120, friction: 14 },
    onRest: () => {
      if (isFading) {
        window.location.href = `/draft/deckbuilder/${draft.id}`;
      }
    },
  });

  const getLocationReferences = useCallback(
    (type: location): { board: any[][][]; setter: React.Dispatch<React.SetStateAction<any[][][]>> } => {
      if (type === locations.deck) {
        return {
          board: mainboard,
          setter: setMainboard,
        };
      } else {
        return {
          board: sideboard,
          setter: setSideboard,
        };
      }
    },
    [mainboard, setMainboard, sideboard, setSideboard],
  );

  const getPredictions = useCallback(async (request: { 
    state: any, 
    packCards: { index: number; oracle_id: string }[] 
  }) => {
    setDraftState((prev) => ({ ...prev, predictionsLoading: true, predictError: false }));
    try {
      const inputs = request.state.seats.map((seat: any) => ({
        pack: seat.pack
          .map((index: number) => draft.cards[index]?.details?.oracle_id)
          .filter((id: string | undefined): id is string => Boolean(id)),
        picks: seat.picks
          .map((index: number) => draft.cards[index]?.details?.oracle_id)
          .filter((id: string | undefined): id is string => Boolean(id))
      }));

      const json = await fetchBatchPredict(inputs);
      setCurrentPredictions(json);
      setRatings(processPredictions(json, request.packCards));
      return json;
    } catch (error) {
      console.error('Error fetching predictions:', error);
      setDraftState((prev) => ({ ...prev, predictError: true }));
      return null;
    } finally {
      setDraftState((prev) => ({ ...prev, predictionsLoading: false }));
    }
  }, [draft.cards]);

  const endDraft = useCallback(async () => {
    // Immediately show the fade overlay before starting the API call
    setIsFading(true);
    setDraftState((prev) => ({ ...prev, loading: true }));
    
    try {
      const response = await csrfFetch(`/draft/finish/${draft.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          state,
          mainboard,
          sideboard,
        }),
      });

      if (response.ok) {
        // Keep fading active, update loading state
        setDraftState((prev) => ({ ...prev, loading: false }));
        // The fadeTransition's onRest will handle navigation
      } else {
        // If there's an error, stop the fading effect and show error
        setIsFading(false);
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
    } catch (err) {
      console.error('endDraft error caught:', err);
      setIsFading(false);
      setDraftState((prev) => ({ ...prev, loading: false }));
    }
  }, [csrfFetch, draft.id, mainboard, sideboard, state]);

  const handleRetryPredict = useCallback(async () => {
    if (draftState.retryInProgress || !state?.seats?.[0]?.pack) {
      return;
    }

    setDraftState((prev) => ({ ...prev, retryInProgress: true }));
    try {
      const currentState = state;
      const packCards = currentState.seats[0].pack.map((index) => ({
        index,
        oracle_id: draft.cards[index]?.details?.oracle_id || '',
      }));
      await getPredictions({ state: currentState, packCards });
    } finally {
      setDraftState((prev) => ({ ...prev, retryInProgress: false }));
    }
  }, [state, draft.cards, getPredictions, draftState.retryInProgress]);

  const makePick = useCallback(
    async (index: number, location: location, row: number, col: number) => {
      if (draftState.predictError || draftState.loading || draftState.predictionsLoading) {
        console.log('Pick blocked:', { predictError: draftState.predictError, loading: draftState.loading, predictionsLoading: draftState.predictionsLoading });
        return;
      }
      
      setDraftState((prev) => ({ ...prev, loading: true }));
      setRatings([]); // Clear ratings
      const newState = { ...state };

      // look at the current step
      const currentStep = newState.stepQueue[0];

      //The board only changes when there is a pick (human or auto) action
      if (currentStep.action.includes('pick')) {
        const { board, setter } = getLocationReferences(location);
        board[row][col].push(state.seats[0].pack[index]);
        setter(board);
      }

      // if amount is more than 1
      if (currentStep.amount && currentStep.amount > 1) {
        // we will decrement the amount and make the pick
        newState.stepQueue[0] = { ...currentStep, amount: currentStep.amount - 1 };
      } else {
        // we need to pop the current step
        newState.stepQueue.shift();
      }

      if (!currentStep) {
        // This should never happen, but if it does, the draft finishing should be in progress
        setDraftState((prev) => ({ ...prev, loading: false }));
        return;
      }

      if (currentStep.action === 'endpack' || currentStep.action === 'pass') {
        // This should never happen
        setDraftState((prev) => ({ ...prev, loading: false }));
        return;
      }

      if (currentStep.action === 'pick' || currentStep.action === 'trash') {
        // Use existing predictions for bot picks
        if (currentPredictions?.prediction) {
          const picks = currentPredictions.prediction.slice(1).map((seat, index) => {
            const pack = state.seats[index + 1].pack.map((i) => draft.cards[i].details?.oracle_id);

            if (pack.length === 0) {
              return -1;
            }

            if (seat.length === 0) {
              // pick at random
              return Math.floor(Math.random() * pack.length);
            }

            const oracle = seat.reduce((prev, current) => (prev.rating > current.rating ? prev : current)).oracle;
            return pack.findIndex((oracleId) => oracleId === oracle);
          });

          // make all the picks
          if (currentStep.action === 'pick') {
            newState.seats[0].picks.unshift(state.seats[0].pack[index]);
          } else if (currentStep.action === 'trash') {
            newState.seats[0].trashed.unshift(state.seats[0].pack[index]);
          }
          newState.seats[0].pack.splice(index, 1);

          for (let i = 1; i < state.seats.length; i++) {
            const pick = picks[i - 1];

            if (currentStep.action === 'pick') {
              newState.seats[i].picks.unshift(state.seats[i].pack[pick]);
            } else if (currentStep.action === 'trash') {
              newState.seats[i].trashed.unshift(state.seats[i].pack[pick]);
            }
            newState.seats[i].pack.splice(pick, 1);
          }
        }
      } 
      
      else if (currentStep.action === 'pickrandom' || currentStep.action === 'trashrandom') {
        // make random selection
        if (currentStep.action === 'pickrandom') {
          newState.seats[0].picks.unshift(state.seats[0].pack[index]);
          for (let i = 1; i < state.seats.length; i++) {
            const randomIndex = Math.floor(Math.random() * state.seats[i].pack.length);
            newState.seats[i].picks.unshift(state.seats[i].pack[randomIndex]);
            newState.seats[i].pack.splice(randomIndex, 1);
          }
        } else if (currentStep.action === 'trashrandom') {
          newState.seats[0].trashed.unshift(state.seats[0].pack[index]);

          for (let i = 1; i < state.seats.length; i++) {
            const randomIndex = Math.floor(Math.random() * state.seats[i].pack.length);
            newState.seats[i].trashed.unshift(randomIndex);
            newState.seats[i].pack.splice(randomIndex, 1);
          }
        }
        newState.seats[0].pack.splice(index, 1);
      }

      // get the next step
      const nextStep = newState.stepQueue[0];

      // either pass the pack, open the next pack, or end the draft
      if (!nextStep) {
        // should never happen
        setDraftState((prev) => ({ ...prev, loading: false }));
        return;
      }

      if (nextStep.action === 'pass') {
        // pass left on an odd pick, right on an even pick
        const direction = state.pack % 2 === 0 ? 1 : -1;
        const packs = newState.seats.map((seat) => seat.pack);

        for (let i = 0; i < state.seats.length; i++) {
          const nextSeat = newState.seats[(i + direction + draft.seats.length) % state.seats.length];
          nextSeat.pack = packs[i];
        }

        newState.pick += 1;

        // pop the step
        newState.stepQueue.shift();
      }

      // get the next step after handling pass
      const nextStepAfterPass = newState.stepQueue[0];

      if (nextStepAfterPass && nextStepAfterPass.action === 'endpack') {
        // we open the next pack or end the draft
        if (draft.InitialState && state.pack === draft.InitialState[0].length) {
          // Save state before attempting to end draft
          setState(newState);
          setDraftState((prev) => ({ ...prev, loading: false }));
          
          // Now attempt to end the draft
          await endDraft();
          return;
        }

        // open the next pack
        newState.pack += 1;
        newState.pick = 1;

        for (let i = 0; i < state.seats.length; i++) {
          newState.seats[i].pack = draft.InitialState ? draft.InitialState[i][newState.pack - 1].cards : [];
        }

        // pop the step
        newState.stepQueue.shift();

        // Clear ratings before opening new pack
        setRatings([]);
        
        // Get ratings for new pack after it's opened
        if (newState.seats[0].pack.length > 0) {
          const request = {
            state: newState,
            packCards: newState.seats[0].pack
              .map((index) => ({
                index,
                oracle_id: draft.cards[index]?.details?.oracle_id || '',
              }))
              .filter((card): card is { index: number; oracle_id: string } => 
                Boolean(card.oracle_id))
          };
          
          await getPredictions(request);
        }
      }

      setState(newState);
      setDraftState((prev) => ({ ...prev, loading: false }));
    },
    [draft.InitialState, draft.cards, draft.seats.length, endDraft, getLocationReferences, setState, state, currentPredictions, getPredictions, draftState.predictError, draftState.loading, draftState.predictionsLoading],
  );

  const selectCardByIndex = useCallback(
    (packIndex: number) => {
      console.log(`selectCardByIndex called with packIndex: ${packIndex}`);
      
      if (packIndex < 0 || packIndex >= state.seats[0].pack.length) {
        console.error('Invalid pack index:', packIndex);
        return;
      }

      const cardIndex = state.seats[0].pack[packIndex];
      const card = createSafeCard(draft.cards[cardIndex]);
      
      const { row, col } = getCardDefaultRowColumn(card);
      makePick(packIndex, locations.deck, row, col);
    },
    [state.seats, draft.cards, makePick],
  );

  // Auto-pick effect
  useEffect(() => {
    if (
      state.stepQueue[0] &&
      (state.stepQueue[0].action === 'pickrandom' || state.stepQueue[0].action === 'trashrandom') &&
      state.seats[0].pack.length > 0 &&
      !draftState.loading
    ) {
      setTimeout(() => {
        selectCardByIndex(Math.floor(Math.random() * state.seats[0].pack.length));
      }, 1000);
    }
  }, [selectCardByIndex, draftState.loading, state.stepQueue, state.seats]);

  // Initial P1P1 ratings fetch
  useEffect(() => {
    const fetchInitialRatings = async () => {
      if (state?.seats?.[0]?.pack?.length > 0 && !ratings.length) {
        const request = {
          state,
          packCards: state.seats[0].pack.map((index) => ({
            index,
            oracle_id: draft.cards[index]?.details?.oracle_id || '',
          }))
        };
        await getPredictions(request);
      }
    };

    fetchInitialRatings();
  }, [draft.cards, state, getPredictions, ratings]);

  // Pack title computation
  const packTitle = useMemo(() => {
    const nextStep = state.stepQueue[0];

    if (draftState.loading) {
      if (state.stepQueue.length <= 1) {
        return 'Finishing up draft...';
      }
      return 'Waiting for next pack...';
    }

    switch (nextStep.action) {
      case 'pick':
        return `Pack ${state.pack} Pick ${state.pick}: Pick ${nextStep.amount} card${nextStep.amount && nextStep.amount > 1 ? 's' : ''}`;
      case 'trash':
        return `Pack ${state.pack} Pick ${state.pick}: Trash ${nextStep.amount} card${nextStep.amount && nextStep.amount > 1 ? 's' : ''}`;
      case 'endpack':
        return 'Waiting for next pack to open...';
      case 'pickrandom':
        return 'Picking random selection...';
      case 'trashrandom':
        return 'Trashing random selection...';
      default:
        return '';
    }
  }, [state, draftState.loading]);

  // Calculate disabled state for the pack
  const packDisabled = state.stepQueue[0]?.action === 'pickrandom' || 
                     state.stepQueue[0]?.action === 'trashrandom' || 
                     draftState.predictError || 
                     draftState.predictionsLoading;

  // Return all the values and functions that the component needs
  return {
    state,
    mainboard,
    sideboard,
    ratings,
    draftLoading: draftState.loading,
    predictionsLoading: draftState.predictionsLoading,
    predictError: draftState.predictError,
    retryInProgress: draftState.retryInProgress,
    isFading,
    fadeTransition,
    packTitle,
    packDisabled,
    makePick,
    selectCardByIndex,
    handleRetryPredict,
    endDraft,
    getLocationReferences
  };
};

export default useDraft;
