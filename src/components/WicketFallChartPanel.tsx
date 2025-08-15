import React from 'react';
import { TrendingDown, Target, Clock } from 'lucide-react';

// --- TYPE DEFINITIONS ---
// These interfaces define the shape of the data we expect for the match, ball events, and wickets.

// Represents the overall state of the match.
interface MatchState {
  teamA: Team;
  teamB: Team;
  innings1: Innings;
  innings2?: Innings;
}

// Represents a single team.
interface Team {
  id: 'A' | 'B';
  name: string;
  score: number;
  players: Player[];
}

// Represents a player in a team.
interface Player {
  id: string;
  name: string;
}

// Represents one of the two innings in a match.
interface Innings {
  battingTeam: 'A' | 'B';
  events: BallEvent[];
  maxOvers?: number;
}

// Represents a single ball event in an innings.
interface BallEvent {
  kind: string;
  overNumber: number;
  legalBallInOver?: number;
  runsBat?: number;
  runsExtra?: number;
  strikerIdBefore?: string;
  wicketType?: string;
}

// A processed data structure representing a single wicket fall.
interface WicketFall {
  overNumber: number;
  ballInOver: number;
  score: number;
  wicketNumber: number;
  playerName: string;
  dismissalType: string;
  innings: number;
  teamName: string;
  teamId: 'A' | 'B';
}

// --- COMPONENT PROPS ---
interface WicketFallChartPanelProps {
  match: MatchState;
  overlaySettings?: any;
  panelAnimation?: string;
}

// --- WICKET FALL CHART PANEL COMPONENT ---
// This component visualizes the fall of wickets for both teams in a cricket match.
// It includes an SVG chart and detailed lists for each innings.

export const WicketFallChartPanel: React.FC<WicketFallChartPanelProps> = ({ 
  match, 
  overlaySettings, 
  panelAnimation 
}) => {
  const getWicketFalls = (): WicketFall[] => {
    const wickets: WicketFall[] = [];
    
    // Process first innings
    if (match.innings1.events.length > 0) {
      const battingTeam1 = match.innings1.battingTeam === 'A' ? match.teamA : match.teamB;
      let wicketCount = 0;
      let runningScore = 0;
      
      match.innings1.events.forEach((event: BallEvent) => {
        runningScore += (event.runsBat || 0) + (event.runsExtra || 0);
        
        if (event.kind === 'wicket') {
          wicketCount++;
          const dismissedPlayer = battingTeam1.players.find(p => p.id === event.strikerIdBefore);
          
          wickets.push({
            overNumber: event.overNumber,
            ballInOver: event.legalBallInOver || 0,
            score: runningScore - (event.runsBat || 0),
            wicketNumber: wicketCount,
            playerName: dismissedPlayer?.name || 'Unknown',
            dismissalType: event.wicketType || 'unknown',
            innings: 1,
            teamName: battingTeam1.name,
            teamId: battingTeam1.id
          });
        }
      });
    }
    
    // Process second innings
    if (match.innings2 && match.innings2.events.length > 0) {
      const battingTeam2 = match.innings2.battingTeam === 'A' ? match.teamA : match.teamB;
      let wicketCount = 0;
      let runningScore = 0;
      
      match.innings2.events.forEach((event: BallEvent) => {
        runningScore += (event.runsBat || 0) + (event.runsExtra || 0);
        
        if (event.kind === 'wicket') {
          wicketCount++;
          const dismissedPlayer = battingTeam2.players.find(p => p.id === event.strikerIdBefore);
          
          wickets.push({
            overNumber: event.overNumber,
            ballInOver: event.legalBallInOver || 0,
            score: runningScore - (event.runsBat || 0),
            wicketNumber: wicketCount,
            playerName: dismissedPlayer?.name || 'Unknown',
            dismissalType: event.wicketType || 'unknown',
            innings: 2,
            teamName: battingTeam2.name,
            teamId: battingTeam2.id
          });
        }
      });
    }
    
    return wickets;
  };
  
  const wicketFalls = getWicketFalls();
  const team1Wickets = wicketFalls.filter(w => w.innings === 1);
  const team2Wickets = wicketFalls.filter(w => w.innings === 2);
  
  const getDismissalColor = (type: string) => {
    switch (type) {
      case 'bowled': return '#ef4444';
      case 'caught': return '#f97316';
      case 'lbw': return '#eab308';
      case 'runout-striker':
      case 'runout-nonstriker': return '#8b5cf6';
      case 'stumped': return '#06b6d4';
      default: return '#6b7280';
    }
  };

  const panelStyle = {
    color: overlaySettings?.styleSettings?.panelTextColor || '#ffffff',
    fontFamily: 'Inter, sans-serif'
  } as React.CSSProperties;
  
  const team1Color = overlaySettings?.teamAColor || '#3b82f6';
  const team2Color = overlaySettings?.teamBColor || '#ef4444';
  
  const maxOvers = Math.max(match.innings1.maxOvers || 20, match.innings2?.maxOvers || 20);
  const chartWidth = 900;
  const chartHeight = 500;
  const marginLeft = 80;
  const marginRight = 40;
  const marginTop = 40;
  const marginBottom = 60;
  
  const plotWidth = chartWidth - marginLeft - marginRight;
  const plotHeight = chartHeight - marginTop - marginBottom;
  
  const maxScore = Math.max(match.teamA.score, match.teamB.score, 100);
  
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 ${panelAnimation || ''}`} style={panelStyle}>
        <style>
            {`
                @keyframes drawLine { from { stroke-dashoffset: 1000; } to { stroke-dashoffset: 0; } }
                .animate-drawLine { stroke-dasharray: 1000; animation: drawLine 2s ease-out forwards; }
                .fade-in { animation: fadeIn 0.5s ease-in-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}
        </style>
      <div className="w-full max-w-7xl bg-[#1a1a1a] rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-black/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Fall of Wickets</h1>
              <p className="text-sm text-white/60">{match.teamA.name} vs {match.teamB.name}</p>
            </div>
            <div className="text-right">
                <p className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{backgroundColor: team1Color}}></span>
                    {match.teamA.name} {match.teamA.score}/{team1Wickets.length}
                </p>
                {match.innings2 && (
                    <p className="text-xl font-bold text-white flex items-center gap-2 mt-1">
                        <span className="w-3 h-3 rounded-full" style={{backgroundColor: team2Color}}></span>
                        {match.teamB.name} {match.teamB.score}/{team2Wickets.length}
                    </p>
                )}
            </div>
          </div>
        </div>
        
        <div className="p-4">
          {wicketFalls.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              
              {/* --- COLUMN 1: CHART --- */}
              <div className="lg:col-span-3 bg-black/20 rounded-xl p-4 border border-white/10 flex flex-col">
                <div className="flex-grow">
                  <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full">
                    <rect width={plotWidth} height={plotHeight} x={marginLeft} y={marginTop} fill="transparent" />
                    <line x1={marginLeft} y1={marginTop + plotHeight} x2={marginLeft + plotWidth} y2={marginTop + plotHeight} stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
                    <line x1={marginLeft} y1={marginTop} x2={marginLeft} y2={marginTop + plotHeight} stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
                    {[...Array(5)].map((_, i) => { const score = Math.round((maxScore / 4) * i); return (<g key={score}><text x={marginLeft - 10} y={marginTop + plotHeight - (score / maxScore) * plotHeight + 4} textAnchor="end" fill="rgba(255,255,255,0.5)" fontSize="14">{score}</text><line x1={marginLeft} y1={marginTop + plotHeight - (score / maxScore) * plotHeight} x2={marginLeft + plotWidth} y2={marginTop + plotHeight - (score / maxScore) * plotHeight} stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="2,2"/></g>);})}
                    {Array.from({ length: Math.ceil(maxOvers / 5) + 1 }, (_, i) => i * 5).map(over => (<text key={over} x={marginLeft + (over / maxOvers) * plotWidth} y={marginTop + plotHeight + 25} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="14">{over}</text>))}
                    {team1Wickets.length > 0 && (<polyline points={[{score: 0, overNumber: 0, ballInOver: 0}, ...team1Wickets].map(w => `${marginLeft + ((w.overNumber + w.ballInOver / 6) / maxOvers) * plotWidth},${marginTop + plotHeight - (w.score / maxScore) * plotHeight}`).join(' ')} fill="none" stroke={team1Color} strokeWidth="3" strokeOpacity="0.9" className="animate-drawLine"/>)}
                    {team2Wickets.length > 0 && (<polyline points={[{score: 0, overNumber: 0, ballInOver: 0}, ...team2Wickets].map(w => `${marginLeft + ((w.overNumber + w.ballInOver / 6) / maxOvers) * plotWidth},${marginTop + plotHeight - (w.score / maxScore) * plotHeight}`).join(' ')} fill="none" stroke={team2Color} strokeWidth="3" strokeOpacity="0.9" strokeDasharray="6,6" className="animate-drawLine"/>)}
                    {wicketFalls.map((wicket, index) => { const x = marginLeft + ((wicket.overNumber + wicket.ballInOver / 6) / maxOvers) * plotWidth; const y = marginTop + plotHeight - (wicket.score / maxScore) * plotHeight; const markerColor = wicket.teamId === 'A' ? team1Color : team2Color; return (<g key={index} className="fade-in" style={{animationDelay: `${index * 100}ms`}}><circle cx={x} cy={y} r="6" fill={getDismissalColor(wicket.dismissalType)} stroke={markerColor} strokeWidth="2" /><circle cx={x} cy={y} r="10" fill="transparent" stroke={markerColor} strokeWidth="1" opacity="0.5" /></g>);})}
                    <text x={marginLeft + plotWidth / 2} y={chartHeight - 5} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="14" fontWeight="bold">Overs</text>
                    <text x={25} y={marginTop + plotHeight / 2} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="14" fontWeight="bold" transform={`rotate(-90, 25, ${marginTop + plotHeight / 2})`}>Score</text>
                  </svg>
                </div>
              </div>
              
              {/* --- COLUMN 2: DETAILS & LEGEND --- */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="bg-black/20 rounded-xl p-4 border border-white/10 flex-grow">
                    <h2 className="text-lg font-semibold text-white/80 mb-3">{team1Wickets[0]?.teamName}</h2>
                    <div className="space-y-2">
                      {team1Wickets.map((wicket) => (<div key={wicket.wicketNumber} className="flex items-center justify-between p-2 rounded-md bg-white/5 fade-in" style={{animationDelay: `${wicket.wicketNumber * 100}ms`}}><div className="flex items-center gap-3"><div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: team1Color }}>{wicket.wicketNumber}</div><div><p className="font-semibold text-white">{wicket.playerName}</p><p className="text-xs text-white/60 capitalize">{wicket.dismissalType.replace('-', ' ')}</p></div></div><div className="text-right"><p className="font-semibold text-white">{wicket.score}-{wicket.wicketNumber}</p><p className="text-xs text-white/60">{wicket.overNumber}.{wicket.ballInOver} ov</p></div></div>))}
                    </div>
                </div>
                
                {team2Wickets.length > 0 && (
                  <div className="bg-black/20 rounded-xl p-4 border border-white/10 flex-grow">
                    <h2 className="text-lg font-semibold text-white/80 mb-3">{team2Wickets[0]?.teamName}</h2>
                    <div className="space-y-2">
                      {team2Wickets.map((wicket) => (<div key={wicket.wicketNumber} className="flex items-center justify-between p-2 rounded-md bg-white/5 fade-in" style={{animationDelay: `${wicket.wicketNumber * 100}ms`}}><div className="flex items-center gap-3"><div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: team2Color }}>{wicket.wicketNumber}</div><div><p className="font-semibold text-white">{wicket.playerName}</p><p className="text-xs text-white/60 capitalize">{wicket.dismissalType.replace('-', ' ')}</p></div></div><div className="text-right"><p className="font-semibold text-white">{wicket.score}-{wicket.wicketNumber}</p><p className="text-xs text-white/60">{wicket.overNumber}.{wicket.ballInOver} ov</p></div></div>))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="bg-black/20 rounded-xl p-12 border border-white/10">
                <Clock className="h-16 w-16 mx-auto mb-4 text-white/50" />
                <div className="text-2xl font-semibold mb-2 text-white/80">No Wickets Yet</div>
                <div className="text-lg text-white/60">The chart will populate as the match progresses</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WicketFallChartPanel;
