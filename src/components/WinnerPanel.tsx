import React from 'react';
import { Trophy, Award } from 'lucide-react';

// --- TYPE DEFINITIONS ---
// These interfaces define the shape of the data we expect for the match and players.

interface MatchState {
  isComplete: boolean;
  teamA: Team;
  teamB: Team;
  innings1: Innings;
  innings2?: Innings;
}

interface Team {
  id: 'A' | 'B';
  name: string;
  score: number;
  wickets: number;
  players: Player[];
  logoUrl?: string;
}

interface Player {
  id: string;
  name: string;
  battingStats?: BattingStats;
  bowlingStats?: BowlingStats;
  imageUrl?: string;
}

interface BattingStats {
  runs: number;
  balls: number;
}

interface BowlingStats {
  runs: number;
  balls: number;
  wickets?: number;
}

interface Innings {
  battingTeam: 'A' | 'B';
  isComplete: boolean;
  overNumber: number;
  legalBallsInCurrentOver: number;
}

// --- COMPONENT PROPS ---
interface WinnerPanelProps {
  match: MatchState;
  overlaySettings?: any;
  panelAnimation?: string;
}

// --- WINNER PANEL COMPONENT ---
// This component displays the final match result, including the winner and top performers.

export const WinnerPanel: React.FC<WinnerPanelProps> = ({ 
  match, 
  overlaySettings, 
  panelAnimation 
}) => {
  const { teamA, teamB } = match;
  
  const getWinnerDetails = () => {
    const teamBattedFirst = match.innings1.battingTeam === 'A' ? teamA : teamB;
    const teamBattedSecond = match.innings1.battingTeam === 'A' ? teamB : teamA;

    if (match.innings2 && teamBattedSecond.score > teamBattedFirst.score) {
      const wicketsRemaining = 10 - teamBattedSecond.wickets;
      return { 
        team: teamBattedSecond, 
        margin: `by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''}`,
        isComplete: true
      };
    }

    if (match.isComplete) {
      if (teamBattedFirst.score > teamBattedSecond.score) {
        const runDifference = teamBattedFirst.score - teamBattedSecond.score;
        return { 
          team: teamBattedFirst, 
          margin: `by ${runDifference} run${runDifference !== 1 ? 's' : ''}`,
          isComplete: true
        };
      }
      if (teamBattedSecond.score > teamBattedFirst.score) {
        const wicketsRemaining = 10 - teamBattedSecond.wickets;
        return { 
          team: teamBattedSecond, 
          margin: `by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''}`,
          isComplete: true
        };
      }
      if (teamBattedFirst.score === teamBattedSecond.score) {
        return { team: null, margin: "Match Tied", isComplete: true };
      }
    }

    return { team: null, margin: "Match in Progress", isComplete: false };
  };
  
  const winnerDetails = getWinnerDetails();

  const getManOfTheMatch = () => {
    if (!winnerDetails.isComplete) return null;
    const allPlayers = [...teamA.players, ...teamB.players];
    let manOfTheMatch = null;
    let maxPoints = -1;

    allPlayers.forEach(player => {
      const runs = player.battingStats?.runs || 0;
      const wickets = player.bowlingStats?.wickets || 0;
      const points = (runs * 1) + (wickets * 20);

      if (points > maxPoints) {
        maxPoints = points;
        manOfTheMatch = player;
      }
    });

    return manOfTheMatch;
  };

  const manOfTheMatch = getManOfTheMatch();

  const panelStyle = {
    color: overlaySettings?.styleSettings?.panelTextColor || '#ffffff',
    fontFamily: 'Inter, sans-serif'
  } as React.CSSProperties;
  
  const team1Color = overlaySettings?.teamAColor || '#3b82f6';
  const team2Color = overlaySettings?.teamBColor || '#ef4444';
  const winnerColor = winnerDetails.team?.id === 'A' ? team1Color : team2Color;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm ${panelAnimation || ''}`} style={panelStyle}>
        <style>
            {`
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .fade-in-animate { animation: fadeIn 0.5s ease-out forwards; }
                @keyframes shine { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
                .shine-effect {
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                    background-size: 200% 100%;
                    animation: shine 5s infinite linear;
                }
            `}
        </style>
      <div className="w-full max-w-6xl bg-[#1a1a1a] rounded-2xl shadow-2xl border border-white/10 overflow-hidden fade-in-animate">
        <div className="grid grid-cols-1 md:grid-cols-5">

            {/* Man of the Match Section */}
            <div className="md:col-span-2 bg-black/20 p-6 flex flex-col items-center justify-center text-center border-r border-white/10">
                <h3 className="text-sm font-bold tracking-widest text-yellow-400 uppercase mb-4">Man of the Match</h3>
                {manOfTheMatch ? (
                    <>
                        <div className="relative">
                            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 flex items-center justify-center">
                                <Award className="h-16 w-16 text-yellow-400"/>
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-white mt-4">{manOfTheMatch.name}</p>
                        <div className="mt-2 text-lg text-white/70">
                            <span className="font-semibold">{manOfTheMatch.battingStats?.runs || 0}</span> Runs
                            <span className="mx-2">|</span>
                            <span className="font-semibold">{manOfTheMatch.bowlingStats?.wickets || 0}</span> Wickets
                        </div>
                    </>
                ) : (
                    <div className="text-center text-white/50 p-4">
                        <p>To be decided...</p>
                    </div>
                )}
            </div>

            {/* Winner Announcement & Scores */}
            <div className="md:col-span-3 p-8 flex flex-col text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-5 shine-effect" style={{background: `radial-gradient(circle at top right, ${winnerColor || '#555'} 0%, transparent 50%)`}}></div>
                <Trophy className="h-16 w-16 mx-auto" style={{ color: winnerColor || '#c0c0c0' }} />
                <h2 className="text-5xl font-extrabold mt-4" style={{ color: winnerColor || '#ffffff' }}>
                    {winnerDetails.team ? `${winnerDetails.team.name}` : winnerDetails.margin}
                </h2>
                <p className="text-2xl text-white/80 mt-1">
                    {winnerDetails.team ? `won ${winnerDetails.margin}` : ' '}
                </p>
                
                <div className="mt-8 w-full max-w-md mx-auto space-y-3">
                    <div className="flex justify-between items-center bg-black/30 p-3 rounded-lg border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-8 rounded" style={{backgroundColor: team1Color}}></div>
                            <p className="font-semibold text-white text-lg">{teamA.name}</p>
                        </div>
                        <p className="font-bold text-2xl text-white">{teamA.score}/{teamA.wickets}</p>
                    </div>
                    <div className="flex justify-between items-center bg-black/30 p-3 rounded-lg border border-white/10">
                        <div className="flex items-center gap-3">
                           <div className="w-2 h-8 rounded" style={{backgroundColor: team2Color}}></div>
                            <p className="font-semibold text-white text-lg">{teamB.name}</p>
                        </div>
                        <p className="font-bold text-2xl text-white">{teamB.score}/{teamB.wickets}</p>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default WinnerPanel;
