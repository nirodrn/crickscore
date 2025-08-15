import React from 'react';
import { MatchState } from '../types';
import { CricketScorer } from '../cricketUtils';
import { TrendingUp, Target, Zap, Clock, BarChart3 } from 'lucide-react';

interface RunRateAnalysisPanelProps {
  match: MatchState;
  overlaySettings?: any;
  panelAnimation?: string;
}

export const RunRateAnalysisPanel: React.FC<RunRateAnalysisPanelProps> = ({ 
  match, 
  overlaySettings, 
  panelAnimation 
}) => {
  const innings1 = match.innings1;
  const innings2 = match.innings2;
  
  const team1 = innings1.battingTeam === 'A' ? match.teamA : match.teamB;
  const team2 = innings1.battingTeam === 'A' ? match.teamB : match.teamA;
  
  const currentInnings = match.currentInnings === 1 ? innings1 : innings2!;
  const currentBattingTeam = currentInnings.battingTeam === 'A' ? match.teamA : match.teamB;
  
  // Calculate run rates
  const team1RunRate = CricketScorer.calculateCurrentRunRate(
    team1, 
    innings1.overNumber, 
    innings1.legalBallsInCurrentOver
  );
  
  const team2RunRate = innings2 ? CricketScorer.calculateCurrentRunRate(
    team2, 
    innings2.overNumber, 
    innings2.legalBallsInCurrentOver
  ) : 0;
  
  const requiredRunRate = match.currentInnings === 2 && currentInnings.target ? 
    CricketScorer.calculateRequiredRunRate(
      currentInnings.target,
      currentBattingTeam.score,
      (currentInnings.maxOvers || 20) - currentInnings.overNumber - 1,
      6 - currentInnings.legalBallsInCurrentOver
    ) : 0;
  
  // Projected score
  const remainingOvers = (currentInnings.maxOvers || 20) - currentInnings.overNumber - (currentInnings.legalBallsInCurrentOver / 6);
  const currentRunRate = match.currentInnings === 1 ? team1RunRate : team2RunRate;
  const projectedScore = currentBattingTeam.score + (currentRunRate * remainingOvers);
  
  // Get run rate progression over by over
  const getRunRateProgression = () => {
    const team1Progression = [];
    const team2Progression = [];
    
    // Team 1 progression (first innings)
    let runningScore = 0;
    let currentOver = 0;
    let ballsInOver = 0;
    
    for (const event of innings1.events) {
      runningScore += (event.runsBat || 0) + (event.runsExtra || 0);
      
      if (event.legalBallInOver !== undefined) {
        ballsInOver++;
        if (ballsInOver === 6) {
          currentOver++;
          ballsInOver = 0;
          const totalBalls = currentOver * 6;
          team1Progression.push({
            over: currentOver,
            score: runningScore,
            runRate: totalBalls > 0 ? (runningScore / totalBalls) * 6 : 0,
            runsInOver: 0,
            team: 'team1'
          });
        }
      }
    }
    
    // Add current incomplete over
    if (ballsInOver > 0) {
      const totalBalls = (currentOver * 6) + ballsInOver;
      team1Progression.push({
        over: currentOver + (ballsInOver / 6),
        score: runningScore,
        runRate: totalBalls > 0 ? (runningScore / totalBalls) * 6 : 0,
        runsInOver: 0,
        team: 'team1'
      });
    }
    
    // Team 2 progression (second innings)
    if (innings2) {
      runningScore = 0;
      currentOver = 0;
      ballsInOver = 0;
      
      for (const event of innings2.events) {
        runningScore += (event.runsBat || 0) + (event.runsExtra || 0);
        
        if (event.legalBallInOver !== undefined) {
          ballsInOver++;
          if (ballsInOver === 6) {
            currentOver++;
            const totalBalls = currentOver * 6;
            team2Progression.push({
              over: currentOver,
              score: runningScore,
              runRate: totalBalls > 0 ? (runningScore / totalBalls) * 6 : 0,
              runsInOver: 0,
              team: 'team2'
            });
            ballsInOver = 0;
          }
        }
      }
      
      // Add current incomplete over for team 2
      if (ballsInOver > 0) {
        const totalBalls = (currentOver * 6) + ballsInOver;
        team2Progression.push({
          over: currentOver + (ballsInOver / 6),
          score: runningScore,
          runRate: totalBalls > 0 ? (runningScore / totalBalls) * 6 : 0,
          runsInOver: 0,
          team: 'team2'
        });
      }
    }
    
    // Calculate runs in each over for team 1
    for (let i = 0; i < team1Progression.length; i++) {
      if (i === 0) {
        team1Progression[i].runsInOver = team1Progression[i].score;
      } else {
        team1Progression[i].runsInOver = team1Progression[i].score - team1Progression[i - 1].score;
      }
    }
    
    // Calculate runs in each over for team 2
    for (let i = 0; i < team2Progression.length; i++) {
      if (i === 0) {
        team2Progression[i].runsInOver = team2Progression[i].score;
      } else {
        team2Progression[i].runsInOver = team2Progression[i].score - team2Progression[i - 1].score;
      }
    }
    
    return { team1: team1Progression, team2: team2Progression };
  };
  
  const { team1: team1Progression, team2: team2Progression } = getRunRateProgression();
  
  // Get powerplay analysis (first 6 overs)
  const team1PowerplayData = team1Progression.slice(0, 6);
  const team1PowerplayRuns = team1PowerplayData.length > 0 ? team1PowerplayData[team1PowerplayData.length - 1]?.score || 0 : 0;
  const team1PowerplayRunRate = team1PowerplayData.length > 0 ? team1PowerplayRuns / Math.min(6, team1PowerplayData.length) : 0;
  
  const team2PowerplayData = team2Progression.slice(0, 6);
  const team2PowerplayRuns = team2PowerplayData.length > 0 ? team2PowerplayData[team2PowerplayData.length - 1]?.score || 0 : 0;
  const team2PowerplayRunRate = team2PowerplayData.length > 0 ? team2PowerplayRuns / Math.min(6, team2PowerplayData.length) : 0;
  
  // Get death overs analysis (last 4 overs)
  const deathOversStart = Math.max(0, (innings1.maxOvers || 20) - 4);
  const team1DeathOversData = team1Progression.filter(p => Math.floor(p.over) >= deathOversStart);
  const team1DeathOversRuns = team1DeathOversData.reduce((sum, over) => sum + over.runsInOver, 0);
  const team1DeathOversRunRate = team1DeathOversData.length > 0 ? team1DeathOversRuns / team1DeathOversData.length : 0;
  
  const team2DeathOversData = team2Progression.filter(p => Math.floor(p.over) >= deathOversStart);
  const team2DeathOversRuns = team2DeathOversData.reduce((sum, over) => sum + over.runsInOver, 0);
  const team2DeathOversRunRate = team2DeathOversData.length > 0 ? team2DeathOversRuns / team2DeathOversData.length : 0;
  
  const panelStyle = {
    color: overlaySettings?.styleSettings?.panelTextColor || overlaySettings?.textColor || '#ffffff'
  } as React.CSSProperties;
  
  const primaryColor = overlaySettings?.primaryColor || '#1e3a8a';
  const secondaryColor = overlaySettings?.secondaryColor || '#1d4ed8';
  const accentColor = overlaySettings?.accentColor || '#3b82f6';
  const team1Color = overlaySettings?.teamAColor || primaryColor;
  const team2Color = overlaySettings?.teamBColor || '#ef4444';
  
  const glassClass = 'bg-black/30 backdrop-blur-3xl border border-white/20 rounded-2xl shadow-2xl';
  
  const maxOvers = Math.max(
    innings1.maxOvers || 20,
    innings2?.maxOvers || 20
  );
  
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-6 ${panelAnimation || ''}`} style={panelStyle}>
      <div className={`w-full max-w-[95vw] ${glassClass} overflow-hidden`}>
        {/* Header */}
        <div className="p-6" style={{ background: `linear-gradient(135deg, ${primaryColor}40, ${secondaryColor}20)` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-black/40 rounded-full p-3" style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.45)' }}>
                <TrendingUp className="h-8 w-8 text-white/90" />
              </div>
              <div>
                <div className="text-3xl font-bold">Run Rate Analysis</div>
                <div className="text-lg opacity-80">{team1.name} vs {team2.name}</div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-sm opacity-80">Current Score</div>
              <div className="text-3xl font-bold" style={{ color: accentColor }}>
                {currentBattingTeam.score}/{currentBattingTeam.wickets}
              </div>
              <div className="text-sm opacity-70">
                {currentInnings.overNumber}.{currentInnings.legalBallsInCurrentOver} / {currentInnings.maxOvers || '∞'} overs
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4 lg:p-6">
          {(team1Progression.length > 0 || team2Progression.length > 0) ? (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                <div className="bg-black/40 rounded-xl p-6 border border-white/10 text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Zap className="h-5 w-5" style={{ color: accentColor }} />
                    <div className="text-sm opacity-70">Current RR</div>
                  </div>
                  <div className="text-3xl font-bold" style={{ color: accentColor }}>
                    {currentRunRate.toFixed(2)}
                  </div>
                </div>
                
                {match.currentInnings === 2 && currentInnings.target && (
                  <div className="bg-black/40 rounded-xl p-6 border border-white/10 text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <Target className="h-5 w-5" style={{ color: '#ef4444' }} />
                      <div className="text-sm opacity-70">Required RR</div>
                    </div>
                    <div className="text-3xl font-bold text-red-400">
                      {requiredRunRate.toFixed(2)}
                    </div>
                  </div>
                )}
                
                <div className="bg-black/40 rounded-xl p-6 border border-white/10 text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <BarChart3 className="h-5 w-5" style={{ color: accentColor }} />
                    <div className="text-sm opacity-70">Projected</div>
                  </div>
                  <div className="text-3xl font-bold" style={{ color: accentColor }}>
                    {Math.round(projectedScore)}
                  </div>
                </div>
                
                <div className="bg-black/40 rounded-xl p-6 border border-white/10 text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Clock className="h-5 w-5" style={{ color: accentColor }} />
                    <div className="text-sm opacity-70">Balls Left</div>
                  </div>
                  <div className="text-3xl font-bold" style={{ color: accentColor }}>
                    {Math.max(0, ((currentInnings.maxOvers || 20) * 6) - (currentInnings.overNumber * 6 + currentInnings.legalBallsInCurrentOver))}
                  </div>
                </div>
              </div>
              
              {/* Run Rate Progression Chart */}
              <div className="bg-black/40 rounded-xl p-6 border border-white/10">
                <div className="flex items-center space-x-2 mb-4">
                  <TrendingUp className="h-5 w-5" style={{ color: accentColor }} />
                  <div className="text-lg font-semibold">Run Rate Progression</div>
                </div>
                
                <div className="relative overflow-x-auto">
                  <svg width="100%" height="350" viewBox="0 0 1000 350" className="w-full min-w-[800px]">
                    {/* Grid */}
                    <defs>
                      <pattern id="runRateGrid" width="45" height="35" patternUnits="userSpaceOnUse">
                        <path d="M 45 0 L 0 0 0 35" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
                      </pattern>
                    </defs>
                    <rect width="880" height="280" x="80" y="30" fill="url(#runRateGrid)" />
                    
                    {/* Axes */}
                    <line x1="80" y1="310" x2="960" y2="310" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
                    <line x1="80" y1="30" x2="80" y2="310" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
                    
                    {/* Y-axis labels (Run Rate) */}
                    {[0, 5, 10, 15, 20, 25].map(rate => (
                      <g key={rate}>
                        <text x="70" y={310 - (rate / 25) * 280 + 5} textAnchor="end" fill="rgba(255,255,255,0.7)" fontSize="12">
                          {rate}
                        </text>
                        <line x1="80" y1={310 - (rate / 25) * 280} x2="960" y2={310 - (rate / 25) * 280} stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
                      </g>
                    ))}
                    
                    {/* X-axis labels (Overs) */}
                    {Array.from({ length: Math.ceil(maxOvers / 2) + 1 }, (_, i) => i * 2).map(over => (
                      <text key={over} x={80 + (over / maxOvers) * 880} y="330" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="12">
                        {over}
                      </text>
                    ))}
                    
                    {/* Team 1 run rate line */}
                    {team1Progression.length > 1 && (
                      <polyline
                        points={team1Progression.map(p => 
                          `${80 + (Math.floor(p.over) / maxOvers) * 880},${310 - Math.min(p.runRate / 25, 1) * 280}`
                        ).join(' ')}
                        fill="none"
                        stroke={team1Color}
                        strokeWidth="4"
                        className="animate-drawLine"
                      />
                    )}
                    
                    {/* Team 2 run rate line */}
                    {team2Progression.length > 1 && (
                      <polyline
                        points={team2Progression.map(p => 
                          `${80 + (Math.floor(p.over) / maxOvers) * 880},${310 - Math.min(p.runRate / 25, 1) * 280}`
                        ).join(' ')}
                        fill="none"
                        stroke={team2Color}
                        strokeWidth="4"
                        strokeDasharray="8,4"
                        className="animate-drawLine"
                      />
                    )}
                    
                    {/* Required run rate line (if second innings) */}
                    {match.currentInnings === 2 && currentInnings.target && requiredRunRate > 0 && (
                      <line
                        x1="80"
                        y1={310 - Math.min(requiredRunRate / 25, 1) * 280}
                        x2="960"
                        y2={310 - Math.min(requiredRunRate / 25, 1) * 280}
                        stroke="#ef4444"
                        strokeWidth="3"
                        strokeDasharray="10,5"
                      />
                    )}
                    
                    {/* Team 1 data points */}
                    {team1Progression.map((point, index) => (
                      <circle
                        key={index}
                        cx={80 + (Math.floor(point.over) / maxOvers) * 880}
                        cy={310 - Math.min(point.runRate / 25, 1) * 280}
                        r="6"
                        fill={team1Color}
                        stroke="white"
                        strokeWidth="2"
                        className="animate-bounce-in"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      />
                    ))}
                    
                    {/* Team 2 data points */}
                    {team2Progression.map((point, index) => (
                      <circle
                        key={`team2-${index}`}
                        cx={80 + (Math.floor(point.over) / maxOvers) * 880}
                        cy={310 - Math.min(point.runRate / 25, 1) * 280}
                        r="6"
                        fill={team2Color}
                        stroke="white"
                        strokeWidth="2"
                        className="animate-bounce-in"
                        style={{ animationDelay: `${(index + team1Progression.length) * 0.1}s` }}
                      />
                    ))}
                    
                    {/* Axis labels */}
                    <text x="520" y="345" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="14" fontWeight="bold">
                      Overs
                    </text>
                    <text x="25" y="170" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="14" fontWeight="bold" transform="rotate(-90, 25, 170)">
                      Run Rate
                    </text>
                  </svg>
                  
                  {/* Legend */}
                  <div className="flex flex-wrap justify-center gap-4 lg:gap-6 mt-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-1" style={{ backgroundColor: team1Color }}></div>
                      <span className="text-sm">{team1.name}</span>
                    </div>
                    {team2Progression.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-1 border-dashed border-2" style={{ borderColor: team2Color }}></div>
                        <span className="text-sm">{team2.name}</span>
                      </div>
                    )}
                    {match.currentInnings === 2 && currentInnings.target && (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-1 border-dashed border-2 border-red-500"></div>
                        <span className="text-sm">Required Run Rate</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Phase Analysis */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Powerplay */}
                <div className="bg-black/40 rounded-xl p-6 border border-white/10">
                  <div className="flex items-center space-x-2 mb-4">
                    <Zap className="h-5 w-5 text-yellow-400" />
                    <div className="text-lg font-semibold">Powerplay (1-6)</div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm opacity-70">{team1.name}</span>
                        <span className="font-bold">{team1PowerplayRuns} ({team1PowerplayRunRate.toFixed(2)})</span>
                      </div>
                      <div className="w-full bg-black/30 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${Math.min((team1PowerplayRunRate / 12) * 100, 100)}%`, 
                            backgroundColor: team1Color
                          }}
                        />
                      </div>
                    </div>
                    {team2PowerplayData.length > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm opacity-70">{team2.name}</span>
                          <span className="font-bold">{team2PowerplayRuns} ({team2PowerplayRunRate.toFixed(2)})</span>
                        </div>
                        <div className="w-full bg-black/30 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full transition-all duration-500"
                            style={{ 
                              width: `${Math.min((team2PowerplayRunRate / 12) * 100, 100)}%`, 
                              backgroundColor: team2Color
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Middle Overs */}
                <div className="bg-black/40 rounded-xl p-6 border border-white/10">
                  <div className="flex items-center space-x-2 mb-4">
                    <BarChart3 className="h-5 w-5 text-blue-400" />
                    <div className="text-lg font-semibold">Middle Overs</div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm opacity-70">Phase</span>
                      <span className="font-bold">7-{Math.max(6, maxOvers - 4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm opacity-70">Strategy</span>
                      <span className="font-bold text-sm">Build</span>
                    </div>
                    <div className="text-xs opacity-60">
                      Focus on rotating strike and building partnerships
                    </div>
                  </div>
                </div>
                
                {/* Death Overs */}
                <div className="bg-black/40 rounded-xl p-6 border border-white/10">
                  <div className="flex items-center space-x-2 mb-4">
                    <Target className="h-5 w-5 text-red-400" />
                    <div className="text-lg font-semibold">Death Overs</div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm opacity-70">{team1.name}</span>
                        <span className="font-bold">{team1DeathOversRuns} ({team1DeathOversRunRate.toFixed(2)})</span>
                      </div>
                      <div className="w-full bg-black/30 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${Math.min((team1DeathOversRunRate / 15) * 100, 100)}%`, 
                            backgroundColor: team1Color
                          }}
                        />
                      </div>
                    </div>
                    {team2DeathOversData.length > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm opacity-70">{team2.name}</span>
                          <span className="font-bold">{team2DeathOversRuns} ({team2DeathOversRunRate.toFixed(2)})</span>
                        </div>
                        <div className="w-full bg-black/30 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full transition-all duration-500"
                            style={{ 
                              width: `${Math.min((team2DeathOversRunRate / 15) * 100, 100)}%`, 
                              backgroundColor: team2Color
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="bg-black/40 rounded-xl p-12 border border-white/10">
                <Clock className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <div className="text-2xl font-semibold mb-2">No Data Available</div>
                <div className="text-lg opacity-70">Run rate analysis will appear as the innings progresses</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RunRateAnalysisPanel;