import React from 'react';
import { MatchState } from '../types'; // Assuming types are defined elsewhere
import { CricketScorer } from '../cricketUtils'; // Assuming utils are defined elsewhere
import { BarChart3, TrendingUp, Target, Zap, Clock } from 'lucide-react';

// --- TYPE DEFINITIONS ---
// Using placeholder types as the original ones were not fully provided.
// Ensure these match your actual project types.
interface PlayerRef {
  id: string;
  name: string;
  battingStats?: { runs: number; balls: number; fours: number; sixes: number; };
  bowlingStats?: { runs: number; balls: number; wickets: number; maidens?: number; };
}

interface Team {
  id: 'A' | 'B';
  name: string;
  score: number;
  wickets: number;
  players: PlayerRef[];
  logoUrl?: string;
}

interface Innings {
  battingTeam: 'A' | 'B';
  events: any[];
  maxOvers: number;
  overNumber: number;
  legalBallsInCurrentOver: number;
  target?: number;
  isComplete: boolean;
}

interface MatchState {
  teamA: Team;
  teamB: Team;
  innings1: Innings;
  innings2?: Innings;
  currentInnings: number;
  isComplete: boolean;
}
// --- END OF TYPE DEFINITIONS ---


interface TeamComparisonPanelProps {
  match: MatchState;
  overlaySettings?: any;
  panelAnimation?: string;
}

export const TeamComparisonPanel: React.FC<TeamComparisonPanelProps> = ({ 
  match, 
  overlaySettings, 
  panelAnimation 
}) => {
  const { innings1, innings2, teamA, teamB } = match;
  
  const team1 = innings1.battingTeam === 'A' ? teamA : teamB;
  const team2 = innings1.battingTeam === 'A' ? teamB : teamA;
  
  const getTeamBattingStats = (team: Team) => {
    const batters = team.players.filter(p => p.battingStats && p.battingStats.balls > 0);
    if (batters.length === 0) return null;
    
    const totalRuns = batters.reduce((sum, p) => sum + (p.battingStats?.runs || 0), 0);
    const totalBalls = batters.reduce((sum, p) => sum + (p.battingStats?.balls || 0), 0);
    const totalFours = batters.reduce((sum, p) => sum + (p.battingStats?.fours || 0), 0);
    const totalSixes = batters.reduce((sum, p) => sum + (p.battingStats?.sixes || 0), 0);
    const boundaryRuns = (totalFours * 4) + (totalSixes * 6);
    
    return {
      totalRuns,
      strikeRate: totalBalls > 0 ? (totalRuns / totalBalls) * 100 : 0,
      totalBoundaries: totalFours + totalSixes,
      boundaryPercentage: totalRuns > 0 ? (boundaryRuns / totalRuns) * 100 : 0,
    };
  };
  
  const getTeamBowlingStats = (team: Team) => {
    const bowlers = team.players.filter(p => p.bowlingStats && p.bowlingStats.balls > 0);
    if (bowlers.length === 0) return null;
    
    const totalWickets = bowlers.reduce((sum, p) => sum + (p.bowlingStats?.wickets || 0), 0);
    const totalRuns = bowlers.reduce((sum, p) => sum + (p.bowlingStats?.runs || 0), 0);
    const totalBalls = bowlers.reduce((sum, p) => sum + (p.bowlingStats?.balls || 0), 0);
    
    return {
      totalWickets,
      economyRate: totalBalls > 0 ? (totalRuns / totalBalls) * 6 : 0,
    };
  };

  const team1BattingStats = getTeamBattingStats(team1);
  const team2BattingStats = getTeamBattingStats(team2);
  const team1BowlingStats = getTeamBowlingStats(team2); // Team 1 bowls to Team 2
  const team2BowlingStats = getTeamBowlingStats(team1); // Team 2 bowls to Team 1

  const isSecondInnings = match.currentInnings === 2 && innings2;
  
  // Calculate runs needed for the win condition check
  const runsNeeded = isSecondInnings && innings2?.target ? Math.max(0, innings2.target - team2.score) : -1;

  const panelStyle = {
    color: overlaySettings?.styleSettings?.panelTextColor || '#ffffff',
    fontFamily: 'Inter, sans-serif'
  } as React.CSSProperties;
  
  const team1Color = overlaySettings?.teamAColor || '#3b82f6';
  const team2Color = overlaySettings?.teamBColor || '#ef4444';

  const StatDisplay = ({ label, value, color }: { label: string, value: string | number, color: string }) => (
    <div className="text-center">
        <p className="text-3xl font-bold" style={{ color }}>{value}</p>
        <p className="text-sm text-white/60 uppercase tracking-wider">{label}</p>
    </div>
  );

  const ComparisonRow = ({ label, value1, value2, color1, color2 }: { label: string, value1: number, value2: number, color1: string, color2: string }) => {
    const total = value1 + value2;
    const percentage1 = total > 0 ? (value1 / total) * 100 : 50;
    return (
        <div>
            <div className="flex justify-between items-center mb-1 text-sm font-semibold">
                <span style={{color: color1}}>{value1.toFixed(2)}</span>
                <span className="text-white/70">{label}</span>
                <span style={{color: color2}}>{value2.toFixed(2)}</span>
            </div>
            <div className="w-full bg-black/30 h-2 rounded-full flex overflow-hidden">
                <div className="h-full transition-all duration-500" style={{ width: `${percentage1}%`, backgroundColor: color1 }}></div>
                <div className="h-full transition-all duration-500" style={{ width: `${100 - percentage1}%`, backgroundColor: color2 }}></div>
            </div>
        </div>
    );
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm ${panelAnimation || ''}`} style={panelStyle}>
      <div className="w-full max-w-6xl bg-[#1a1a1a] rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-black/20 flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Head to Head</h1>
                <p className="text-sm text-white/60">{team1.name} vs {team2.name}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-white/50"/>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-3">
            {/* Team 1 Panel */}
            <div className="p-6 text-center border-r border-white/10 flex flex-col justify-between">
                <div>
                    <h2 className="text-3xl font-bold" style={{color: team1Color}}>{team1.name}</h2>
                    <p className="text-6xl font-extrabold text-white mt-4">{team1.score}/{team1.wickets}</p>
                    <p className="text-lg text-white/70">{innings1.overNumber}.{innings1.legalBallsInCurrentOver} Overs</p>
                </div>
                <div className="mt-8 space-y-4">
                    {team1BattingStats && <StatDisplay label="Boundaries" value={team1BattingStats.totalBoundaries} color={team1Color} />}
                    {team2BowlingStats && <StatDisplay label="Wickets Taken" value={team2BowlingStats.totalWickets} color={team1Color} />}
                </div>
            </div>

            {/* Center Comparison Panel */}
            <div className="p-6 bg-black/20">
                <div className="space-y-6">
                    {team1BattingStats && team2BattingStats && (
                        <ComparisonRow 
                            label="Strike Rate"
                            value1={team1BattingStats.strikeRate}
                            value2={team2BattingStats.strikeRate}
                            color1={team1Color}
                            color2={team2Color}
                        />
                    )}
                    {team1BowlingStats && team2BowlingStats && (
                        <ComparisonRow 
                            label="Economy Rate"
                            value1={team1BowlingStats.economyRate}
                            value2={team2BowlingStats.economyRate}
                            color1={team1Color}
                            color2={team2Color}
                        />
                    )}
                    {team1BattingStats && team2BattingStats && (
                         <ComparisonRow 
                            label="Boundary %"
                            value1={team1BattingStats.boundaryPercentage}
                            value2={team2BattingStats.boundaryPercentage}
                            color1={team1Color}
                            color2={team2Color}
                        />
                    )}
                </div>
                {isSecondInnings && innings2?.target && (
                    <div className="text-center mt-8 pt-6 border-t border-white/10">
                        {/* LOGIC UPDATE: Show winner message when runs needed is 0 */}
                        {runsNeeded > 0 ? (
                            <>
                                <p className="text-sm text-white/70 uppercase tracking-wider">Target</p>
                                <p className="text-5xl font-bold text-yellow-400 my-1">{innings2.target}</p>
                                <p className="text-lg text-white/80">{runsNeeded} runs needed to win</p>
                            </>
                        ) : (
                            <>
                                <p className="text-4xl font-bold" style={{ color: team2Color }}>{team2.name} Won</p>
                                <p className="text-lg text-white/80">by {10 - team2.wickets} wickets</p>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Team 2 Panel */}
            <div className="p-6 text-center border-l border-white/10 flex flex-col justify-between">
                <div>
                    <h2 className="text-3xl font-bold" style={{color: team2Color}}>{team2.name}</h2>
                    {isSecondInnings && innings2 ? (
                        <>
                            <p className="text-6xl font-extrabold text-white mt-4">{team2.score}/{team2.wickets}</p>
                            <p className="text-lg text-white/70">{innings2.overNumber}.{innings2.legalBallsInCurrentOver} Overs</p>
                        </>
                    ) : (
                        <p className="text-2xl text-white/50 mt-12">Yet to Bat</p>
                    )}
                </div>
                <div className="mt-8 space-y-4">
                    {team2BattingStats && <StatDisplay label="Boundaries" value={team2BattingStats.totalBoundaries} color={team2Color} />}
                    {team1BowlingStats && <StatDisplay label="Wickets Taken" value={team1BowlingStats.totalWickets} color={team2Color} />}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default TeamComparisonPanel;
