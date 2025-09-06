import { MatchState, InningsState, BallEvent, PlayerRef, Team, BallDisplayItem } from './types';

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
    const ballsPerOver = this.getBallsPerOver(innings);

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
    if (legal && innings.legalBallsInCurrentOver === ballsPerOver) {
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
      // No-ball is NOT a legal ball - no legalBallInOver assigned
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

    // No-ball does NOT increment legalBallsInCurrentOver
    // Over continues until 6 legal balls are bowled

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
      // Wide is NOT a legal ball - no legalBallInOver assigned
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

    // Wide does NOT increment legalBallsInCurrentOver
    // Over continues until 6 legal balls are bowled

    // Update bowler stats
    this.updateBowlerStats(match, totalRuns, 0);
  }

  static applyBye(match: MatchState, runs: number): void {
    const innings = match.currentInnings === 1 ? match.innings1 : match.innings2!;
    const battingTeam = innings.battingTeam === 'A' ? match.teamA : match.teamB;
    const ballsPerOver = this.getBallsPerOver(innings);

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
    if (innings.legalBallsInCurrentOver === ballsPerOver) this.completeOver(innings);

    this.updateBowlerStats(match, runs, 0);
  }

  static applyLegBye(match: MatchState, runs: number): void {
    const innings = match.currentInnings === 1 ? match.innings1 : match.innings2!;
    const battingTeam = innings.battingTeam === 'A' ? match.teamA : match.teamB;
    const ballsPerOver = this.getBallsPerOver(innings);

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
    if (innings.legalBallsInCurrentOver === ballsPerOver) this.completeOver(innings);

    this.updateBowlerStats(match, runs, 0);
  }

  static applyWicket(
    match: MatchState, 
  type: 'bowled' | 'lbw' | 'caught' | 'runout-striker' | 'runout-nonstriker' | 'hitwicket' | 'stumped' | 'obstructing' | 'hit-ball-twice' | 'retired-out' | 'retired-notout',
    fielder?: string,
    runs: number = 0
  ): boolean {
    const innings = match.currentInnings === 1 ? match.innings1 : match.innings2!;
    const ballsPerOver = this.getBallsPerOver(innings);
    
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
    if (isLegalBall && innings.legalBallsInCurrentOver === ballsPerOver) {
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

  static getBallsPerOver(innings: InningsState): number {
    return innings.ballsPerOver || 6;
  }

  static endOverAndChangeBowler(innings: InningsState, newBowlerId: string): void {
    const ballsPerOver = this.getBallsPerOver(innings);
    if (innings.legalBallsInCurrentOver < ballsPerOver) {
      throw new Error(`Cannot end over with fewer than ${ballsPerOver} legal balls`);
    }
    
    innings.bowlerId = newBowlerId;
    this.completeOver(innings);
  }

  static updateBowlerStats(match: MatchState, runs: number, wickets: number): void {
    const innings = match.currentInnings === 1 ? match.innings1 : match.innings2!;
    const bowlingTeam = innings.bowlingTeam === 'A' ? match.teamA : match.teamB;
    const bowler = bowlingTeam.players.find(p => p.id === innings.bowlerId)!;
    const ballsPerOver = this.getBallsPerOver(innings);

    if (!bowler.bowlingStats) {
      bowler.bowlingStats = { overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0 };
    }

    bowler.bowlingStats.runs += runs;
    bowler.bowlingStats.wickets += wickets;
    
    // Only increment balls for legal deliveries
    // This is called from applyRun, applyBye, applyLegBye, applyWicket (legal balls)
    // NOT called from applyWide, applyNoBall (illegal balls)
    const lastEvent = innings.events[innings.events.length - 1];
    if (lastEvent && lastEvent.legalBallInOver !== undefined) {
      bowler.bowlingStats.balls++;
    }

    // Update overs (every 6 balls)
    if (bowler.bowlingStats.balls % ballsPerOver === 0) {
      bowler.bowlingStats.overs = Math.floor(bowler.bowlingStats.balls / ballsPerOver);
    }
  }

  static calculateCurrentRunRate(team: Team, overs: number, balls: number): number {
    // Note: This function needs innings context to get ballsPerOver
    // For now, we'll assume 6 balls per over for backward compatibility
    const ballsPerOver = 6; // Default assumption
    const totalBalls = (overs * ballsPerOver) + balls;
    if (totalBalls === 0) return 0;
    return (team.score / totalBalls) * ballsPerOver;
  }

  static calculateRequiredRunRate(target: number, scored: number, remainingOvers: number, remainingBalls: number): number {
    // Note: This function needs innings context to get ballsPerOver
    // For now, we'll assume 6 balls per over for backward compatibility
    const ballsPerOver = 6; // Default assumption
    const totalRemainingBalls = (remainingOvers * ballsPerOver) + remainingBalls;
    if (totalRemainingBalls === 0) return 0;
    const required = target - scored;
    return Math.max(0, (required / totalRemainingBalls) * ballsPerOver);
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

  static getLastSixBalls(innings: InningsState): BallDisplayItem[] {
    const recentEvents = innings.events
      .filter(e => e.kind !== 'dead')
      .slice(-6);

    return recentEvents.map(event => {
      const item: BallDisplayItem = {
        value: '',
        type: 'dot',
        isFreeHit: event.freeHitBefore,
        runs: event.runsBat || event.runsExtra || 0
      };

      switch (event.kind) {
        case 'wicket':
          item.value = 'W';
          item.type = 'wicket';
          break;
        case 'boundary4':
          item.value = '4';
          item.type = 'boundary4';
          break;
        case 'boundary6':
          item.value = '6';
          item.type = 'boundary6';
          break;
        case 'wide':
          item.value = `w${event.runsExtra && event.runsExtra > 1 ? event.runsExtra : ''}`;
          item.type = 'wide';
          break;
        case 'noball':
          item.value = `nb${event.runsBat ? event.runsBat : ''}`;
          item.type = 'noball';
          break;
        case 'bye':
          item.value = `b${event.runsExtra || 1}`;
          item.type = 'bye';
          break;
        case 'legbye':
          item.value = `lb${event.runsExtra || 1}`;
          item.type = 'legbye';
          break;
        case 'run':
          if (event.runsBat === 0) {
            item.value = '•';
            item.type = 'dot';
          } else {
            item.value = String(event.runsBat);
            item.type = 'run';
          }
          break;
        default:
          item.value = '•';
          item.type = 'dot';
      }

      return item;
    });
  }

  static getCurrentOverBalls(innings: InningsState): BallDisplayItem[] {
    // Get ALL balls bowled in the current over (including illegal deliveries)
    const currentOverEvents = innings.events.filter(e => 
      e.overNumber === innings.overNumber && e.kind !== 'dead'
    );

    const balls = currentOverEvents.map(event => {
      const item: BallDisplayItem = {
        value: '',
        type: 'dot',
        isFreeHit: event.freeHitBefore,
        runs: event.runsBat || event.runsExtra || 0
      };

      switch (event.kind) {
        case 'wicket':
          item.value = 'W';
          item.type = 'wicket';
          break;
        case 'boundary4':
          item.value = '4';
          item.type = 'boundary4';
          break;
        case 'boundary6':
          item.value = '6';
          item.type = 'boundary6';
          break;
        case 'wide':
          item.value = event.runsExtra && event.runsExtra > 1 ? `w${event.runsExtra}` : 'w';
          item.type = 'wide';
          break;
        case 'noball':
          item.value = event.runsBat ? `nb${event.runsBat}` : 'nb';
          item.type = 'noball';
          break;
        case 'bye':
          item.value = `b${event.runsExtra || 1}`;
          item.type = 'bye';
          break;
        case 'legbye':
          item.value = `lb${event.runsExtra || 1}`;
          item.type = 'legbye';
          break;
        case 'run':
          if (event.runsBat === 0) {
            item.value = '•';
            item.type = 'dot';
          } else {
            item.value = String(event.runsBat);
            item.type = 'run';
          }
          break;
        default:
          item.value = '•';
          item.type = 'dot';
      }

      return item;
    });

    // Return ALL balls in the current over (may be more than 6 due to extras)
    // This allows proper visualization of extended overs

    return balls;
  }

  static getOverBalls(innings: InningsState, overNumber: number): BallDisplayItem[] {
    const overEvents = innings.events.filter(e => 
      e.overNumber === overNumber && e.kind !== 'dead'
    );

    return overEvents.map(event => {
      const item: BallDisplayItem = {
        value: '',
        type: 'dot',
        isFreeHit: event.freeHitBefore,
        runs: event.runsBat || event.runsExtra || 0
      };

      switch (event.kind) {
        case 'wicket':
          item.value = 'W';
          item.type = 'wicket';
          break;
        case 'boundary4':
          item.value = '4';
          item.type = 'boundary4';
          break;
        case 'boundary6':
          item.value = '6';
          item.type = 'boundary6';
          break;
        case 'wide':
          item.value = event.runsExtra && event.runsExtra > 1 ? `w${event.runsExtra}` : 'w';
          item.type = 'wide';
          break;
        case 'noball':
          item.value = event.runsBat ? `nb${event.runsBat}` : 'nb';
          item.type = 'noball';
          break;
        case 'bye':
          item.value = `b${event.runsExtra || 1}`;
          item.type = 'bye';
          break;
        case 'legbye':
          item.value = `lb${event.runsExtra || 1}`;
          item.type = 'legbye';
          break;
        case 'run':
          if (event.runsBat === 0) {
            item.value = '•';
            item.type = 'dot';
          } else {
            item.value = String(event.runsBat);
            item.type = 'run';
          }
          break;
        default:
          item.value = '•';
          item.type = 'dot';
      }

      return item;
    });
  }

  static getAllOvers(innings: InningsState): Array<{ overNumber: number; balls: BallDisplayItem[] }> {
    const overs: Array<{ overNumber: number; balls: BallDisplayItem[] }> = [];
    
    for (let i = 0; i <= innings.overNumber; i++) {
      const balls = this.getOverBalls(innings, i);
      if (balls.length > 0) {
        overs.push({ overNumber: i + 1, balls });
      }
    }
    
    return overs;
  }

  static getMatchResult(match: MatchState): string {
    if (!match.innings1.isComplete) {
      // Check if match is in interval
      if (match.innings1.isInterval) {
        const intervalType = match.innings1.intervalType || 'interval';
        const message = match.innings1.intervalMessage;
        return message || `${intervalType.charAt(0).toUpperCase() + intervalType.slice(1)} Break`;
      }
      return `Match in Progress - Innings ${match.currentInnings}`;
    }

    if (match.currentInnings === 1) {
      return 'First Innings Complete - Innings Break';
    }

    if (!match.innings2 || !match.innings2.isComplete) {
      if (match.innings2?.isInterval) {
        const intervalType = match.innings2.intervalType || 'interval';
        const message = match.innings2.intervalMessage;
        return message || `${intervalType.charAt(0).toUpperCase() + intervalType.slice(1)} Break`;
      }
      return 'Second Innings in Progress';
    }

    const team1 = match.innings1.battingTeam === 'A' ? match.teamA : match.teamB;
    const team2 = match.innings2.battingTeam === 'A' ? match.teamA : match.teamB;
    const team1Name = team1.name || 'Team A';
    const team2Name = team2.name || 'Team B';

    if (team1.score > team2.score) {
      const margin = team1.score - team2.score;
      return `${team1Name} won by ${margin} runs`;
    } else if (team2.score > team1.score) {
      const wicketsRemaining = 10 - team2.wickets;
      return `${team2Name} won by ${wicketsRemaining} wickets`;
    } else {
      return 'Match Tied';
    }
  }

  static undoLastEvent(match: MatchState): boolean {
    const innings = match.currentInnings === 1 ? match.innings1 : match.innings2!;
    if (innings.events.length === 0) return false;

    const lastEvent = innings.events.pop()!;
    const battingTeam = innings.battingTeam === 'A' ? match.teamA : match.teamB;
    const bowlingTeam = innings.bowlingTeam === 'A' ? match.teamA : match.teamB;
    // Undo logic for each event type
    switch (lastEvent.kind) {
      case 'run':
      case 'boundary4':
      case 'boundary6': {
        // Subtract runs from team and batter
        const runs = lastEvent.runsBat || 0;
        battingTeam.score -= runs;
        const striker = battingTeam.players.find(p => p.id === lastEvent.strikerIdBefore);
        if (striker && striker.battingStats) {
          striker.battingStats.runs -= runs;
          striker.battingStats.balls = Math.max(0, striker.battingStats.balls - 1);
          if (lastEvent.kind === 'boundary4') striker.battingStats.fours = Math.max(0, striker.battingStats.fours - 1);
          if (lastEvent.kind === 'boundary6') striker.battingStats.sixes = Math.max(0, striker.battingStats.sixes - 1);
        }
        // Undo legal ball
        if (lastEvent.legalBallInOver !== undefined) {
          innings.legalBallsInCurrentOver = Math.max(0, innings.legalBallsInCurrentOver - 1);
        }
        // Undo bowler stats
        const bowler = bowlingTeam.players.find(p => p.id === lastEvent.bowlerId);
        if (bowler && bowler.bowlingStats) {
          bowler.bowlingStats.runs -= runs;
          bowler.bowlingStats.balls = Math.max(0, bowler.bowlingStats.balls - 1);
        }
        break;
      }
      case 'wide': {
        // Subtract extras from team
        const runs = lastEvent.runsExtra || 1;
        battingTeam.score -= runs;
        battingTeam.extras.wides = Math.max(0, battingTeam.extras.wides - 1);
        // No legal ball increment for wide
        break;
      }
      case 'noball': {
        // Subtract extras and bat runs
        const runs = (lastEvent.runsBat || 0) + 1;
        battingTeam.score -= runs;
        battingTeam.extras.noballs = Math.max(0, battingTeam.extras.noballs - 1);
        // Remove bat runs from striker
        if (lastEvent.runsBat && lastEvent.runsBat > 0) {
          const striker = battingTeam.players.find(p => p.id === lastEvent.strikerIdBefore);
          if (striker && striker.battingStats) {
            striker.battingStats.runs -= lastEvent.runsBat;
            if (lastEvent.runsBat === 4) striker.battingStats.fours = Math.max(0, striker.battingStats.fours - 1);
            if (lastEvent.runsBat === 6) striker.battingStats.sixes = Math.max(0, striker.battingStats.sixes - 1);
          }
        }
        // No legal ball increment for no-ball
        break;
      }
      case 'bye': {
        const runs = lastEvent.runsExtra || 1;
        battingTeam.score -= runs;
        battingTeam.extras.byes = Math.max(0, battingTeam.extras.byes - runs);
        // Undo legal ball
        if (lastEvent.legalBallInOver !== undefined) {
          innings.legalBallsInCurrentOver = Math.max(0, innings.legalBallsInCurrentOver - 1);
        }
        // Undo striker balls
        const striker = battingTeam.players.find(p => p.id === lastEvent.strikerIdBefore);
        if (striker && striker.battingStats) {
          striker.battingStats.balls = Math.max(0, striker.battingStats.balls - 1);
        }
        // Undo bowler balls
        const bowler = bowlingTeam.players.find(p => p.id === lastEvent.bowlerId);
        if (bowler && bowler.bowlingStats) {
          bowler.bowlingStats.balls = Math.max(0, bowler.bowlingStats.balls - 1);
        }
        break;
      }
      case 'legbye': {
        const runs = lastEvent.runsExtra || 1;
        battingTeam.score -= runs;
        battingTeam.extras.legbyes = Math.max(0, battingTeam.extras.legbyes - runs);
        // Undo legal ball
        if (lastEvent.legalBallInOver !== undefined) {
          innings.legalBallsInCurrentOver = Math.max(0, innings.legalBallsInCurrentOver - 1);
        }
        // Undo striker balls
        const striker = battingTeam.players.find(p => p.id === lastEvent.strikerIdBefore);
        if (striker && striker.battingStats) {
          striker.battingStats.balls = Math.max(0, striker.battingStats.balls - 1);
        }
        // Undo bowler balls
        const bowler = bowlingTeam.players.find(p => p.id === lastEvent.bowlerId);
        if (bowler && bowler.bowlingStats) {
          bowler.bowlingStats.balls = Math.max(0, bowler.bowlingStats.balls - 1);
        }
        break;
      }
      case 'wicket': {
        // Undo wicket
        battingTeam.wickets = Math.max(0, battingTeam.wickets - 1);
        // Restore striker not out
        const striker = battingTeam.players.find(p => p.id === lastEvent.strikerIdBefore);
        if (striker) {
          striker.isOut = false;
          striker.dismissal = undefined;
          if (striker.battingStats) {
            // Remove ball and runs if any
            if (lastEvent.runsBat && lastEvent.runsBat > 0) {
              battingTeam.score -= lastEvent.runsBat;
              striker.battingStats.runs -= lastEvent.runsBat;
            }
            striker.battingStats.balls = Math.max(0, striker.battingStats.balls - 1);
          }
        }
        // Undo legal ball
        if (lastEvent.legalBallInOver !== undefined) {
          innings.legalBallsInCurrentOver = Math.max(0, innings.legalBallsInCurrentOver - 1);
        }
        // Undo bowler stats
        const bowler = bowlingTeam.players.find(p => p.id === lastEvent.bowlerId);
        if (bowler && bowler.bowlingStats) {
          if (lastEvent.runsBat && lastEvent.runsBat > 0) {
            bowler.bowlingStats.runs -= lastEvent.runsBat;
          }
          bowler.bowlingStats.wickets = Math.max(0, bowler.bowlingStats.wickets - 1);
          bowler.bowlingStats.balls = Math.max(0, bowler.bowlingStats.balls - 1);
        }
        break;
      }
      case 'penalty': {
        // Subtract penalty runs
        const runs = lastEvent.runsExtra || 0;
        battingTeam.score -= runs;
        battingTeam.extras.penalties = Math.max(0, battingTeam.extras.penalties - runs);
        break;
      }
      // 'dead' does not affect state
      default:
        break;
    }
    // Optionally, restore striker/non-striker/bowler if needed
    innings.strikerId = lastEvent.strikerIdBefore;
    innings.nonStrikerId = lastEvent.nonStrikerIdBefore;
    innings.bowlerId = lastEvent.bowlerId;
    // Optionally, restore free hit state
    innings.freeHit = lastEvent.freeHitBefore;
    return true;
  }

  static updateMatchResult(match: MatchState): void {
    match.result = this.getMatchResult(match);
    match.isComplete = match.innings1.isComplete && 
      (match.currentInnings === 1 || (match.innings2?.isComplete ?? false));
  }

  static getTopBatters(team: Team, count: number = 5): PlayerRef[] {
    return team.players
      .filter(p => p.battingStats && p.battingStats.balls > 0)
      .sort((a, b) => (b.battingStats?.runs || 0) - (a.battingStats?.runs || 0))
      .slice(0, count);
  }

  static getTopBowlers(team: Team, count: number = 5): PlayerRef[] {
    return team.players
      .filter(p => p.bowlingStats && p.bowlingStats.balls > 0)
      .sort((a, b) => (b.bowlingStats?.wickets || 0) - (a.bowlingStats?.wickets || 0))
      .slice(0, count);
  }

  static getWicketFallData(innings: InningsState): Array<{
    overNumber: number;
    ballInOver: number;
    score: number;
    wicketNumber: number;
    playerId: string;
    dismissalType: string;
  }> {
    const wickets = [];
    let wicketCount = 0;
    let runningScore = 0;
    
    for (const event of innings.events) {
      runningScore += (event.runsBat || 0) + (event.runsExtra || 0);
      
      if (event.kind === 'wicket') {
        wicketCount++;
        wickets.push({
          overNumber: event.overNumber,
          ballInOver: event.legalBallInOver || 0,
          score: runningScore - (event.runsBat || 0), // Score before the wicket ball
          wicketNumber: wicketCount,
          playerId: event.strikerIdBefore,
          dismissalType: event.wicketType || 'unknown'
        });
      }
    }
    
    return wickets;
  }

  static getRunRateProgression(innings: InningsState): Array<{
    over: number;
    score: number;
    runRate: number;
    runsInOver: number;
  }> {
    const progression = [];
    let runningScore = 0;
    let currentOver = 0;
    let ballsInOver = 0;
    let overStartScore = 0;
    
    for (const event of innings.events) {
      const eventRuns = (event.runsBat || 0) + (event.runsExtra || 0);
      runningScore += eventRuns;
      
      if (event.legalBallInOver !== undefined) {
        ballsInOver++;
        if (ballsInOver === 6) {
          currentOver++;
          const totalBalls = currentOver * 6;
          const runsInThisOver = runningScore - overStartScore;
          progression.push({
            over: currentOver,
            score: runningScore,
            runRate: totalBalls > 0 ? (runningScore / totalBalls) * 6 : 0,
            runsInOver: runsInThisOver
          });
          ballsInOver = 0;
          overStartScore = runningScore;
        }
      }
    }
    
    // Add current incomplete over
    if (ballsInOver > 0) {
      const totalBalls = (currentOver * 6) + ballsInOver;
      const runsInThisOver = runningScore - overStartScore;
      progression.push({
        over: currentOver + (ballsInOver / 6),
        score: runningScore,
        runRate: totalBalls > 0 ? (runningScore / totalBalls) * 6 : 0,
        runsInOver: runsInThisOver
      });
    }
    
    return progression;
  }

  static getTeamBattingStats(team: Team): {
    totalRuns: number;
    totalBalls: number;
    strikeRate: number;
    totalBoundaries: number;
    boundaryPercentage: number;
    activeBatters: number;
  } | null {
    const batters = team.players.filter(p => p.battingStats && p.battingStats.balls > 0);
    if (batters.length === 0) return null;
    
    const totalRuns = batters.reduce((sum, p) => sum + (p.battingStats?.runs || 0), 0);
    const totalBalls = batters.reduce((sum, p) => sum + (p.battingStats?.balls || 0), 0);
    const totalFours = batters.reduce((sum, p) => sum + (p.battingStats?.fours || 0), 0);
    const totalSixes = batters.reduce((sum, p) => sum + (p.battingStats?.sixes || 0), 0);
    const boundaryRuns = (totalFours * 4) + (totalSixes * 6);
    
    return {
      totalRuns,
      totalBalls,
      strikeRate: totalBalls > 0 ? (totalRuns / totalBalls) * 100 : 0,
      totalBoundaries: totalFours + totalSixes,
      boundaryPercentage: totalRuns > 0 ? (boundaryRuns / totalRuns) * 100 : 0,
      activeBatters: batters.length
    };
  }

  static getTeamBowlingStats(team: Team): {
    totalWickets: number;
    totalRuns: number;
    totalOvers: number;
    economyRate: number;
    strikeRate: number;
    activeBowlers: number;
  } | null {
    const bowlers = team.players.filter(p => p.bowlingStats && p.bowlingStats.balls > 0);
    if (bowlers.length === 0) return null;
    
    const totalWickets = bowlers.reduce((sum, p) => sum + (p.bowlingStats?.wickets || 0), 0);
    const totalRuns = bowlers.reduce((sum, p) => sum + (p.bowlingStats?.runs || 0), 0);
    const totalBalls = bowlers.reduce((sum, p) => sum + (p.bowlingStats?.balls || 0), 0);
    const totalOvers = Math.floor(totalBalls / 6) + (totalBalls % 6) / 10;
    
    return {
      totalWickets,
      totalRuns,
      totalOvers,
      economyRate: totalOvers > 0 ? totalRuns / totalOvers : 0,
      strikeRate: totalWickets > 0 ? totalBalls / totalWickets : 0,
      activeBowlers: bowlers.length
    };
  }
}