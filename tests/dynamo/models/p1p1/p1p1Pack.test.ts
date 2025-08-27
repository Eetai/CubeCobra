import P1P1Pack, { UnhydratedP1P1Pack } from '../../../../src/datatypes/P1P1Pack';
import { createCardDetails } from '../../../test-utils/data';

const uuid = jest.requireActual('uuid');

// Mock the createClient function to return our mock client
const mockClient = {
  get: jest.fn(),
  query: jest.fn(),
  put: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createTable: jest.fn(),
};

jest.mock('../../../../src/dynamo/util', () => ({
  __esModule: true,
  default: jest.fn(() => mockClient),
}));

// Import the model after mocking
import p1p1PackModel from '../../../../src/dynamo/models/p1p1Pack';

const createP1P1Pack = (overrides?: Partial<P1P1Pack>): P1P1Pack => ({
  id: uuid.v4(),
  cubeId: uuid.v4(),
  cards: [createCardDetails(), createCardDetails(), createCardDetails()],
  seed: 'test-seed',
  date: Date.now(),
  createdBy: 'test-user',
  createdByUsername: 'testuser',
  votes: [],
  botPick: 0,
  botWeights: [0.8, 0.6, 0.4],
  ...overrides,
});

const createUnhydratedP1P1Pack = (overrides?: Partial<UnhydratedP1P1Pack>): UnhydratedP1P1Pack => ({
  cubeId: uuid.v4(),
  cards: [createCardDetails(), createCardDetails(), createCardDetails()],
  seed: 'test-seed',
  createdBy: 'test-user',
  createdByUsername: 'testuser',
  botPick: 0,
  botWeights: [0.8, 0.6, 0.4],
  ...overrides,
});

describe('P1P1Pack Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getById', () => {
    it('should return pack when found', async () => {
      const packId = uuid.v4();
      const mockItem = {
        id: packId,
        cubeId: uuid.v4(),
        cards: [createCardDetails()],
        seed: 'test-seed',
        date: Date.now(),
        createdBy: 'test-user',
        createdByUsername: 'testuser',
        votesByUser: {
          user1: { userId: 'user1', userName: 'User1', cardIndex: 0, date: Date.now() },
        },
        botPick: 0,
        botWeights: [0.8],
      };

      mockClient.get.mockResolvedValue({
        Item: mockItem,
      });

      const result = await p1p1PackModel.getById(packId);

      expect(mockClient.get).toHaveBeenCalledWith(packId);

      expect(result).toEqual({
        id: packId,
        cubeId: mockItem.cubeId,
        cards: mockItem.cards,
        seed: mockItem.seed,
        date: mockItem.date,
        createdBy: mockItem.createdBy,
        createdByUsername: mockItem.createdByUsername,
        votes: [{ userId: 'user1', userName: 'User1', cardIndex: 0, date: expect.any(Number) }],
        botPick: 0,
        botWeights: [0.8],
      });
    });

    it('should return undefined when not found', async () => {
      const packId = uuid.v4();

      mockClient.get.mockResolvedValue({
        Item: undefined,
      });

      const result = await p1p1PackModel.getById(packId);

      expect(result).toBeUndefined();
    });
  });

  describe('queryByCube', () => {
    it('should return packs for cube with default limit', async () => {
      const cubeId = uuid.v4();
      const mockItems = [
        {
          id: uuid.v4(),
          cubeId,
          cards: [createCardDetails()],
          seed: 'seed1',
          date: Date.now(),
          createdBy: 'user1',
          createdByUsername: 'User1',
          votesByUser: {},
        },
        {
          id: uuid.v4(),
          cubeId,
          cards: [createCardDetails()],
          seed: 'seed2',
          date: Date.now() - 1000,
          createdBy: 'user2',
          createdByUsername: 'User2',
          votesByUser: {},
        },
      ];

      mockClient.query.mockResolvedValue({
        Items: mockItems,
        LastEvaluatedKey: { id: 'last-key', date: 12345 },
      });

      const result = await p1p1PackModel.queryByCube(cubeId);

      expect(mockClient.query).toHaveBeenCalledWith({
        IndexName: 'ByCube',
        KeyConditionExpression: 'cubeId = :cubeId',
        ExpressionAttributeValues: {
          ':cubeId': cubeId,
        },
        ExclusiveStartKey: undefined,
        ScanIndexForward: false,
        Limit: 20,
      });

      expect(result.items).toHaveLength(2);
      expect(result.lastKey).toEqual({ id: 'last-key', date: 12345 });
    });

    it('should support custom limit and pagination', async () => {
      const cubeId = uuid.v4();
      const lastKey = { id: 'previous-key', date: 67890 };

      mockClient.query.mockResolvedValue({
        Items: [],
        LastEvaluatedKey: undefined,
      });

      const result = await p1p1PackModel.queryByCube(cubeId, lastKey, 10);

      expect(mockClient.query).toHaveBeenCalledWith({
        IndexName: 'ByCube',
        KeyConditionExpression: 'cubeId = :cubeId',
        ExpressionAttributeValues: {
          ':cubeId': cubeId,
        },
        ExclusiveStartKey: lastKey,
        ScanIndexForward: false,
        Limit: 10,
      });

      expect(result.items).toEqual([]);
      expect(result.lastKey).toBeUndefined();
    });
  });

  describe('put', () => {
    it('should create new pack with generated ID and date', async () => {
      const unhydratedPack = createUnhydratedP1P1Pack();

      mockClient.put.mockResolvedValue(undefined);

      const result = await p1p1PackModel.put(unhydratedPack);

      expect(mockClient.put).toHaveBeenCalledWith({
        ...unhydratedPack,
        id: expect.any(String),
        date: expect.any(Number),
        votesByUser: {},
      });

      expect(result).toEqual({
        id: expect.any(String),
        cubeId: unhydratedPack.cubeId,
        cards: unhydratedPack.cards,
        seed: unhydratedPack.seed,
        date: expect.any(Number),
        createdBy: unhydratedPack.createdBy,
        createdByUsername: unhydratedPack.createdByUsername,
        votes: [],
        botPick: unhydratedPack.botPick,
        botWeights: unhydratedPack.botWeights,
      });
    });

    it('should use provided ID and date if given', async () => {
      const unhydratedPack = createUnhydratedP1P1Pack({
        id: 'existing-id',
        date: 12345,
      });

      mockClient.put.mockResolvedValue(undefined);

      const result = await p1p1PackModel.put(unhydratedPack);

      expect(mockClient.put).toHaveBeenCalledWith({
        ...unhydratedPack,
        id: 'existing-id',
        date: 12345,
        votesByUser: {},
      });

      expect(result.id).toBe('existing-id');
      expect(result.date).toBe(12345);
    });
  });

  describe('deleteById', () => {
    it('should delete pack by ID', async () => {
      const packId = uuid.v4();

      mockClient.delete.mockResolvedValue(undefined);

      await p1p1PackModel.deleteById(packId);

      expect(mockClient.delete).toHaveBeenCalledWith({ id: packId });
    });

    it('should handle delete errors gracefully', async () => {
      const packId = uuid.v4();

      mockClient.delete.mockRejectedValue(new Error('DynamoDB error'));

      await expect(p1p1PackModel.deleteById(packId)).rejects.toThrow('DynamoDB error');
    });
  });

  describe('addVote', () => {
    it('should add vote and return updated pack', async () => {
      const packId = uuid.v4();
      const pack = createP1P1Pack({ id: packId });
      const updatedPack = {
        ...pack,
        votesByUser: {
          user1: { userId: 'user1', userName: 'TestUser', cardIndex: 1, date: expect.any(Number) },
        },
      };

      mockClient.get.mockResolvedValue({
        Item: pack,
      });
      mockClient.update.mockResolvedValue({
        Attributes: updatedPack,
      });

      const result = await p1p1PackModel.addVote(packId, 'user1', 'TestUser', 1);

      expect(mockClient.update).toHaveBeenCalledWith({
        Key: { id: packId },
        UpdateExpression: 'SET #voteMap.#userId = :newVote',
        ConditionExpression: 'attribute_exists(id)',
        ExpressionAttributeNames: {
          '#voteMap': 'votesByUser',
          '#userId': 'user1',
        },
        ExpressionAttributeValues: {
          ':newVote': {
            userName: 'TestUser',
            cardIndex: 1,
            date: expect.any(Number),
          },
        },
        ReturnValues: 'ALL_NEW',
      });

      expect(result).toEqual({
        id: packId,
        cubeId: pack.cubeId,
        cards: pack.cards,
        seed: pack.seed,
        date: pack.date,
        createdBy: pack.createdBy,
        createdByUsername: pack.createdByUsername,
        votes: [{ userId: 'user1', userName: 'TestUser', cardIndex: 1, date: expect.any(Number) }],
        botPick: pack.botPick,
        botWeights: pack.botWeights,
      });
    });

    it('should return null if pack not found', async () => {
      const packId = uuid.v4();

      mockClient.get.mockResolvedValue({
        Item: undefined,
      });

      const result = await p1p1PackModel.addVote(packId, 'user1', 'TestUser', 1);

      expect(result).toBeNull();
    });

    it('should return null if update fails', async () => {
      const packId = uuid.v4();
      const pack = createP1P1Pack({ id: packId });

      mockClient.get.mockResolvedValue({
        Item: pack,
      });
      mockClient.update.mockRejectedValue(new Error('Update failed'));

      const result = await p1p1PackModel.addVote(packId, 'user1', 'TestUser', 1);

      expect(result).toBeNull();
    });
  });

  describe('getVoteSummary', () => {
    it('should return vote summary with user vote', async () => {
      const pack = createP1P1Pack({
        votes: [
          { userId: 'user1', userName: 'User1', cardIndex: 0, date: Date.now() },
          { userId: 'user2', userName: 'User2', cardIndex: 1, date: Date.now() },
          { userId: 'user3', userName: 'User3', cardIndex: 0, date: Date.now() },
        ],
        botPick: 0,
        botWeights: [0.8, 0.6, 0.4],
      });

      const summary = p1p1PackModel.getVoteSummary(pack, 'user1');

      expect(summary).toEqual({
        totalVotes: 3,
        results: [
          { cardIndex: 0, voteCount: 2, percentage: (2 / 3) * 100 },
          { cardIndex: 1, voteCount: 1, percentage: (1 / 3) * 100 },
          { cardIndex: 2, voteCount: 0, percentage: 0 },
        ],
        userVote: 0,
        botPick: 0,
        botWeights: [0.8, 0.6, 0.4],
      });
    });
  });
});
