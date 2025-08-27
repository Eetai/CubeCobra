import { CardDetails } from './Card';

export interface P1P1Vote {
  userId: string; // Added back during hydration from map key
  userName: string;
  cardIndex: number;
  date: number;
}

export interface P1P1VoteResult {
  cardIndex: number;
  voteCount: number;
  percentage: number;
}

export interface P1P1VoteSummary {
  totalVotes: number;
  results: P1P1VoteResult[];
  userVote?: number; // Index of card user voted for
  botPick?: number; // Index of card CubeCobra bot picked
  botWeights?: number[]; // Array of bot rating weights for each card (0-1 range)
}

export interface P1P1Pack {
  id: string;
  cubeId: string;
  cards: CardDetails[];
  seed: string;
  date: number;
  createdBy: string;
  createdByUsername: string;
  votes: P1P1Vote[]; // Embedded votes
  botPick?: number; // Index of card CubeCobra bot picked (computed at creation) - optional as not all packs have bot picks
  botWeights?: number[]; // Array of bot rating weights for each card (computed at creation) - optional as not all packs have bot weights
}

export interface UnhydratedP1P1Pack {
  id?: string;
  cubeId: string;
  cards: CardDetails[];
  seed: string;
  date?: number;
  createdBy: string;
  createdByUsername: string;
  botPick?: number; // Optional - not all packs may have bot picks
  botWeights?: number[]; // Optional - not all packs may have bot weights
}

export default P1P1Pack;
