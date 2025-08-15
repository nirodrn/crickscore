import { MatchState, InningsState, BallEvent, PlayerRef, Team } from './types';

export class CricketScorer {
  static rotateStrikeIfOdd(runs: number, innings: InningsState): void {
    if (runs % 2 === 1) {
      const temp = innings.strikerId;
      innings.strikerId = innings.nonStrikerId;
      innings.nonStrikerId = temp;
    }
  }

  static rotateStrikeForOverEnd(innings: InningsState): void {
    const temp = innings.strikerId;
    innings.strikerId = innings.nonStrikerId;
    innings.nonStrikerId = temp;
  }

  static manualSwitchStrike(innings: InningsState): void {
    const temp = innings.strikerId;
    innings.strikerId = innings.nonStrikerId;
    innings.nonStrikerId = temp;
  }

  static applyRun(match: MatchState, runs: number, legal: boolean = true): void {
    const innings = match.currentInnings === 1 ? match.innings1 : match.innings2!;
    const battingTeam = innings.battingTeam === 'A' ? match.teamA : match.teamB;
    const striker = battingTeam.players.find(p => p.id === innings.strikerId)!;

    // Add runs to team and batter
    battingTeam.score += runs;
    if (!striker.battingStats) striker.battingStats = { runs: 0, balls: 0, fours: 0, sixes: 0 };
    striker.battingStats.runs += runs;

    // Only count balls faced for legal deliveries
    if (legal) {
      striker.battingStats.balls++;
      innings.legalBallsInCurrentOver++;
    }

    // Count boundaries
    if (runs === 4) striker.battingStats.fours++;
    if (runs === 6) striker.battingStats.sixes++;

    // Create event
    const event: BallEvent = {
      id: `${Date.now()}_${Math.random()}`,
      overNumber: innings.overNumber,
      legalBallInOver: legal ? innings.legalBallsInCurrentOver : undefined,
      kind: runs === 4 ? 'boundary4' : runs === 6 ? 'boundary6' : 'run',
      runsBat: runs,
      strikerIdBefore: innings.strikerId,
      nonStrikerIdBefore: innings.nonStrikerId,
      bowlerId: innings.bowlerId,
      freeHitBefore: innings.freeHit,
      timestamp: Date.now()
    };

    innings.events.push(event);

    // Rotate strike if odd runs
    this.rotateStrikeIfOdd(runs, innings);

    // Reset free hit after legal delivery
    if (legal && innings.freeHit) {
      innings.freeHit = false;
    }

    // Check if over is complete
    if (legal && innings.legalBallsInCurrentOver === 6) {
      this.completeOver(innings);
    }

    // Update bowler stats
    this.updateBowlerStats(match, runs, 0);
  }

  static applyNoBall(match: MatchState, batRuns: number = 0): void {
    const innings = match.currentInnings === 1 ? match.innings1 : match.innings2!;
    const battingTeam = innings.battingTeam === 'A' ? match.teamA : match.teamB;

    // Add no-ball extra and any bat runs
    battingTeam.score += 1 + batRuns;
    battingTeam.extras.noballs++;

    // Add bat runs to striker (but don't count the ball as legal)
    if (batRuns > 0) {
      const striker = battingTeam.players.find(p => p.id === innings.strikerId)!;
      if (!striker.battingStats) striker.battingStats = { runs: 0, balls: 0, fours: 0, sixes: 0 };
      striker.battingStats.runs += batRuns;
      
      if (batRuns === 4) striker.battingStats.fours++;
      if (batRuns === 6) striker.battingStats.sixes++;
    }

    // Set free hit for next delivery (limited-overs assumption)
    innings.freeHit = true;

    const event: BallEvent = {
      id: `${Date.now()}_${Math.random()}`,
      overNumber: innings.overNumber,
      kind: 'noball',
      runsBat: batRuns,
      runsExtra: 1,
      strikerIdBefore: innings.strikerId,
      nonStrikerIdBefore: innings.nonStrikerId,
      bowlerId: innings.bowlerId,
      freeHitBefore: false,
      timestamp: Date.now()
    };

    innings.events.push(event);

    // Rotate strike if odd total runs
    this.rotateStrikeIfOdd(1 + batRuns, innings);

    // Update bowler stats
    this.updateBowlerStats(match, 1 + batRuns, 0);
  }

  static applyWide(match: MatchState, additionalRuns: number = 0): void {
    const innings = match.currentInnings === 1 ? match.innings1 : match.innings2!;
    const battingTeam = innings.battingTeam === 'A' ? match.teamA : match.teamB;

    const totalRuns = 1 + additionalRuns;
    battingTeam.score += totalRuns;
    battingTeam.extras.wides += totalRuns;

    const event: BallEvent = {
      id: `${Date.now()}_${Math.random()}`,
      overNumber: innings.overNumber,
      kind: 'wide',
      runsExtra: totalRuns,
      strikerIdBefore: innings.strikerId,
      nonStrikerIdBefore: innings.nonStrikerId,
      bowlerId: innings.bowlerId,
      freeHitBefore: innings.freeHit,
      timestamp: Date.now()
    };

    innings.events.push(event);

    // Rotate strike if odd total runs
    this.rotateStrikeIfOdd(totalRuns, innings);

    // Update bowler stats
    this.updateBowlerStats(match, totalRuns, 0);
  }

  static applyBye(match: MatchState, runs: number): void {
    const innings = match.currentInnings === 1 ? match.innings1 : match.innings2!;
    const battingTeam = innings.battingTeam === 'A' ? match.teamA : match.teamB;

    battingTeam.score += runs;
    battingTeam.extras.byes += runs;
    innings.legalBallsInCurrentOver++;

    const event: BallEvent = {
      id: `${Date.now()}_${Math.random()}`,
      overNumber: innings.overNumber,
      legalBallInOver: innings.legalBallsInCurrentOver,
      kind: 'bye',
      runsExtra: runs,
      strikerIdBefore: innings.strikerId,
      nonStrikerIdBefore: innings.nonStrikerId,
      bowlerId: innings.bowlerId,
      freeHitBefore: innings.freeHit,
      timestamp: Date.now()
    };

    innings.events.push(event);

    // Update striker balls faced (legal delivery)
    const striker = battingTeam.players.find(p => p.id === innings.strikerId)!;
    if (!striker.battingStats) striker.battingStats = { runs: 0, balls: 0, fours: 0, sixes: 0 };
    striker.battingStats.balls++;

    this.rotateStrikeIfOdd(runs, innings);

    if (innings.freeHit) innings.freeHit = false;
    if (innings.legalBallsInCurrentOver === 6) this.completeOver(innings);

    this.updateBowlerStats(match, runs, 0);
  }

  static applyLegBye(match: MatchState, runs: number): void {
    const innings = match.currentInnings === 1 ? match.innings1 : match.innings2!;
    const battingTeam = innings.battingTeam === 'A' ? match.teamA : match.teamB;

    battingTeam.score += runs;
    battingTeam.extras.legbyes += runs;
    innings.legalBallsInCurrentOver++;

    const event: BallEvent = {
      id: `${Date.now()}_${Math.random()}`,
      overNumber: innings.overNumber,
      legalBallInOver: innings.legalBallsInCurrentOver,
      kind: 'legbye',
      runsExtra: runs,
      strikerIdBefore: innings.strikerId,
      nonStrikerIdBefore: innings.nonStrikerId,
      bowlerId: innings.bowlerId,
      freeHitBefore: innings.freeHit,
      timestamp: Date.now()
    };

    innings.events.push(event);

    // Update striker balls faced (legal delivery)
    const striker = battingTeam.players.find(p => p.id === innings.strikerId)!;
    if (!striker.battingStats) striker.battingStats = { runs: 0, balls: 0, fours: 0, sixes: 0 };
    striker.battingStats.balls++;

    this.rotateStrikeIfOdd(runs, innings);

    if (innings.freeHit) innings.freeHit = false;
    if (innings.legalBallsInCurrentOver === 6) this.completeOver(innings);

    this.updateBowlerStats(match, runs, 0);
  }

  static applyWicket(
    match: MatchState, 
    type: PlayerRef['dismissal']['type'],
    fielder?: string,
    runs: number = 0
  ): boolean {
    const innings = match.currentInnings === 1 ? match.innings1 : match.innings2!;
    
    // On free hit, only certain dismissals are allowed
    if (innings.freeHit && !['runout-striker', 'runout-nonstriker', 'obstructing', 'hit-ball-twice'].includes(type)) {
      return false; // Wicket not allowed
    }

    const battingTeam = innings.battingTeam === 'A' ? match.teamA : match.teamB;
    const striker = battingTeam.players.find(p => p.id === innings.strikerId)!;

    // Mark player as out
    striker.isOut = true;
    striker.dismissal = {
      type,
      fielder,
      over: innings.overNumber,
      ball: innings.legalBallsInCurrentOver + 1
    };

    battingTeam.wickets++;

    // Add any runs completed
    if (runs > 0) {
      battingTeam.score += runs;
      if (!striker.battingStats) striker.battingStats = { runs: 0, balls: 0, fours: 0, sixes: 0 };
      striker.battingStats.runs += runs;
    }

    // Count as legal ball unless it was on a wide/no-ball
    const isLegalBall = true; // Adjust based on delivery type
    if (isLegalBall) {
      innings.legalBallsInCurrentOver++;
      if (!striker.battingStats) striker.battingStats = { runs: 0, balls: 0, fours: 0, sixes: 0 };
      striker.battingStats.balls++;
    }

    const event: BallEvent = {
      id: `${Date.now()}_${Math.random()}`,
      overNumber: innings.overNumber,
      legalBallInOver: isLegalBall ? innings.legalBallsInCurrentOver : undefined,
      kind: 'wicket',
      runsBat: runs,
      wicketType: type,
      strikerIdBefore: innings.strikerId,
      nonStrikerIdBefore: innings.nonStrikerId,
      bowlerId: innings.bowlerId,
      freeHitBefore: innings.freeHit,
      timestamp: Date.now()
    };

    innings.events.push(event);

    // Rotate strike based on runs completed
    this.rotateStrikeIfOdd(runs, innings);

    // Reset free hit
    if (isLegalBall && innings.freeHit) innings.freeHit = false;

    // Update bowler stats
    this.updateBowlerStats(match, runs, 1);

    // Check if over is complete
    if (isLegalBall && innings.legalBallsInCurrentOver === 6) {
      this.completeOver(innings);
    }

    return true; // Wicket was applied
  }

  static setNextBatter(match: MatchState, playerId: string): void {
    const innings = match.currentInnings === 1 ? match.innings1 : match.innings2!;
    const battingTeam = innings.battingTeam === 'A' ? match.teamA : match.teamB;
    
    // Find the last dismissed batter and replace them
    const dismissedBatter = battingTeam.players.find(p => p.isOut && (p.id === innings.strikerId || p.id === innings.nonStrikerId));
    
    if (dismissedBatter?.id === innings.strikerId) {
      innings.strikerId = playerId;
    } else if (dismissedBatter?.id === innings.nonStrikerId) {
      innings.nonStrikerId = playerId;
    }

    innings.nextBatterIndex++;
  }

  static completeOver(innings: InningsState): void {
    innings.overNumber++;
    innings.legalBallsInCurrentOver = 0;
    this.rotateStrikeForOverEnd(innings);
  }

  static endOverAndChangeBowler(innings: InningsState, newBowlerId: string): void {
    if (innings.legalBallsInCurrentOver < 6) {
      throw new Error('Cannot end over with fewer than 6 legal balls');
    }
    
    innings.bowlerId = newBowlerId;
    this.completeOver(innings);
  }

  static updateBowlerStats(match: MatchState, runs: number, wickets: number): void {
    const innings = match.currentInnings === 1 ? match.innings1 : match.innings2!;
    const bowlingTeam = innings.bowlingTeam === 'A' ? match.teamA : match.teamB;
    const bowler = bowlingTeam.players.find(p => p.id === innings.bowlerId)!;

    if (!bowler.bowlingStats) {
      bowler.bowlingStats = { overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0 };
    }

    bowler.bowlingStats.runs += runs;
    bowler.bowlingStats.wickets += wickets;
    bowler.bowlingStats.balls++;

    // Update overs (every 6 balls)
    if (bowler.bowlingStats.balls % 6 === 0) {
      bowler.bowlingStats.overs = Math.floor(bowler.bowlingStats.balls / 6);
    }
  }

  static calculateCurrentRunRate(team: Team, overs: number, balls: number): number {
    const totalBalls = (overs * 6) + balls;
    if (totalBalls === 0) return 0;
    return (team.score / totalBalls) * 6;
  }

  static calculateRequiredRunRate(target: number, scored: number, remainingOvers: number, remainingBalls: number): number {
    const totalRemainingBalls = (remainingOvers * 6) + remainingBalls;
    if (totalRemainingBalls === 0) return 0;
    const required = target - scored;
    return Math.max(0, (required / totalRemainingBalls) * 6);
  }

  static isInningsComplete(match: MatchState): boolean {
    const innings = match.currentInnings === 1 ? match.innings1 : match.innings2!;
    const battingTeam = innings.battingTeam === 'A' ? match.teamA : match.teamB;

    // Check if all out (10 wickets)
    if (battingTeam.wickets >= 10) return true;

    // Check if overs limit reached
    if (innings.maxOvers && innings.overNumber >= innings.maxOvers) return true;

    // Check if target chased (second innings)
    if (match.currentInnings === 2 && innings.target && battingTeam.score >= innings.target) return true;

    return false;
  }

  static getLastSixBalls(innings: InningsState): string[] {
    const recentEvents = innings.events
      .filter(e => e.legalBallInOver !== undefined)
      .slice(-6);

    return recentEvents.map(event => {
      if (event.kind === 'wicket') return 'W';
      if (event.kind === 'boundary4') return '4';
      if (event.kind === 'boundary6') return '6';
      if (event.runsBat === 0 && event.kind !== 'bye' && event.kind !== 'legbye') return '•';
      return String(event.runsBat || event.runsExtra || 0);
    });
  }

  static undoLastEvent(match: MatchState): boolean {
    const innings = match.currentInnings === 1 ? match.innings1 : match.innings2!;
    
    if (innings.events.length === 0) return false;

    const lastEvent = innings.events.pop()!;
    
    // This is a simplified undo - in a real implementation, you'd need to
    // carefully reverse all the state changes made by the event
    // For now, we'll just remove the event from the history
    
    return true;
  }
}