export interface PlayerRef {
  id: string;
  name: string;
  imageUrl?: string;
  roles?: ('Captain' | 'Wicketkeeper' | 'Batter' | 'Bowler')[];
  canBowl?: boolean;
  canBat?: boolean;
  canKeep?: boolean;
  isOut?: boolean;
  dismissal?: {
    type: 'bowled' | 'lbw' | 'caught' | 'runout-striker' | 'runout-nonstriker' | 'hitwicket' | 'stumped' | 'obstructing' | 'hit-ball-twice' | 'retired-out' | 'retired-notout';
    fielder?: string;
    over?: number;
    ball?: number;
  };
  battingStats?: {
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    highestScore?: number;
    average?: number;
    strikeRate?: number;
    centuries?: number;
    halfCenturies?: number;
  };
  bowlingStats?: {
    overs: number;
    balls: number;
    maidens: number;
    runs: number;
    wickets: number;
    bestFigures?: string;
    average?: number;
    economyRate?: number;
    fiveWickets?: number;
  };
  careerStats?: {
    matchesPlayed?: number;
    totalRuns?: number;
    totalWickets?: number;
    bestBatting?: number;
    bestBowling?: string;
    catches?: number;
    stumpings?: number;
  };
}

export interface Team {
  id: 'A' | 'B';
  name: string;
  logoUrl?: string;
  players: PlayerRef[];
  score: number;
  wickets: number;
  extras: {
    wides: number;
    noballs: number;
    byes: number;
    legbyes: number;
    penalties: number;
  };
}

export interface BallEvent {
  id: string;
  overNumber: number;
  legalBallInOver?: number;
  kind: 'run' | 'boundary4' | 'boundary6' | 'wide' | 'noball' | 'bye' | 'legbye' | 'wicket' | 'penalty' | 'dead';
  runsBat?: number;
  runsExtra?: number;
  wicketType?: PlayerRef['dismissal']['type'];
  strikerIdBefore: string;
  nonStrikerIdBefore: string;
  bowlerId: string;
  freeHitBefore: boolean;
  timestamp: number;
}

export interface InningsState {
  battingTeam: 'A' | 'B';
  bowlingTeam: 'A' | 'B';
  strikerId: string;
  nonStrikerId: string;
  nextBatterIndex: number;
  bowlerId: string;
  overNumber: number;
  legalBallsInCurrentOver: number;
  freeHit: boolean;
  maxOvers?: number;
  isComplete: boolean;
  isInterval?: boolean;
  intervalType?: 'drinks' | 'innings' | 'lunch' | 'tea' | 'custom';
  intervalMessage?: string;
  target?: number;
  events: BallEvent[];
}

export interface MatchState {
  id: string;
  teamA: Team;
  teamB: Team;
  tossWinner?: 'A' | 'B';
  elected?: 'bat' | 'bowl';
  currentInnings: 1 | 2;
  innings1: InningsState;
  innings2?: InningsState;
  createdAt: number;
  updatedAt: number;
}

export interface User {
  uid: string;
  email?: string;
  displayName?: string;
}