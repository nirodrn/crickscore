import React from 'react';
import { MatchState, PlayerRef } from '../types';
import { CricketScorer } from '../cricketUtils';
import { BarChart3, TrendingUp, Target, Zap, Clock } from 'lucide-react';

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
  const innings1 = match.innings1;
  const innings2 = match.innings2;
  
  const team1 = innings1.battingTeam === 'A' ? match.teamA : match.teamB;
  const team2 = innings1.battingTeam === 'A' ? match.teamB : match.teamA;
  
  // Calculate team statistics
  const getTeamBattingStats = (teamPlayers: PlayerRef[]) => {
    const batters = teamPlayers.filter(p => p.battingStats && p.battingStats.balls > 0);
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
  };
  
  const getTeamBowlingStats = (teamPlayers: PlayerRef[]) => {
    const bowlers = teamPlayers.filter(p => p.bowlingStats && p.bowlingStats.balls > 0);
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
  };
  
  // Get run rate progression for comparison
  const getRunRateProgression = (events: any[], maxOvers: number) => {
    const progression = [];
    let runningScore = 0;
    let currentOver = 0;
    let ballsInOver = 0;
    
    for (const event of events) {
      runningScore += (event.runsBat || 0) + (event.runsExtra || 0);
      
      if (event.legalBallInOver !== undefined) {
        ballsInOver++;
        if (ballsInOver === 6) {
          currentOver++;
          ballsInOver = 0;
          const totalBalls = currentOver * 6;
          progression.push({
            over: currentOver,
            score: runningScore,
            runRate: totalBalls > 0 ? (runningScore / totalBalls) * 6 : 0
          });
        }
      }
    }
    
    // Add current over if incomplete
    if (ballsInOver > 0) {
      const totalBalls = (currentOver * 6) + ballsInOver;
      progression.push({
        over: currentOver + (ballsInOver / 6),
        score: runningScore,
        runRate: totalBalls > 0 ? (runningScore / totalBalls) * 6 : 0
      });
    }
    
    return progression;
  };
  
  const team1BattingStats = getTeamBattingStats(team1.players);
  const team2BattingStats = getTeamBattingStats(team2.players);
  const team1BowlingStats = getTeamBowlingStats(team1.players);
  const team2BowlingStats = getTeamBowlingStats(team2.players);
  
  const isSecondInnings = match.currentInnings === 2 && innings2;
  
  // Run rate progressions for second innings comparison
  const innings1Progression = getRunRateProgression(innings1.events, innings1.maxOvers || 20);
  const innings2Progression = isSecondInnings ? getRunRateProgression(innings2.events, innings2.maxOvers || 20) : [];
  
  const panelStyle = {
    color: overlaySettings?.styleSettings?.panelTextColor || overlaySettings?.textColor || '#ffffff'
  } as React.CSSProperties;
  
  const primaryColor = overlaySettings?.primaryColor || '#1e3a8a';
  const secondaryColor = overlaySettings?.secondaryColor || '#1d4ed8';
  const accentColor = overlaySettings?.accentColor || '#3b82f6';
  
  const glassClass = 'bg-black/30 backdrop-blur-3xl border border-white/20 rounded-2xl shadow-2xl';
  
  // Progress bar component
  const ProgressBar: React.FC<{ value: number; max: number; color: string; label: string }> = ({ 
    value, max, color, label 
  }) => {
    const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span>{label}</span>
          <span>{value.toFixed(1)}</span>
        </div>
        <div className="w-full bg-black/30 rounded-full h-2">
          <div 
            className="h-2 rounded-full transition-all duration-500"
            style={{ 
              width: `${percentage}%`, 
              backgroundColor: color,
              boxShadow: `0 0 10px ${color}40`
            }}
          />
        </div>
      </div>
    );
  };
  
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-6 ${panelAnimation || ''}`} style={panelStyle}>
      <div className={`w-full max-w-7xl ${glassClass} overflow-hidden`}>
        {/* Header */}
        <div className="p-6" style={{ background: `linear-gradient(135deg, ${primaryColor}40, ${secondaryColor}20)` }}>
          <div className="flex items-center space-x-4">
            <div className="bg-black/40 rounded-full p-3" style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.45)' }}>
              <BarChart3 className="h-8 w-8 text-white/90" />
            </div>
            <div>
              <div className="text-3xl font-bold">Team Comparison</div>
              <div className="text-lg opacity-80">{team1.name} vs {team2.name}</div>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {isSecondInnings ? (
            /* Second Innings Comparison */
            <div className="space-y-6">
              {/* Current Status */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-black/40 rounded-xl p-6 border border-white/10">
                  <div className="flex items-center space-x-3 mb-4">
                    {team1.logoUrl && (
                      <img src={team1.logoUrl} alt={team1.name} className="h-10 w-10 rounded-full object-cover" />
                    )}
                    <div>
                      <div className="text-xl font-bold">{team1.name}</div>
                      <div className="text-sm opacity-70">First Innings</div>
                    </div>
                  </div>
                  <div className="text-3xl font-bold mb-2" style={{ color: accentColor }}>
                    {team1.score}/{team1.wickets}
                  </div>
                  <div className="text-sm opacity-70">
                    {innings1.overNumber}.{innings1.legalBallsInCurrentOver} overs
                  </div>
                </div>
                
                <div className="bg-black/40 rounded-xl p-6 border border-white/10">
                  <div className="flex items-center space-x-3 mb-4">
                    {team2.logoUrl && (
                      <img src={team2.logoUrl} alt={team2.name} className="h-10 w-10 rounded-full object-cover" />
                    )}
                    <div>
                      <div className="text-xl font-bold">{team2.name}</div>
                      <div className="text-sm opacity-70">Second Innings</div>
                    </div>
                  </div>
                  <div className="text-3xl font-bold mb-2" style={{ color: accentColor }}>
                    {team2.score}/{team2.wickets}
                  </div>
                  <div className="text-sm opacity-70">
                    {innings2.overNumber}.{innings2.legalBallsInCurrentOver} overs
                    {innings2.target && (
                      <div className="mt-1">
                        Target: {innings2.target} • Need: {Math.max(0, innings2.target - team2.score)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Run Rate Comparison Chart */}
              <div className="bg-black/40 rounded-xl p-6 border border-white/10">
                <div className="flex items-center space-x-2 mb-4">
                  <TrendingUp className="h-5 w-5" style={{ color: accentColor }} />
                  <div className="text-lg font-semibold">Run Rate Progression</div>
                </div>
                
                <div className="relative">
                  <svg width="100%" height="300" viewBox="0 0 800 300" className="w-full">
                    {/* Grid */}
                    <defs>
                      <pattern id="comparisonGrid" width="40" height="30" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
                      </pattern>
                    </defs>
                    <rect width="720" height="240" x="60" y="20" fill="url(#comparisonGrid)" />
                    
                    {/* Axes */}
                    <line x1="60" y1="260" x2="780" y2="260" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
                    <line x1="60" y1="20" x2="60" y2="260" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
                    
                    {/* Y-axis labels (Run Rate) */}
                    {[0, 5, 10, 15, 20].map(rate => (
                      <g key={rate}>
                        <text x="50" y={260 - (rate / 20) * 240 + 5} textAnchor="end" fill="rgba(255,255,255,0.7)" fontSize="12">
                          {rate}
                        </text>
                        <line x1="60" y1={260 - (rate / 20) * 240} x2="780" y2={260 - (rate / 20) * 240} stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
                      </g>
                    ))}
                    
                    {/* X-axis labels (Overs) */}
                    {Array.from({ length: Math.ceil((innings1.maxOvers || 20) / 5) + 1 }, (_, i) => i * 5).map(over => (
                      <text key={over} x={60 + (over / (innings1.maxOvers || 20)) * 720} y="280" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="12">
                        {over}
                      </text>
                    ))}
                    
                    {/* First innings line */}
                    {innings1Progression.length > 1 && (
                      <polyline
                        points={innings1Progression.map(p => 
                          `${60 + (p.over / (innings1.maxOvers || 20)) * 720},${260 - Math.min(p.runRate / 20, 1) * 240}`
                        ).join(' ')}
                        fill="none"
                        stroke={primaryColor}
                        strokeWidth="3"
                        className="animate-drawLine"
                      />
                    )}
                    
                    {/* Second innings line */}
                    {innings2Progression.length > 1 && (
                      <polyline
                        points={innings2Progression.map(p => 
                          `${60 + (p.over / (innings2.maxOvers || 20)) * 720},${260 - Math.min(p.runRate / 20, 1) * 240}`
                        ).join(' ')}
                        fill="none"
                        stroke={accentColor}
                        strokeWidth="3"
                        className="animate-drawLine"
                        strokeDasharray="5,5"
                      />
                    )}
                    
                    {/* Required run rate line (if applicable) */}
                    {innings2 && innings2.target && (
                      <line
                        x1="60"
                        y1={260 - Math.min(CricketScorer.calculateRequiredRunRate(
                          innings2.target, 
                          team2.score, 
                          (innings2.maxOvers || 20) - innings2.overNumber - 1,
                          6 - innings2.legalBallsInCurrentOver
                        ) / 20, 1) * 240}
                        x2="780"
                        y2={260 - Math.min(CricketScorer.calculateRequiredRunRate(
                          innings2.target, 
                          team2.score, 
                          (innings2.maxOvers || 20) - innings2.overNumber - 1,
                          6 - innings2.legalBallsInCurrentOver
                        ) / 20, 1) * 240}
                        stroke="#ef4444"
                        strokeWidth="2"
                        strokeDasharray="10,5"
                      />
                    )}
                  </svg>
                  
                  {/* Legend */}
                  <div className="flex justify-center space-x-6 mt-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-1" style={{ backgroundColor: primaryColor }}></div>
                      <span className="text-sm">{team1.name} (1st Innings)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-1 border-dashed border-2" style={{ borderColor: accentColor }}></div>
                      <span className="text-sm">{team2.name} (2nd Innings)</span>
                    </div>
                    {innings2 && innings2.target && (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-1 border-dashed border-2 border-red-500"></div>
                        <span className="text-sm">Required Run Rate</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Key Statistics */}
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-black/40 rounded-xl p-6 border border-white/10 text-center">
                  <div className="text-2xl font-bold mb-2" style={{ color: accentColor }}>
                    {innings2 && innings2.target ? 
                      CricketScorer.calculateRequiredRunRate(
                        innings2.target, 
                        team2.score, 
                        (innings2.maxOvers || 20) - innings2.overNumber - 1,
                        6 - innings2.legalBallsInCurrentOver
                      ).toFixed(2) : 
                      '0.00'
                    }
                  </div>
                  <div className="text-sm opacity-70">Required Run Rate</div>
                </div>
                
                <div className="bg-black/40 rounded-xl p-6 border border-white/10 text-center">
                  <div className="text-2xl font-bold mb-2" style={{ color: accentColor }}>
                    {CricketScorer.calculateCurrentRunRate(
                      team2, 
                      innings2?.overNumber || 0, 
                      innings2?.legalBallsInCurrentOver || 0
                    ).toFixed(2)}
                  </div>
                  <div className="text-sm opacity-70">Current Run Rate</div>
                </div>
                
                <div className="bg-black/40 rounded-xl p-6 border border-white/10 text-center">
                  <div className="text-2xl font-bold mb-2" style={{ color: accentColor }}>
                    {innings2 && innings2.target ? Math.max(0, innings2.target - team2.score) : 0}
                  </div>
                  <div className="text-sm opacity-70">Runs Needed</div>
                </div>
              </div>
            </div>
          ) : (
            /* Pre-match or First Innings Comparison */
            <div className="space-y-6">
              {/* Overall Team Strength */}
              <div className="grid grid-cols-2 gap-6">
                {/* Team 1 */}
                <div className="bg-black/40 rounded-xl p-6 border border-white/10">
                  <div className="flex items-center space-x-3 mb-6">
                    {team1.logoUrl && (
                      <img src={team1.logoUrl} alt={team1.name} className="h-12 w-12 rounded-full object-cover" />
                    )}
                    <div>
                      <div className="text-2xl font-bold">{team1.name}</div>
                      <div className="text-sm opacity-70">Team Analysis</div>
                    </div>
                  </div>
                  
                  {team1BattingStats && (
                    <div className="mb-6">
                      <div className="flex items-center space-x-2 mb-3">
                        <Target className="h-4 w-4" style={{ color: accentColor }} />
                        <div className="font-semibold">Batting Strength</div>
                      </div>
                      <ProgressBar 
                        value={team1BattingStats.strikeRate} 
                        max={200} 
                        color={primaryColor} 
                        label="Strike Rate" 
                      />
                      <ProgressBar 
                        value={team1BattingStats.boundaryPercentage} 
                        max={100} 
                        color={accentColor} 
                        label="Boundary %" 
                      />
                      <div className="text-sm opacity-70">
                        Active Batters: {team1BattingStats.activeBatters} • 
                        Boundaries: {team1BattingStats.totalBoundaries}
                      </div>
                    </div>
                  )}
                  
                  {team1BowlingStats && (
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <Zap className="h-4 w-4" style={{ color: accentColor }} />
                        <div className="font-semibold">Bowling Strength</div>
                      </div>
                      <ProgressBar 
                        value={team1BowlingStats.economyRate} 
                        max={12} 
                        color={secondaryColor} 
                        label="Economy Rate" 
                      />
                      <div className="text-sm opacity-70">
                        Wickets: {team1BowlingStats.totalWickets} • 
                        Active Bowlers: {team1BowlingStats.activeBowlers}
                      </div>
                    </div>
                  )}
                  
                  {!team1BattingStats && !team1BowlingStats && (
                    <div className="text-center py-8 opacity-50">
                      <Clock className="h-12 w-12 mx-auto mb-2" />
                      <div>No performance data yet</div>
                    </div>
                  )}
                </div>
                
                {/* Team 2 */}
                <div className="bg-black/40 rounded-xl p-6 border border-white/10">
                  <div className="flex items-center space-x-3 mb-6">
                    {team2.logoUrl && (
                      <img src={team2.logoUrl} alt={team2.name} className="h-12 w-12 rounded-full object-cover" />
                    )}
                    <div>
                      <div className="text-2xl font-bold">{team2.name}</div>
                      <div className="text-sm opacity-70">Team Analysis</div>
                    </div>
                  </div>
                  
                  {team2BattingStats && (
                    <div className="mb-6">
                      <div className="flex items-center space-x-2 mb-3">
                        <Target className="h-4 w-4" style={{ color: accentColor }} />
                        <div className="font-semibold">Batting Strength</div>
                      </div>
                      <ProgressBar 
                        value={team2BattingStats.strikeRate} 
                        max={200} 
                        color={primaryColor} 
                        label="Strike Rate" 
                      />
                      <ProgressBar 
                        value={team2BattingStats.boundaryPercentage} 
                        max={100} 
                        color={accentColor} 
                        label="Boundary %" 
                      />
                      <div className="text-sm opacity-70">
                        Active Batters: {team2BattingStats.activeBatters} • 
                        Boundaries: {team2BattingStats.totalBoundaries}
                      </div>
                    </div>
                  )}
                  
                  {team2BowlingStats && (
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <Zap className="h-4 w-4" style={{ color: accentColor }} />
                        <div className="font-semibold">Bowling Strength</div>
                      </div>
                      <ProgressBar 
                        value={team2BowlingStats.economyRate} 
                        max={12} 
                        color={secondaryColor} 
                        label="Economy Rate" 
                      />
                      <div className="text-sm opacity-70">
                        Wickets: {team2BowlingStats.totalWickets} • 
                        Active Bowlers: {team2BowlingStats.activeBowlers}
                      </div>
                    </div>
                  )}
                  
                  {!team2BattingStats && !team2BowlingStats && (
                    <div className="text-center py-8 opacity-50">
                      <Clock className="h-12 w-12 mx-auto mb-2" />
                      <div>No performance data yet</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamComparisonPanel;