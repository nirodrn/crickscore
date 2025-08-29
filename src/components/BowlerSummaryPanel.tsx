import React from 'react';
import { Zap } from 'lucide-react';

// --- TYPE DEFINITIONS ---
// These interfaces define the shape of the data we expect for the match and players.

interface MatchState {
  teamA: Team;
  teamB: Team;
  innings1: Innings;
  innings2?: Innings;
}

interface Team {
  id: 'A' | 'B';
  name: string;
  score: number;
  players: Player[];
}

interface Player {
  id: string;
  name: string;
  bowlingStats?: BowlingStats;
  imageUrl?: string;
}

interface BowlingStats {
  runs: number;
  balls: number;
  wickets?: number;
  maidens?: number;
}

interface Innings {
  battingTeam: 'A' | 'B';
}

// --- COMPONENT PROPS ---
interface BowlerSummaryPanelProps {
  match: MatchState;
  overlaySettings?: any;
  panelAnimation?: string;
}

// --- BOWLER SUMMARY PANEL COMPONENT ---
// This component displays a side-by-side summary of bowling performances for both teams.

export const BowlerSummaryPanel: React.FC<BowlerSummaryPanelProps> = ({ 
  match, 
  overlaySettings, 
  panelAnimation 
}) => {
  const { innings1, teamA, teamB } = match;

  // Helper function to process and sort bowlers for a given team.
  const getTeamBowlers = (team: Team) => {
    return team.players
      .filter(p => p.bowlingStats && p.bowlingStats.balls > 0)
      .map(p => ({
        ...p,
        economyRate: p.bowlingStats?.balls ? ((p.bowlingStats.runs / p.bowlingStats.balls) * 6) : 0,
        overs: `${Math.floor((p.bowlingStats?.balls || 0) / 6)}.${(p.bowlingStats?.balls || 0) % 6}`
      }))
      .sort((a, b) => {
        if ((b.bowlingStats?.wickets || 0) !== (a.bowlingStats?.wickets || 0)) {
          return (b.bowlingStats?.wickets || 0) - (a.bowlingStats?.wickets || 0);
        }
        return a.economyRate - b.economyRate;
      });
  };

  // Note: Team 1 bowlers are from the team that is NOT batting in innings 1.
  const team1Bowlers = getTeamBowlers(innings1.battingTeam === 'A' ? teamB : teamA);
  const team2Bowlers = getTeamBowlers(innings1.battingTeam === 'A' ? teamA : teamB);
  
  const team1 = innings1.battingTeam === 'A' ? teamB : teamA;
  const team2 = innings1.battingTeam === 'A' ? teamA : teamB;

  const panelStyle = {
    color: overlaySettings?.styleSettings?.panelTextColor || '#ffffff',
    fontFamily: 'Inter, sans-serif'
  } as React.CSSProperties;
  
  const team1Color = overlaySettings?.teamBColor || '#ef4444'; // Swapped to match bowling team
  const team2Color = overlaySettings?.teamAColor || '#3b82f6'; // Swapped to match bowling team

  // A reusable component for rendering a single bowler's stats row.
  const BowlerRow = ({ player, teamColor }: { player: any, teamColor: string }) => (
    <div className="grid grid-cols-12 gap-2 items-center py-2 px-3 rounded-md bg-white/5">
      <p className="col-span-5 font-semibold text-white truncate">{player.name}</p>
      <p className="col-span-1 text-center text-white/80">{player.overs}</p>
      <p className="col-span-1 text-center text-white/80">{player.bowlingStats.maidens || 0}</p>
      <p className="col-span-1 text-center text-white/80">{player.bowlingStats.runs}</p>
      <p className="col-span-1 text-center font-bold text-lg" style={{ color: teamColor }}>{player.bowlingStats.wickets || 0}</p>
      <p className="col-span-3 text-right text-white/80">{player.economyRate.toFixed(2)}</p>
    </div>
  );

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 ${panelAnimation || ''}`} style={panelStyle}>
      <div className="w-full max-w-7xl bg-[#1a1a1a] rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-black/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Bowling Summary</h1>
              <p className="text-sm text-white/60">{teamA.name} vs {teamB.name}</p>
            </div>
            <Zap className="h-8 w-8 text-white/50" />
          </div>
        </div>
        
        <div className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Team 1 Bowling Card */}
            <div className="bg-black/20 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-white/80">{team1.name}</h2>
              </div>
              {/* Header Row */}
              <div className="grid grid-cols-12 gap-2 px-3 pb-2 border-b border-white/10 text-xs text-white/60">
                <p className="col-span-5">Bowler</p>
                <p className="col-span-1 text-center">O</p>
                <p className="col-span-1 text-center">M</p>
                <p className="col-span-1 text-center">R</p>
                <p className="col-span-1 text-center">W</p>
                <p className="col-span-3 text-right">Econ</p>
              </div>
              <div className="space-y-1 mt-2">
                {team1Bowlers.map(player => <BowlerRow key={player.id} player={player} teamColor={team1Color} />)}
              </div>
            </div>

            {/* Team 2 Bowling Card */}
            <div className="bg-black/20 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-white/80">{team2.name}</h2>
              </div>
              {/* Header Row */}
              <div className="grid grid-cols-12 gap-2 px-3 pb-2 border-b border-white/10 text-xs text-white/60">
                <p className="col-span-5">Bowler</p>
                <p className="col-span-1 text-center">O</p>
                <p className="col-span-1 text-center">M</p>
                <p className="col-span-1 text-center">R</p>
                <p className="col-span-1 text-center">W</p>
                <p className="col-span-3 text-right">Econ</p>
              </div>
              <div className="space-y-1 mt-2">
                {team2Bowlers.map(player => <BowlerRow key={player.id} player={player} teamColor={team2Color} />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BowlerSummaryPanel;
