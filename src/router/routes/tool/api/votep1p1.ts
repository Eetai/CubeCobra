import { csrfProtection, ensureAuth } from '../../../../routes/middleware';
import { Request, Response } from '../../../../types/express';
import p1p1PackModel from '../../../../dynamo/models/p1p1Pack';
import { isValidUUID } from '../../../../util/validation';

export const voteP1P1Handler = async (req: Request, res: Response) => {
  try {
    const { packId, cardIndex } = req.body;
    const { user } = req;

    // ensureAuth middleware guarantees user exists
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!packId || cardIndex === undefined) {
      return res.status(400).json({ error: 'Pack ID and card index are required' });
    }

    // Validate UUID format
    if (!isValidUUID(packId)) {
      return res.status(400).json({ error: 'Invalid pack ID format' });
    }

    // Validate cardIndex is a non-negative integer
    if (!Number.isInteger(cardIndex) || cardIndex < 0) {
      return res.status(400).json({ error: 'Card index must be a non-negative integer' });
    }

    // Validate pack exists
    const pack = await p1p1PackModel.getById(packId);
    if (!pack) {
      return res.status(404).json({ error: 'P1P1 pack not found' });
    }

    // Validate card index
    if (cardIndex < 0 || cardIndex >= pack.cards.length) {
      return res.status(400).json({ error: 'Invalid card index' });
    }

    // Add vote (this handles updating existing votes)
    const updatedPack = await p1p1PackModel.addVote(packId, user.id, user.username, cardIndex);

    if (!updatedPack) {
      return res.status(404).json({ error: 'Failed to update pack with vote' });
    }

    // Get vote summary
    const voteSummary = p1p1PackModel.getVoteSummary(updatedPack, user.id);

    return res.status(200).json({
      success: true,
      votes: voteSummary,
    });
  } catch (err) {
    const error = err as Error;
    req.logger.error(error.message, error.stack);
    return res.status(500).json({ error: 'Error submitting vote' });
  }
};

export const routes = [
  {
    method: 'post',
    path: '/',
    handler: [ensureAuth, csrfProtection, voteP1P1Handler],
  },
];
