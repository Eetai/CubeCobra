import { csrfProtection, ensureAuth } from '../../../../routes/middleware';
import { Request, Response } from '../../../../types/express';
import p1p1PackModel from '../../../../dynamo/models/p1p1Pack';
import Cube from '../../../../dynamo/models/cube';
import { isCubeViewable } from '../../../../util/cubefn';
import { cardFromId } from '../../../../util/carddb';
import { createHydratedP1P1Pack } from '../../../../server/util/userUtil';
import { CardDetails } from '../../../../datatypes/Card';

export const createP1P1FromPackHandler = async (req: Request, res: Response) => {
  try {
    const { cubeId, seed, cardIds } = req.body;
    const { user } = req;

    // ensureAuth middleware guarantees user exists
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!cubeId) {
      return res.status(400).json({ error: 'Cube ID is required' });
    }

    if (!seed) {
      return res.status(400).json({ error: 'Seed is required' });
    }

    if (!cardIds || !Array.isArray(cardIds) || cardIds.length === 0) {
      return res.status(400).json({ error: 'Card IDs array is required' });
    }

    // Validate pack size (typical booster pack is 14-15 cards)
    if (cardIds.length > 30) {
      return res.status(400).json({ error: 'Pack size too large (max 30 cards)' });
    }

    // Validate that cardIds are strings
    if (!cardIds.every((id) => typeof id === 'string' && id.length > 0)) {
      return res.status(400).json({ error: 'Invalid card ID format' });
    }

    // Get the cube
    const cube = await Cube.getById(cubeId);
    if (!isCubeViewable(cube, user)) {
      return res.status(404).json({ error: 'Cube not found' });
    }

    // Convert card IDs to card details
    const cardDetails: CardDetails[] = [];
    for (const cardId of cardIds) {
      try {
        const details = cardFromId(cardId);
        if (details) {
          cardDetails.push(details);
        }
      } catch (error) {
        // Skip invalid card IDs, log if needed
        req.logger.error(`Failed to convert card ID ${cardId} to details:`, error);
      }
    }

    if (cardDetails.length === 0) {
      return res.status(400).json({ error: 'No valid cards found' });
    }

    // Create P1P1 pack record with user information
    const packDataWithUser = await createHydratedP1P1Pack(
      {
        cubeId: cube.id,
        cards: cardDetails,
        seed: seed,
      },
      user.id,
    );

    const p1p1Pack = await p1p1PackModel.put(packDataWithUser);

    return res.status(200).json({
      success: true,
      pack: p1p1Pack,
    });
  } catch (err) {
    const error = err as Error;
    req.logger.error(error.message, error.stack);
    return res.status(500).json({ error: 'Error creating P1P1 pack from existing data' });
  }
};

export const routes = [
  {
    method: 'post',
    path: '/',
    handler: [ensureAuth, csrfProtection, createP1P1FromPackHandler],
  },
];
