import React from 'react';
import { Trophy } from 'lucide-react';

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

// --- TEAM SCORE CARD SUB-COMPONENT ---
const TeamScoreCard = ({ team, color, isWinner }: { team: Team, color: string, isWinner: boolean }) => (
  <div className={`bg-black/40 p-5 rounded-2xl border ${isWinner ? 'border-white/30' : 'border-white/10'} transition-all duration-300 ${isWinner ? 'shadow-lg' : ''}`}>
    <div className="flex justify-between items-center">
      <p className="font-bold text-xl text-white">{team.name}</p>
      {isWinner && <span className="text-xs font-bold bg-white/90 rounded-full px-2 py-0.5" style={{color: color}}>WINNER</span>}
    </div>
    <p className="font-mono text-4xl font-extrabold mt-2" style={{ color }}>
      {team.score}<span className="text-white/40 text-3xl font-medium">/{team.wickets}</span>
    </p>
  </div>
);


// --- WINNER PANEL COMPONENT ---
// This component displays the final match result with an enhanced, beautiful design.

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

  const panelStyle = {
    color: overlaySettings?.styleSettings?.panelTextColor || '#ffffff',
    fontFamily: 'Inter, sans-serif'
  } as React.CSSProperties;
  
  const team1Color = overlaySettings?.teamAColor || '#3b82f6';
  const team2Color = overlaySettings?.teamBColor || '#ef4444';
  const winnerColor = winnerDetails.team?.id === 'A' ? team1Color : team2Color;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl ${panelAnimation || ''}`} style={panelStyle}>
        <style>
            {`
                @keyframes fadeIn { 
                    from { opacity: 0; transform: translateY(20px) scale(0.98); } 
                    to { opacity: 1; transform: translateY(0) scale(1); } 
                }
                .fade-in-animate { animation: fadeIn 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }

                @keyframes pulseTrophy {
                  0%, 100% { transform: scale(1); }
                  50% { transform: scale(1.1); }
                }
                .pulse-trophy-animate { animation: pulseTrophy 2s ease-in-out infinite; }
                
                .gradient-border::before {
                  content: '';
                  position: absolute;
                  top: 0; right: 0; bottom: 0; left: 0;
                  z-index: -1;
                  margin: -2px; 
                  border-radius: inherit; 
                  background: linear-gradient(145deg, ${winnerColor || '#c0c0c0'}, ${winnerColor ? `${winnerColor}40` : '#333'}, transparent);
                }
            `}
        </style>
      <div className="w-full max-w-2xl bg-gray-900/50 rounded-3xl shadow-2xl overflow-hidden fade-in-animate relative gradient-border">
        <div className="p-10 flex flex-col items-center text-center relative">
            <div 
              className="absolute top-0 left-0 w-full h-full opacity-10" 
              style={{
                background: `radial-gradient(circle at 50% 0%, ${winnerColor || '#555'} 0%, transparent 70%)`
              }}
            ></div>
            
            <Trophy className="h-24 w-24 mx-auto pulse-trophy-animate" style={{ color: winnerColor || '#c0c0c0', filter: `drop-shadow(0 0 20px ${winnerColor || '#c0c0c0'})` }} />
            
            <p className="mt-4 text-lg font-medium text-white/60 tracking-wider">
              {winnerDetails.team ? `WINNER` : 'MATCH UPDATE'}
            </p>

            <h2 className="text-6xl font-black mt-2 text-white" style={{ textShadow: `0 0 30px ${winnerColor || '#000'}` }}>
                {winnerDetails.team ? winnerDetails.team.name.toUpperCase() : winnerDetails.margin}
            </h2>
            
            {winnerDetails.team && (
              <p className="text-3xl text-white/80 mt-2 font-light">
                won {winnerDetails.margin}
              </p>
            )}
            
            <div className="mt-12 w-full grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <TeamScoreCard team={teamA} color={team1Color} isWinner={winnerDetails.team?.id === 'A'} />
              <TeamScoreCard team={teamB} color={team2Color} isWinner={winnerDetails.team?.id === 'B'} />
            </div>
        </div>
      </div>
    </div>
  );
};

export default WinnerPanel;

