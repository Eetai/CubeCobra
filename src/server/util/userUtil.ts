import User from '../../dynamo/models/user';
import { UnhydratedP1P1Pack } from '../../datatypes/P1P1Pack';
import { CardDetails } from '../../datatypes/Card';
import { draft } from '../../util/ml';

/**
 * Utility functions for handling user data in P1P1 packs
 */

interface BotPrediction {
  oracle: string;
  rating: number;
}

interface BotResult {
  botPickIndex: number | null;
  botWeights: number[];
}

/**
 * Get bot prediction for a pack of cards
 */
export const getBotPrediction = async (cards: CardDetails[]): Promise<BotResult> => {
  try {
    const oracleIds = cards.map(card => card.oracle_id).filter(Boolean);
    
    if (oracleIds.length === 0) {
      return { botPickIndex: null, botWeights: [] };
    }
    
    // Call the draft function directly instead of making HTTP request
    const predictions: BotPrediction[] = draft(oracleIds, []); // Empty picks for P1P1
    
    if (!predictions || predictions.length === 0) {
      return { botPickIndex: null, botWeights: [] };
    }

    // Create weights array aligned with pack cards
    const botWeights = new Array(cards.length).fill(0);
    
    // Map prediction ratings to card positions
    predictions.forEach((prediction) => {
      const cardIndex = cards.findIndex(card => card.oracle_id === prediction.oracle);
      if (cardIndex >= 0) {
        botWeights[cardIndex] = prediction.rating;
      }
    });

    // Find the highest rated card
    const topPick = predictions[0]; // Already sorted by rating descending
    const botPickIndex = cards.findIndex(card => card.oracle_id === topPick.oracle);
    
    return {
      botPickIndex: botPickIndex >= 0 ? botPickIndex : null,
      botWeights,
    };
  } catch (err) {
    // Silently fail for bot predictions to avoid breaking pack creation
    return { botPickIndex: null, botWeights: [] };
  }
};


/**
 * Create a fully hydrated P1P1Pack with all computed data
 * Includes user information, bot predictions, and ratings
 */
export const createHydratedP1P1Pack = async (
  packData: Omit<UnhydratedP1P1Pack, 'createdBy' | 'createdByUsername' | 'botPick' | 'botWeights'>,
  userId: string
): Promise<UnhydratedP1P1Pack> => {
  let username = userId; // fallback

  try {
    const user = await User.getById(userId);
    if (user?.username) {
      username = user.username;
    }
  } catch (error) {
    // Caller should handle logging if needed
  }

  // Get bot prediction for this pack
  const botResult = await getBotPrediction(packData.cards);

  return {
    ...packData,
    createdBy: userId,
    createdByUsername: username,
    botPick: botResult.botPickIndex ?? undefined,
    botWeights: botResult.botWeights.length > 0 ? botResult.botWeights : undefined,
  };
};

