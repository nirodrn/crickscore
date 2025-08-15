import React from 'react';
import { MatchState, PlayerRef } from '../types';
import { CricketScorer } from '../cricketUtils';
import { Trophy, Target, Clock, Award } from 'lucide-react';

interface MatchSummaryPanelProps {
  match: MatchState;
  overlaySettings?: any;
  panelAnimation?: string;
}

export const MatchSummaryPanel: React.FC<MatchSummaryPanelProps> = ({ 
  match, 
  overlaySettings, 
  panelAnimation 
}) => {
  const innings1 = match.innings1;
  const innings2 = match.innings2;
  
  const team1 = innings1.battingTeam === 'A' ? match.teamA : match.teamB;
  const team2 = innings1.battingTeam === 'A' ? match.teamB : match.teamA;
  
  const matchResult = CricketScorer.getMatchResult(match);
  
  // Get top performers
  const getTopBatters = (teamPlayers: PlayerRef[], count: number = 3) => {
    return teamPlayers
      .filter(p => p.battingStats && p.battingStats.balls > 0)
      .sort((a, b) => (b.battingStats?.runs || 0) - (a.battingStats?.runs || 0))
      .slice(0, count);
  };
  
  const getTopBowlers = (teamPlayers: PlayerRef[], count: number = 3) => {
    return teamPlayers
      .filter(p => p.bowlingStats && p.bowlingStats.balls > 0)
      .sort((a, b) => (b.bowlingStats?.wickets || 0) - (a.bowlingStats?.wickets || 0))
      .slice(0, count);
  };
  
  const team1TopBatters = getTopBatters(team1.players);
  const team2TopBatters = getTopBatters(team2.players);
  const team1TopBowlers = getTopBowlers(team1.players);
  const team2TopBowlers = getTopBowlers(team2.players);
  
  const formatOvers = (overNumber: number, balls: number) => {
    return `${overNumber}.${balls}`;
  };
  
  const panelStyle = {
    color: overlaySettings?.styleSettings?.panelTextColor || overlaySettings?.textColor || '#ffffff'
  } as React.CSSProperties;
  
  const primaryColor = overlaySettings?.primaryColor || '#1e3a8a';
  const secondaryColor = overlaySettings?.secondaryColor || '#1d4ed8';
  const accentColor = overlaySettings?.accentColor || '#3b82f6';
  
  // Professional glass effect for OBS
  const glassClass = 'bg-black/30 backdrop-blur-3xl border border-white/20 rounded-2xl shadow-2xl';
  
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-6 ${panelAnimation || ''}`} style={panelStyle}>
      <div className={`w-full max-w-7xl ${glassClass} overflow-hidden`}>
        {/* Header */}
        <div className="p-6" style={{ background: `linear-gradient(135deg, ${primaryColor}40, ${secondaryColor}20)` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-black/40 rounded-full p-3" style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.45)' }}>
                <Trophy className="h-8 w-8 text-white/90" />
              </div>
              <div>
                <div className="text-3xl font-bold">Match Summary</div>
                <div className="text-lg opacity-80">{team1.name} vs {team2.name}</div>
              </div>
            </div>
            
            {/* Match Status */}
            <div className="text-right">
              <div className="text-sm opacity-80">Status</div>
              <div className="text-xl font-semibold">{matchResult}</div>
            </div>
          </div>
        </div>
        
        <div className="p-6 grid grid-cols-12 gap-6">
          {/* Team Scores */}
          <div className="col-span-12 mb-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Team 1 Score */}
              <div className="bg-black/40 rounded-xl p-6 border border-white/10">
                <div className="flex items-center space-x-4 mb-4">
                  {team1.logoUrl && (
                    <img src={team1.logoUrl} alt={team1.name} className="h-12 w-12 rounded-full object-cover" />
                  )}
                  <div>
                    <div className="text-2xl font-bold">{team1.name}</div>
                    <div className="text-sm opacity-70">
                      {innings1.battingTeam === team1.id ? 'Batting First' : 'Bowling First'}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-4xl font-bold" style={{ color: accentColor }}>
                      {team1.score}/{team1.wickets}
                    </div>
                    <div className="text-sm opacity-70">
                      {formatOvers(innings1.overNumber, innings1.legalBallsInCurrentOver)} overs
                      {innings1.maxOvers && ` (${innings1.maxOvers})`}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm opacity-70 mb-2">Extras</div>
                    <div className="space-y-1 text-xs">
                      <div>W: {team1.extras.wides} • NB: {team1.extras.noballs}</div>
                      <div>B: {team1.extras.byes} • LB: {team1.extras.legbyes}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Team 2 Score */}
              <div className="bg-black/40 rounded-xl p-6 border border-white/10">
                <div className="flex items-center space-x-4 mb-4">
                  {team2.logoUrl && (
                    <img src={team2.logoUrl} alt={team2.name} className="h-12 w-12 rounded-full object-cover" />
                  )}
                  <div>
                    <div className="text-2xl font-bold">{team2.name}</div>
                    <div className="text-sm opacity-70">
                      {innings1.battingTeam === team2.id ? 'Batting First' : 'Bowling First'}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-4xl font-bold" style={{ color: accentColor }}>
                      {team2.score}/{team2.wickets}
                    </div>
                    <div className="text-sm opacity-70">
                      {innings2 ? formatOvers(innings2.overNumber, innings2.legalBallsInCurrentOver) : '0.0'} overs
                      {innings2?.maxOvers && ` (${innings2.maxOvers})`}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm opacity-70 mb-2">Extras</div>
                    <div className="space-y-1 text-xs">
                      <div>W: {team2.extras.wides} • NB: {team2.extras.noballs}</div>
                      <div>B: {team2.extras.byes} • LB: {team2.extras.legbyes}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Top Performers */}
          <div className="col-span-6">
            <div className="bg-black/40 rounded-xl p-6 border border-white/10 h-full">
              <div className="flex items-center space-x-2 mb-4">
                <Target className="h-5 w-5" style={{ color: accentColor }} />
                <div className="text-lg font-semibold">Top Batters</div>
              </div>
              
              <div className="space-y-4">
                {team1TopBatters.length > 0 && (
                  <div>
                    <div className="text-sm opacity-70 mb-2">{team1.name}</div>
                    <div className="space-y-2">
                      {team1TopBatters.map((player, index) => (
                        <div key={player.id} className="flex items-center justify-between bg-black/30 rounded-lg p-3">
                          <div className="flex items-center space-x-3">
                            <div className="text-lg font-bold" style={{ color: accentColor }}>
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium">{player.name}</div>
                              <div className="text-xs opacity-70">
                                {player.battingStats?.runs}({player.battingStats?.balls}) • 
                                4s: {player.battingStats?.fours} • 6s: {player.battingStats?.sixes}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{player.battingStats?.runs}</div>
                            <div className="text-xs opacity-70">
                              SR: {player.battingStats?.balls ? 
                                ((player.battingStats.runs / player.battingStats.balls) * 100).toFixed(1) : 
                                '0.0'
                              }
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {team2TopBatters.length > 0 && (
                  <div>
                    <div className="text-sm opacity-70 mb-2">{team2.name}</div>
                    <div className="space-y-2">
                      {team2TopBatters.map((player, index) => (
                        <div key={player.id} className="flex items-center justify-between bg-black/30 rounded-lg p-3">
                          <div className="flex items-center space-x-3">
                            <div className="text-lg font-bold" style={{ color: accentColor }}>
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium">{player.name}</div>
                              <div className="text-xs opacity-70">
                                {player.battingStats?.runs}({player.battingStats?.balls}) • 
                                4s: {player.battingStats?.fours} • 6s: {player.battingStats?.sixes}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{player.battingStats?.runs}</div>
                            <div className="text-xs opacity-70">
                              SR: {player.battingStats?.balls ? 
                                ((player.battingStats.runs / player.battingStats.balls) * 100).toFixed(1) : 
                                '0.0'
                              }
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {team1TopBatters.length === 0 && team2TopBatters.length === 0 && (
                  <div className="text-center py-8 opacity-50">
                    <Clock className="h-12 w-12 mx-auto mb-2" />
                    <div>No batting data available yet</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="col-span-6">
            <div className="bg-black/40 rounded-xl p-6 border border-white/10 h-full">
              <div className="flex items-center space-x-2 mb-4">
                <Award className="h-5 w-5" style={{ color: accentColor }} />
                <div className="text-lg font-semibold">Top Bowlers</div>
              </div>
              
              <div className="space-y-4">
                {team1TopBowlers.length > 0 && (
                  <div>
                    <div className="text-sm opacity-70 mb-2">{team1.name}</div>
                    <div className="space-y-2">
                      {team1TopBowlers.map((player, index) => (
                        <div key={player.id} className="flex items-center justify-between bg-black/30 rounded-lg p-3">
                          <div className="flex items-center space-x-3">
                            <div className="text-lg font-bold" style={{ color: accentColor }}>
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium">{player.name}</div>
                              <div className="text-xs opacity-70">
                                {Math.floor((player.bowlingStats?.balls || 0) / 6)}.{(player.bowlingStats?.balls || 0) % 6} overs
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">
                              {player.bowlingStats?.wickets}/{player.bowlingStats?.runs}
                            </div>
                            <div className="text-xs opacity-70">
                              Econ: {player.bowlingStats?.balls ? 
                                (((player.bowlingStats.runs / player.bowlingStats.balls) * 6).toFixed(2)) : 
                                '0.00'
                              }
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {team2TopBowlers.length > 0 && (
                  <div>
                    <div className="text-sm opacity-70 mb-2">{team2.name}</div>
                    <div className="space-y-2">
                      {team2TopBowlers.map((player, index) => (
                        <div key={player.id} className="flex items-center justify-between bg-black/30 rounded-lg p-3">
                          <div className="flex items-center space-x-3">
                            <div className="text-lg font-bold" style={{ color: accentColor }}>
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium">{player.name}</div>
                              <div className="text-xs opacity-70">
                                {Math.floor((player.bowlingStats?.balls || 0) / 6)}.{(player.bowlingStats?.balls || 0) % 6} overs
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">
                              {player.bowlingStats?.wickets}/{player.bowlingStats?.runs}
                            </div>
                            <div className="text-xs opacity-70">
                              Econ: {player.bowlingStats?.balls ? 
                                (((player.bowlingStats.runs / player.bowlingStats.balls) * 6).toFixed(2)) : 
                                '0.00'
                              }
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {team1TopBowlers.length === 0 && team2TopBowlers.length === 0 && (
                  <div className="text-center py-8 opacity-50">
                    <Clock className="h-12 w-12 mx-auto mb-2" />
                    <div>No bowling data available yet</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchSummaryPanel;