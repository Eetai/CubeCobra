import Cube from '../../../dynamo/models/cube';
import User from '../../../dynamo/models/user';
import { csrfProtection } from '../../../routes/middleware';
import { NextFunction, Request, Response } from '../../../types/express';
import { isCubeViewable } from '../../../util/cubefn';

export const ensureCubeVisible = async (req: Request, res: Response, next: NextFunction) => {
  const { id, type } = req.params;

  if (type === 'cube') {
    const cube = await Cube.getById(id);
    if (!isCubeViewable(cube, req.user)) {
      res.status(404).send({ error: 'Cube not found' });
      return;
    } else {
      //Pass the cube through to the handler so it doesn't have to be loaded again
      res.locals.cube = cube;
    }
  }

  next();
};

export const getFollowers = async (req: Request, res: Response) => {
  try {
    const { id, type } = req.params;

    const limit = parseInt((req.query?.limit || '100') as string, 10);
    const skip = parseInt((req.query?.skip || '0') as string, 10);

    let followerIds = [];
    if (type === 'user') {
      const user = await User.getById(id);
      followerIds = user?.following || [];
    } else if (type === 'cube') {
      followerIds = res.locals.cube?.following || [];
      //Cleanup after we are done with the cube
      delete res.locals.cube;
    } else {
      res.status(400).send({ error: 'Unknow follower type' });
      return;
    }

    const slice = followerIds.slice(skip, skip + limit);
    const hasMore = followerIds.length >= skip + limit;

    const followers = await User.batchGet(slice);
    res.status(200).send({ followers: followers, hasMore });
  } catch {
    res.status(500).send({ error: 'Error' });
  }
};

export const routes = [
  {
    method: 'get',
    path: '/:type/:id',
    handler: [csrfProtection, ensureCubeVisible, getFollowers],
  },
];
