import React from 'react';
import { Users, Crown, Award, Star, TrendingUp } from 'lucide-react';

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
  battingStats?: BattingStats;
  isOut?: boolean;
  dismissal?: {
    type?: string;
  };
  imageUrl?: string;
}

interface BattingStats {
  runs: number;
  balls: number;
  fours?: number;
  sixes?: number;
}

interface Innings {
  battingTeam: 'A' | 'B';
}

// --- COMPONENT PROPS ---
interface BatsmanSummaryPanelProps {
  match: MatchState;
  overlaySettings?: any;
  panelAnimation?: string;
}

// --- BATSMAN SUMMARY PANEL COMPONENT ---
// This component displays a side-by-side summary of batting performances for both teams.

export const BatsmanSummaryPanel: React.FC<BatsmanSummaryPanelProps> = ({ 
  match, 
  overlaySettings, 
  panelAnimation 
}) => {
  const { innings1, teamA, teamB } = match;

  // Helper function to process and sort batters for a given team.
  const getTeamBatters = (team: Team) => {
    return team.players
      .filter(p => p.battingStats && p.battingStats.balls > 0)
      .map(p => ({
        ...p,
        strikeRate: p.battingStats?.balls ? (p.battingStats.runs / p.battingStats.balls) * 100 : 0,
      }))
      .sort((a, b) => (b.battingStats?.runs || 0) - (a.battingStats?.runs || 0));
  };

  const team1Batters = getTeamBatters(innings1.battingTeam === 'A' ? teamA : teamB);
  const team2Batters = getTeamBatters(innings1.battingTeam === 'A' ? teamB : teamA);
  
  const team1 = innings1.battingTeam === 'A' ? teamA : teamB;
  const team2 = innings1.battingTeam === 'A' ? teamB : teamA;

  const panelStyle = {
    color: overlaySettings?.styleSettings?.panelTextColor || '#ffffff',
    fontFamily: 'Inter, sans-serif'
  } as React.CSSProperties;
  
  const team1Color = overlaySettings?.teamAColor || '#3b82f6';
  const team2Color = overlaySettings?.teamBColor || '#ef4444';

  // A reusable component for rendering a single batsman's stats row.
  const BatsmanRow = ({ player, teamColor }: { player: any, teamColor: string }) => (
    <div className="grid grid-cols-12 gap-2 items-center py-2 px-3 rounded-md bg-white/5">
      <div className="col-span-5">
        <p className="font-semibold text-white truncate">{player.name}</p>
        <p className="text-xs text-white/60 capitalize">
          {player.isOut ? player.dismissal?.type?.replace('-', ' ') || 'Out' : 'Not Out'}
        </p>
      </div>
      <p className="col-span-1 text-center font-bold text-lg" style={{ color: teamColor }}>{player.battingStats.runs}</p>
      <p className="col-span-1 text-center text-white/80">{player.battingStats.balls}</p>
      <p className="col-span-1 text-center text-white/80">{player.battingStats.fours || 0}</p>
      <p className="col-span-1 text-center text-white/80">{player.battingStats.sixes || 0}</p>
      <p className="col-span-3 text-right text-white/80">{player.strikeRate.toFixed(2)}</p>
    </div>
  );

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 ${panelAnimation || ''}`} style={panelStyle}>
      <div className="w-full max-w-7xl bg-[#1a1a1a] rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-black/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Batting Summary</h1>
              <p className="text-sm text-white/60">{team1.name} vs {team2.name}</p>
            </div>
            <Users className="h-8 w-8 text-white/50" />
          </div>
        </div>
        
        <div className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Team 1 Batting Card */}
            <div className="bg-black/20 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-white/80">{team1.name}</h2>
                <p className="text-lg font-bold text-white">{team1.score}/{team1Batters.filter(p => p.isOut).length}</p>
              </div>
              {/* Header Row */}
              <div className="grid grid-cols-12 gap-2 px-3 pb-2 border-b border-white/10 text-xs text-white/60">
                <p className="col-span-5">Batsman</p>
                <p className="col-span-1 text-center">R</p>
                <p className="col-span-1 text-center">B</p>
                <p className="col-span-1 text-center">4s</p>
                <p className="col-span-1 text-center">6s</p>
                <p className="col-span-3 text-right">SR</p>
              </div>
              <div className="space-y-1 mt-2">
                {team1Batters.map(player => <BatsmanRow key={player.id} player={player} teamColor={team1Color} />)}
              </div>
            </div>

            {/* Team 2 Batting Card */}
            <div className="bg-black/20 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-white/80">{team2.name}</h2>
                <p className="text-lg font-bold text-white">{team2.score}/{team2Batters.filter(p => p.isOut).length}</p>
              </div>
              {/* Header Row */}
              <div className="grid grid-cols-12 gap-2 px-3 pb-2 border-b border-white/10 text-xs text-white/60">
                <p className="col-span-5">Batsman</p>
                <p className="col-span-1 text-center">R</p>
                <p className="col-span-1 text-center">B</p>
                <p className="col-span-1 text-center">4s</p>
                <p className="col-span-1 text-center">6s</p>
                <p className="col-span-3 text-right">SR</p>
              </div>
              <div className="space-y-1 mt-2">
                {team2Batters.map(player => <BatsmanRow key={player.id} player={player} teamColor={team2Color} />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatsmanSummaryPanel;
