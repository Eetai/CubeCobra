import { Request, Response } from '../../../../types/express';
import p1p1PackModel from '../../../../dynamo/models/p1p1Pack';
import Cube from '../../../../dynamo/models/cube';
import { isValidUUID } from '../../../../util/validation';

export const getP1P1Handler = async (req: Request, res: Response) => {
  try {
    const { packId } = req.params;
    const { user } = req;

    if (!packId) {
      return res.status(400).json({ error: 'Pack ID is required' });
    }
    
    // Validate UUID format
    if (!isValidUUID(packId)) {
      return res.status(400).json({ error: 'Invalid pack ID format' });
    }

    // Get the pack
    const pack = await p1p1PackModel.getById(packId);
    if (!pack) {
      return res.status(404).json({ error: 'P1P1 pack not found' });
    }

    // Get cube metadata - this is required data
    const cube = await Cube.getById(pack.cubeId);
    if (!cube) {
      return res.status(404).json({ error: 'Associated cube not found' });
    }

    // Get vote summary (includes user's vote if logged in)
    const voteSummary = p1p1PackModel.getVoteSummary(pack, user?.id);

    return res.status(200).json({
      success: true,
      pack,
      cube: {
        name: cube.name || 'Unknown Cube',
        owner: cube.owner?.username || null,
      },
      votes: voteSummary,
    });
  } catch (err) {
    const error = err as Error;
    req.logger.error(error.message, error.stack);
    return res.status(500).json({ error: 'Error fetching P1P1 pack' });
  }
};

export const routes = [
  {
    method: 'get',
    path: '/:packId',
    handler: [getP1P1Handler],
  },
];