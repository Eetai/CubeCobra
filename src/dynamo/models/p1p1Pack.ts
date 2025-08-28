import { NativeAttributeValue } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

import P1P1Pack, { P1P1Vote, P1P1VoteResult, P1P1VoteSummary, UnhydratedP1P1Pack } from '../../datatypes/P1P1Pack';
import createClient from '../util';

const client = createClient({
  name: 'P1P1_PACKS',
  partitionKey: 'id',
  indexes: [
    {
      name: 'ByCube',
      partitionKey: 'cubeId',
      sortKey: 'date',
    },
  ],
  attributes: {
    id: 'S',
    cubeId: 'S',
    date: 'N',
  },
});

const hydrate = (item: UnhydratedP1P1Pack | any): P1P1Pack => {
  // Convert votesByUser map to votes array for the interface
  const votes: P1P1Vote[] = item.votesByUser ? 
    Object.entries(item.votesByUser).map(([userId, vote]: [string, any]) => ({
      userId,
      userName: vote.userName,
      cardIndex: vote.cardIndex,
      date: vote.date
    })) : [];

  return {
    id: item.id!,
    cubeId: item.cubeId,
    cards: item.cards,
    seed: item.seed,
    date: item.date!,
    createdBy: item.createdBy,
    createdByUsername: item.createdByUsername!,
    votes,
    botPick: item.botPick,
    botWeights: item.botWeights,
  };
};

const p1p1Pack = {
  getById: async (id: string): Promise<P1P1Pack | undefined> => {
    const result = await client.get(id);
    
    if (result.Item) {
      return hydrate(result.Item as UnhydratedP1P1Pack);
    }

    return undefined;
  },

  queryByCube: async (
    cubeId: string,
    lastKey?: Record<string, NativeAttributeValue>,
    limit: number = 20,
  ): Promise<{ items?: P1P1Pack[]; lastKey?: Record<string, NativeAttributeValue> }> => {
    const result = await client.query({
      IndexName: 'ByCube',
      KeyConditionExpression: 'cubeId = :cubeId',
      ExpressionAttributeValues: {
        ':cubeId': cubeId,
      },
      ExclusiveStartKey: lastKey,
      ScanIndexForward: false, // Most recent first
      Limit: limit,
    });

    return {
      items: result.Items?.map((item) => hydrate(item as UnhydratedP1P1Pack)),
      lastKey: result.LastEvaluatedKey,
    };
  },

  put: async (document: UnhydratedP1P1Pack): Promise<P1P1Pack> => {
    const id = document.id || uuidv4();
    const date = document.date || Date.now();

    const item: any = {
      ...document,
      id,
      date,
      votesByUser: {},
    };

    await client.put(item);

    return hydrate(item);
  },


  deleteById: async (id: string): Promise<void> => {
    await client.delete({ id });
  },

  // Vote-related methods
  addVote: async (packId: string, userId: string, userName: string, cardIndex: number): Promise<P1P1Pack | null> => {
    // First, verify the pack exists
    const pack = await p1p1Pack.getById(packId);
    if (!pack) return null;

    // Create new vote (without userId since it's the map key)
    const newVote = {
      userName,
      cardIndex,
      date: Date.now(),
    };

    try {
      // Atomically set the user's vote (votesByUser map always exists on new packs)
      const result = await client.update({
        Key: { id: packId },
        UpdateExpression: 'SET #voteMap.#userId = :newVote',
        ConditionExpression: 'attribute_exists(id)',
        ExpressionAttributeNames: {
          '#voteMap': 'votesByUser',
          '#userId': userId,
        },
        ExpressionAttributeValues: {
          ':newVote': newVote,
        },
        ReturnValues: 'ALL_NEW',
      });

      if (result.Attributes) {
        return hydrate(result.Attributes as UnhydratedP1P1Pack);
      }
      return null;
    } catch {
      // If the atomic update fails, return null
      return null;
    }
  },


  getVoteSummary: (pack: P1P1Pack, currentUserId?: string): P1P1VoteSummary => {
    const votes = pack.votes || [];
    const totalVotes = votes.length;

    // Count votes per card
    const voteCounts: { [cardIndex: number]: number } = {};
    let userVote: number | undefined;

    votes.forEach((vote) => {
      voteCounts[vote.cardIndex] = (voteCounts[vote.cardIndex] || 0) + 1;
      if (currentUserId && vote.userId === currentUserId) {
        userVote = vote.cardIndex;
      }
    });

    // Create results array
    const results: P1P1VoteResult[] = pack.cards.map((_, index) => ({
      cardIndex: index,
      voteCount: voteCounts[index] || 0,
      percentage: totalVotes > 0 ? ((voteCounts[index] || 0) / totalVotes) * 100 : 0,
    }));

    return {
      totalVotes,
      results,
      userVote,
      botPick: pack.botPick,
      botWeights: pack.botWeights,
    };
  },

  createTable: async () => client.createTable(),
};

module.exports = p1p1Pack;
export default p1p1Pack;
