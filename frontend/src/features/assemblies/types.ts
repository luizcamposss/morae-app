// Assembly enums (backend/Enums/AssemblyEnums.cs), sent as numbers.
export type AssemblyType = 1 | 2;
export type AssemblyVoterRule = 1 | 2;
export type AssemblyStatus = 1 | 2 | 3 | 4;
export type AssemblyPhase = 1 | 2 | 3 | 4 | 5;
export type AssemblyVoteType = 1 | 2;
export type AssemblyQuorum = 1 | 2 | 3 | 4;
export type AssemblyItemOutcome = 1 | 2 | 3 | 4;

export type AssemblyOptionResponse = {
  id: number;
  order: number;
  text: string;
  isAbstention: boolean;
};

export type AssemblyItemResponse = {
  id: number;
  order: number;
  title: string;
  description: string | null;
  voteType: AssemblyVoteType;
  quorum: AssemblyQuorum;
  isSecret: boolean;
  options: AssemblyOptionResponse[];
};

export type AssemblyResponse = {
  id: number;
  condominiumId: number;
  title: string;
  description: string | null;
  type: AssemblyType;
  voterRule: AssemblyVoterRule;
  meetingAt: string | null;
  meetingLocation: string | null;
  votingStartsAt: string;
  votingEndsAt: string;
  status: AssemblyStatus;
  phase: AssemblyPhase;
  publishedAt: string | null;
  closedAt: string | null;
  canceledAt: string | null;
  cancelReason: string | null;
  itemsCount: number;
  eligibleUnitsCount: number | null;
  minutesDocumentId: number | null;
  // Details only (null in lists).
  items: AssemblyItemResponse[] | null;
  createdByName: string;
  createdAt: string;
};

export type AssemblyOptionResult = {
  optionId: number;
  text: string;
  isAbstention: boolean;
  votes: number;
  // How each unit voted; null on secret items.
  units: string[] | null;
};

export type AssemblyItemResult = {
  itemId: number;
  order: number;
  title: string;
  voteType: AssemblyVoteType;
  quorum: AssemblyQuorum;
  isSecret: boolean;
  totalVotes: number;
  abstentions: number;
  outcome: AssemblyItemOutcome;
  winnerOptionId: number | null;
  summary: string;
  options: AssemblyOptionResult[];
};

export type AssemblyResults = {
  assemblyId: number;
  title: string;
  // False while voting is open: only the participation comes, never partial counts.
  isFinal: boolean;
  votingEndsAt: string;
  closedAt: string | null;
  eligibleUnits: number;
  votedUnits: number;
  items: AssemblyItemResult[];
  minutesDocumentId: number | null;
  minutesDocumentTitle: string | null;
};

export type BallotUnit = {
  unitId: number;
  unitLabel: string;
  canVote: boolean;
  // Why the unit cannot vote (not an owner, overdue charge...).
  blockReason: string | null;
  // The unit's current choice per item (itemId → optionId), whoever of the household voted.
  votes: Record<number, number>;
  lastVotedByName: string | null;
  lastVotedAt: string | null;
};

export type MyBallot = {
  assemblyId: number;
  votingOpen: boolean;
  units: BallotUnit[];
};

// Items left out keep their current vote.
export type CastVotesRequest = {
  unitId: number;
  votes: Array<{ itemId: number; optionId: number }>;
};

export type SaveAssemblyItemRequest = {
  title: string;
  description: string | null;
  voteType: AssemblyVoteType;
  quorum: AssemblyQuorum;
  isSecret: boolean;
  // Multiple choice only (2 to 10); "Abstenção" is added by the API.
  options: string[];
};

// Dates without a time zone ("2026-10-20T22:00") are read as São Paulo time.
export type SaveAssemblyRequest = {
  title: string;
  description: string | null;
  type: AssemblyType;
  voterRule: AssemblyVoterRule;
  meetingAt: string | null;
  meetingLocation: string | null;
  votingStartsAt: string;
  votingEndsAt: string;
  items: SaveAssemblyItemRequest[];
};
