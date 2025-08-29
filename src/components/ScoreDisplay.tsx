import React, { useState, useEffect } from 'react';
import { MatchState, BallDisplayItem } from '../types';
import { CricketScorer } from '../cricketUtils';
import { LocalStorageManager } from '../utils/localStorage';
import { PlayerStatsPanel } from './PlayerStatsPanel';
import { MatchSummaryPanel } from './MatchSummaryPanel';
import { TeamComparisonPanel } from './TeamComparisonPanel';
import { RunRateAnalysisPanel } from './RunRateAnalysisPanel';
import { WicketFallChartPanel } from './WicketFallChartPanel';
import { BatsmanSummaryPanel } from './BatsmanSummaryPanel';
import { BowlerSummaryPanel } from './BowlerSummaryPanel';
import { WinnerPanel } from './WinnerPanel';
import { Clock, Target, Zap } from 'lucide-react';

interface ScoreDisplayProps {
  match: MatchState;
  overlayMode?: boolean;
  forcePanel?: string;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ match, overlayMode = false, forcePanel }) => {
  const [overlaySettings, setOverlaySettings] = useState<any>(null);
  const [showFullscreenPanel, setShowFullscreenPanel] = useState<string | null>(null);
  const [panelAnimation, setPanelAnimation] = useState('');

  const innings = match.currentInnings === 1 ? match.innings1 : match.innings2!;
  const battingTeam = innings.battingTeam === 'A' ? match.teamA : match.teamB;
  const bowlingTeam = innings.bowlingTeam === 'A' ? match.teamA : match.teamB;
  
  const striker = battingTeam.players.find(p => p.id === innings.strikerId);
  const nonStriker = battingTeam.players.find(p => p.id === innings.nonStrikerId);
  const bowler = bowlingTeam.players.find(p => p.id === innings.bowlerId);

  // Load overlay settings with real-time updates
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Try to get settings from Firebase for this specific match
        const { getOverlaySettingsForMatch } = await import('../firebase');
        const firebaseSettings = await getOverlaySettingsForMatch(match.id);
        
        // Merge with local settings
        const localSettings = LocalStorageManager.getOverlaySettings();
        const mergedSettings = { ...localSettings, ...firebaseSettings };
        
        setOverlaySettings(mergedSettings);
        LocalStorageManager.saveOverlaySettings(mergedSettings);
      } catch (error) {
        console.error('Failed to load overlay settings:', error);
        // Fallback to local settings
        const settings = LocalStorageManager.getOverlaySettings();
        setOverlaySettings(settings);
      }
    };

    loadSettings();

    // Set up real-time listener for overlay settings updates
    const interval = setInterval(loadSettings, 2000);
    return () => clearInterval(interval);
  }, [match.id]);

  // Panel management with enhanced animations
  useEffect(() => {
    if (!overlaySettings || !overlayMode) return;

    const checkForPanelTriggers = () => {
      const now = Date.now();
      const threshold = 2000; // 2 seconds

      // Check for manual triggers
      if (overlaySettings.triggerPlayerStats && now - overlaySettings.triggerPlayerStats < threshold) {
        showPanelWithAnimation('playerStats');
      } else if (overlaySettings.triggerRunRate && now - overlaySettings.triggerRunRate < threshold) {
        showPanelWithAnimation('runRate');
      } else if (overlaySettings.triggerMatchSummary && now - overlaySettings.triggerMatchSummary < threshold) {
        showPanelWithAnimation('matchSummary');
      } else if (overlaySettings.triggerComparison && now - overlaySettings.triggerComparison < threshold) {
        showPanelWithAnimation('comparison');
      } else if (overlaySettings.triggerBatsmanSummary && now - overlaySettings.triggerBatsmanSummary < threshold) {
        showPanelWithAnimation('batsmanSummary');
      } else if (overlaySettings.triggerBowlerSummary && now - overlaySettings.triggerBowlerSummary < threshold) {
        showPanelWithAnimation('bowlerSummary');
      } else if (overlaySettings.triggerWinner && now - overlaySettings.triggerWinner < threshold) {
        showPanelWithAnimation('winner');
      } else if (overlaySettings.hideAllPanels && now - overlaySettings.hideAllPanels < threshold) {
        hidePanelWithAnimation();
      }
    };

    const interval = setInterval(checkForPanelTriggers, 500);
    return () => clearInterval(interval);
  }, [overlaySettings, overlayMode]);

  // Auto-cycle panels
  useEffect(() => {
    if (!overlaySettings || !overlayMode || overlaySettings.autoCycle === 'off') return;

    const cycleInterval = parseInt(overlaySettings.autoCycle) * 1000;
    const panels = ['playerStats', 'runRate', 'matchSummary', 'comparison'];
    let currentIndex = 0;

    const cycle = () => {
      showPanelWithAnimation(panels[currentIndex]);
      currentIndex = (currentIndex + 1) % panels.length;
    };

    const interval = setInterval(cycle, cycleInterval);
    return () => clearInterval(interval);
  }, [overlaySettings, overlayMode]);

  const showPanelWithAnimation = (panelType: string) => {
    setPanelAnimation('animate-fadeIn');
    setShowFullscreenPanel(panelType);
    
    const duration = (overlaySettings?.fullscreenDuration || 10) * 1000;
    setTimeout(() => {
      hidePanelWithAnimation();
    }, duration);
  };

  const hidePanelWithAnimation = () => {
    setPanelAnimation('animate-fadeOut');
    setTimeout(() => {
      setShowFullscreenPanel(null);
      setPanelAnimation('');
    }, 300);
  };

  // Force panel display for specific panel routes
  if (forcePanel) {
    const renderForcePanel = () => {
      switch (forcePanel) {
        case 'playerStats':
          return <PlayerStatsPanel match={match} overlaySettings={overlaySettings} panelAnimation={panelAnimation} />;
        case 'runRate':
          return <RunRateAnalysisPanel match={match} overlaySettings={overlaySettings} panelAnimation={panelAnimation} />;
        case 'matchSummary':
          return <MatchSummaryPanel match={match} overlaySettings={overlaySettings} panelAnimation={panelAnimation} />;
        case 'comparison':
          return <TeamComparisonPanel match={match} overlaySettings={overlaySettings} panelAnimation={panelAnimation} />;
        case 'wicketFall':
          return <WicketFallChartPanel match={match} overlaySettings={overlaySettings} panelAnimation={panelAnimation} />;
        case 'batsmanSummary':
          return <BatsmanSummaryPanel match={match} overlaySettings={overlaySettings} panelAnimation={panelAnimation} />;
        case 'bowlerSummary':
          return <BowlerSummaryPanel match={match} overlaySettings={overlaySettings} panelAnimation={panelAnimation} />;
        case 'winner':
          return <WinnerPanel match={match} overlaySettings={overlaySettings} panelAnimation={panelAnimation} />;
        default:
          return null;
      }
    };

    return renderForcePanel();
  }

  const currentOverBalls = CricketScorer.getCurrentOverBalls(innings);
  const lastSixBalls = CricketScorer.getLastSixBalls(innings);

  const formatOvers = (overNumber: number, balls: number) => {
    return `${overNumber}.${balls}`;
  };

  const calculateRunRate = () => {
    const totalBalls = (innings.overNumber * 6) + innings.legalBallsInCurrentOver;
    if (totalBalls === 0) return 0;
    return (battingTeam.score / totalBalls) * 6;
  };

  const calculateRequiredRunRate = () => {
    if (match.currentInnings !== 2 || !innings.target) return null;
    
    const remainingBalls = ((innings.maxOvers || 20) * 6) - (innings.overNumber * 6 + innings.legalBallsInCurrentOver);
    if (remainingBalls <= 0) return null;
    
    const required = innings.target - battingTeam.score;
    return Math.max(0, (required / remainingBalls) * 6);
  };

  const requiredRunRate = calculateRequiredRunRate();

  if (overlayMode) {
    return (
      <div className="relative">
        {/* Custom CSS injection */}
        {overlaySettings?.styleSettings?.customCSS && (
          <style dangerouslySetInnerHTML={{ __html: overlaySettings.styleSettings.customCSS }} />
        )}

        {/* Fullscreen Panels */}
        {showFullscreenPanel === 'playerStats' && overlaySettings?.showFullscreenPlayerStats && (
          <PlayerStatsPanel match={match} overlaySettings={overlaySettings} panelAnimation={panelAnimation} />
        )}
        {showFullscreenPanel === 'runRate' && overlaySettings?.showFullscreenRunRate && (
          <RunRateAnalysisPanel match={match} overlaySettings={overlaySettings} panelAnimation={panelAnimation} />
        )}
        {showFullscreenPanel === 'matchSummary' && overlaySettings?.showFullscreenMatchSummary && (
          <MatchSummaryPanel match={match} overlaySettings={overlaySettings} panelAnimation={panelAnimation} />
        )}
        {showFullscreenPanel === 'comparison' && overlaySettings?.showComparisonChart && (
          <TeamComparisonPanel match={match} overlaySettings={overlaySettings} panelAnimation={panelAnimation} />
        )}
        {showFullscreenPanel === 'wicketFall' && (
          <WicketFallChartPanel match={match} overlaySettings={overlaySettings} panelAnimation={panelAnimation} />
        )}
        {showFullscreenPanel === 'batsmanSummary' && (
          <BatsmanSummaryPanel match={match} overlaySettings={overlaySettings} panelAnimation={panelAnimation} />
        )}
        {showFullscreenPanel === 'bowlerSummary' && (
          <BowlerSummaryPanel match={match} overlaySettings={overlaySettings} panelAnimation={panelAnimation} />
        )}
        {showFullscreenPanel === 'winner' && (
          <WinnerPanel match={match} overlaySettings={overlaySettings} panelAnimation={panelAnimation} />
        )}

        {/* International Standard Footer Overlay */}
        {overlaySettings?.showOverlay && !showFullscreenPanel && (
          <div className="fixed bottom-0 left-0 right-0 z-40">
            <div 
              className="international-cricket-footer"
              style={{
                background: overlaySettings?.styleSettings?.footerGradient || 
                           `linear-gradient(135deg, ${overlaySettings?.primaryColor || '#1e3a8a'}95, ${overlaySettings?.secondaryColor || '#1d4ed8'}85)`,
                color: overlaySettings?.styleSettings?.footerTextColor || overlaySettings?.textColor || '#ffffff'
              }}
            >
              {/* Interval Display */}
              {innings.isInterval && (
                <div className="interval-display">
                  <div className="interval-content">
                    <Clock className="interval-icon" />
                    <div className="interval-text">
                      {innings.intervalMessage || `${(innings.intervalType || 'interval').charAt(0).toUpperCase() + (innings.intervalType || 'interval').slice(1)} Break`}
                    </div>
                  </div>
                  <div className="interval-subtitle">Match will resume shortly</div>
                </div>
              )}

              {/* Main Footer Layout - International Standard */}
              {!innings.isInterval && (
                <div className="footer-main-grid">
                  {/* Left Section - Batting Team */}
                  <div className="batting-section">
                    <div 
                      className="team-name-container"
                      style={{ 
                        borderLeft: `4px solid ${overlaySettings?.teamAColor || '#3b82f6'}`
                      }}
                    >
                      <div className="team-label">BATTING</div>
                      <div className="team-name" style={{ color: overlaySettings?.teamAColor || '#3b82f6' }}>
                        {battingTeam.name}
                      </div>
                    </div>
                    
                    <div className="players-container">
                      <div className="striker-container">
                        <div className="striker-indicator" style={{ backgroundColor: overlaySettings?.accentColor || '#10b981' }}></div>
                        <div className="player-name">{striker?.name || 'N/A'}</div>
                        <div className="player-stats">
                          {striker?.battingStats?.runs || 0}({striker?.battingStats?.balls || 0})
                        </div>
                      </div>
                      
                      <div className="non-striker-container">
                        <div className="player-name">{nonStriker?.name || 'N/A'}</div>
                        <div className="player-stats">
                          {nonStriker?.battingStats?.runs || 0}({nonStriker?.battingStats?.balls || 0})
                        </div>
                      </div>
                    </div>

                    <div className="run-rate-container">
                      <div className="run-rate-label">RUN RATE</div>
                      <div className="run-rate-value" style={{ color: overlaySettings?.accentColor || '#10b981' }}>
                        {calculateRunRate().toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Center Section - Score & Overs */}
                  <div className="center-section">
                    {/* Target Display for Second Innings */}
                    {match.currentInnings === 2 && innings.target && (
                      <div className="target-display">
                        <div className="target-label">TARGET</div>
                        <div className="target-value">{innings.target}</div>
                      </div>
                    )}

                    <div className="score-display">
                      <div className="runs-wickets">
                        <span className="runs" style={{ color: overlaySettings?.accentColor || '#10b981' }}>
                          {battingTeam.score}
                        </span>
                        <span className="separator">/</span>
                        <span className="wickets" style={{ color: overlaySettings?.teamBColor || '#ef4444' }}>
                          {battingTeam.wickets}
                        </span>
                      </div>
                      <div className="overs-display">
                        <div className="overs-label">OVERS</div>
                        <div className="overs-value">
                        {formatOvers(innings.overNumber, innings.legalBallsInCurrentOver)}
                        {innings.maxOvers && ` / ${innings.maxOvers}`}
                        </div>
                      </div>
                    </div>

                    {/* Target Needed Display */}
                    {match.currentInnings === 2 && innings.target && battingTeam.score < innings.target && (
                      <div className="target-needed">
                        {Math.max(0, innings.target - battingTeam.score)} TO WIN OFF {((innings.maxOvers || 20) * 6) - (innings.overNumber * 6 + innings.legalBallsInCurrentOver)} BALLS
                      </div>
                    )}

                    {/* Current Over Balls - Enhanced Layout */}
                    <div className="current-over-container">
                      <div className="over-balls-wrapper">
                        {currentOverBalls.slice(-10).map((ball, index) => (
                          <div
                            key={index}
                            className={`ball-indicator-international ${ball.type} ${ball.isFreeHit ? 'free-hit-glow' : ''}`}
                            style={{
                              width: `${overlaySettings?.styleSettings?.ballIndicatorSize || 28}px`,
                              height: `${overlaySettings?.styleSettings?.ballIndicatorSize || 28}px`
                            }}
                          >
                            {ball.value}
                          </div>
                        ))}
                        
                        {/* Fill remaining balls for visual consistency */}
                        {currentOverBalls.length < 6 && Array.from({ 
                          length: 6 - (currentOverBalls.length % 6)
                        }, (_, index) => (
                          <div 
                            key={`empty-${index}`} 
                            className="ball-indicator-international empty"
                            style={{
                              width: `${overlaySettings?.styleSettings?.ballIndicatorSize || 28}px`,
                              height: `${overlaySettings?.styleSettings?.ballIndicatorSize || 28}px`
                            }}
                          >
                            •
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tournament Name */}
                    <div 
                      className="tournament-name"
                      style={{ 
                        background: `rgba(0, 0, 0, 0.3)`,
                        color: overlaySettings?.styleSettings?.footerTextColor || '#ffffff'
                      }}
                    >
                      {match.tournamentName || 'Cricket Match'}
                    </div>
                  </div>

                  {/* Right Section - Bowling Team */}
                  <div className="bowling-section">
                    <div 
                      className="team-name-container"
                      style={{ 
                        borderRight: `4px solid ${overlaySettings?.teamBColor || '#ef4444'}`
                      }}
                    >
                      <div className="team-label">BOWLING</div>
                      <div className="team-name" style={{ color: overlaySettings?.teamBColor || '#ef4444' }}>
                        {bowlingTeam.name}
                      </div>
                    </div>

                    <div className="bowler-container">
                      <div className="bowler-name">{bowler?.name || 'N/A'}</div>
                      <div className="bowler-stats">
                        {Math.floor((bowler?.bowlingStats?.balls || 0) / 6)}.{(bowler?.bowlingStats?.balls || 0) % 6} - {bowler?.bowlingStats?.runs || 0}/{bowler?.bowlingStats?.wickets || 0}
                      </div>
                    </div>

                    <div className="over-display">
                      <div className="over-label">OVER</div>
                      <div className="over-value" style={{ color: overlaySettings?.accentColor || '#3b82f6' }}>
                        {innings.overNumber + 1}
                        {innings.maxOvers && ` / ${innings.maxOvers}`}
                      </div>
                    </div>

                    {requiredRunRate !== null && (
                      <div className="required-rate-container">
                        <div className="required-rate-label">REQUIRED RR</div>
                        <div className="required-rate-value" style={{ color: '#ef4444' }}>
                          {requiredRunRate.toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Free Hit Indicator */}
              {innings.freeHit && !innings.isInterval && (
                <div 
                  className="free-hit-indicator"
                  style={{ backgroundColor: overlaySettings?.accentColor || '#fbbf24' }}
                >
                  FREE HIT
                </div>
              )}
            </div>
          </div>
        )}

        {/* Side Panels */}
        {overlaySettings?.showPlayerStats && !showFullscreenPanel && (
          <div className="fixed top-4 right-4 w-80">
            <div className="cricket-panel bg-black/30 backdrop-blur-md rounded-lg p-4 border border-white/20">
              <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                <span>Live Stats</span>
              </h3>
              
              <div className="space-y-3">
                <div className="bg-black/40 rounded p-3">
                  <div className="text-sm opacity-75">Current Partnership</div>
                  <div className="text-xl font-bold">
                    {(striker?.battingStats?.runs || 0) + (nonStriker?.battingStats?.runs || 0)} runs
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/40 rounded p-3 text-center">
                    <div className="text-sm opacity-75">Boundaries</div>
                    <div className="font-bold">
                      {(striker?.battingStats?.fours || 0) + (striker?.battingStats?.sixes || 0) + 
                       (nonStriker?.battingStats?.fours || 0) + (nonStriker?.battingStats?.sixes || 0)}
                    </div>
                  </div>
                  
                  <div className="bg-black/40 rounded p-3 text-center">
                    <div className="text-sm opacity-75">Dots</div>
                    <div className="font-bold">
                      {lastSixBalls.filter(b => b.type === 'dot').length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Run Rate Chart */}
        {overlaySettings?.showRunRateChart && !showFullscreenPanel && (
          <div className="fixed top-4 left-4 w-80">
            <div className="cricket-panel bg-black/30 backdrop-blur-md rounded-lg p-4 border border-white/20">
              <h3 className="text-lg font-semibold mb-3">Run Rate Trend</h3>
              
              <div className="h-32 bg-black/40 rounded p-2 flex items-end justify-center space-x-1">
                {lastSixBalls.map((ball, index) => (
                  <div
                    key={index}
                    className="bg-blue-500 rounded-t"
                    style={{
                      height: `${Math.max(10, (ball.runs || 0) * 15)}px`,
                      width: '20px',
                      backgroundColor: ball.type === 'boundary4' || ball.type === 'boundary6' ? '#10b981' : 
                                     ball.type === 'wicket' ? '#ef4444' : '#3b82f6'
                    }}
                  />
                ))}
              </div>
              
              <div className="mt-3 text-center">
                <div className="text-sm opacity-75">Current RR</div>
                <div className="text-xl font-bold">{calculateRunRate().toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Regular display mode (non-overlay)
  return (
    <div className="space-y-6">
      {/* Main Scoreboard */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team A */}
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              {match.teamA.logoUrl && (
                <img src={match.teamA.logoUrl} alt={match.teamA.name} className="h-16 w-16 rounded-full object-cover" />
              )}
              <div>
                <h3 className="text-xl font-bold text-gray-900">{match.teamA.name}</h3>
                <div className="text-4xl font-bold text-blue-600">{match.teamA.score}/{match.teamA.wickets}</div>
              </div>
            </div>
            
            {match.currentInnings === 1 && innings.battingTeam === 'A' && (
              <div className="text-sm text-gray-600">
                {formatOvers(innings.overNumber, innings.legalBallsInCurrentOver)} overs
                {innings.maxOvers && ` / ${innings.maxOvers}`}
              </div>
            )}
            
            {match.currentInnings === 2 && innings.battingTeam === 'A' && (
              <div className="text-sm text-gray-600">
                {formatOvers(innings.overNumber, innings.legalBallsInCurrentOver)} overs
                {innings.target && ` • Need ${Math.max(0, innings.target - match.teamA.score)} runs`}
              </div>
            )}
          </div>

          {/* Current Status */}
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-700 mb-2">
              {innings.isInterval ? (
                <div className="space-y-2">
                  <Clock className="h-8 w-8 mx-auto text-yellow-500" />
                  <div className="text-yellow-600">
                    {innings.intervalMessage || `${(innings.intervalType || 'interval').charAt(0).toUpperCase() + (innings.intervalType || 'interval').slice(1)} Break`}
                  </div>
                </div>
              ) : (
                <>
                  <div>Innings {match.currentInnings}</div>
                  <div className="text-sm text-gray-500">
                    Over {formatOvers(innings.overNumber, innings.legalBallsInCurrentOver)}
                    {innings.maxOvers && ` / ${innings.maxOvers}`}
                  </div>
                </>
              )}
            </div>

            {!innings.isInterval && (
              <>
                {/* Current Over Balls */}
                <div className="flex justify-center mb-4">
                  <div className="cricket-over-container flex flex-wrap justify-center gap-2 max-w-sm">
                    {currentOverBalls.map((ball, index) => (
                      <div
                        key={index}
                        className={`ball-indicator ${ball.type} ${ball.isFreeHit ? 'free-hit-blink' : ''}`}
                      >
                        {ball.value}
                      </div>
                    ))}
                    {/* Fill remaining balls */}
                    {Array.from({ length: Math.max(0, 6 - currentOverBalls.length) }, (_, index) => (
                      <div
                        key={`empty-${index}`}
                        className="ball-indicator empty"
                      >
                        -
                      </div>
                    ))}
                  </div>
                </div>

                {/* Players */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="striker-dot w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="font-semibold">{striker?.name}</span>
                    <span className="text-gray-600">
                      {striker?.battingStats?.runs || 0}({striker?.battingStats?.balls || 0})
                    </span>
                  </div>
                  
                  <div className="text-gray-600">
                    {nonStriker?.name} {nonStriker?.battingStats?.runs || 0}({nonStriker?.battingStats?.balls || 0})
                  </div>
                  
                  <div className="flex items-center justify-center space-x-2">
                    <span className="font-medium">{bowler?.name}</span>
                    <span className="text-gray-600">
                      {Math.floor((bowler?.bowlingStats?.balls || 0) / 6)}.{(bowler?.bowlingStats?.balls || 0) % 6}
                    </span>
                  </div>
                </div>

                {/* Run Rates */}
                <div className="mt-4 flex justify-center space-x-4 text-sm">
                  <div>
                    <span className="text-gray-600">RR: </span>
                    <span className="font-bold">{calculateRunRate().toFixed(2)}</span>
                  </div>
                  {requiredRunRate !== null && (
                    <div>
                      <span className="text-gray-600">Req: </span>
                      <span className="font-bold text-red-600">{requiredRunRate.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Team B */}
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{match.teamB.name}</h3>
                <div className="text-4xl font-bold text-red-600">{match.teamB.score}/{match.teamB.wickets}</div>
              </div>
              {match.teamB.logoUrl && (
                <img src={match.teamB.logoUrl} alt={match.teamB.name} className="h-16 w-16 rounded-full object-cover" />
              )}
            </div>
            
            {match.currentInnings === 1 && innings.battingTeam === 'B' && (
              <div className="text-sm text-gray-600">
                {formatOvers(innings.overNumber, innings.legalBallsInCurrentOver)} overs
                {innings.maxOvers && ` / ${innings.maxOvers}`}
              </div>
            )}
            
            {match.currentInnings === 2 && innings.battingTeam === 'B' && (
              <div className="text-sm text-gray-600">
                {formatOvers(innings.overNumber, innings.legalBallsInCurrentOver)} overs
                {innings.target && ` • Need ${Math.max(0, innings.target - match.teamB.score)} runs`}
              </div>
            )}
          </div>
        </div>

        {/* Free Hit Indicator */}
        {innings.freeHit && !innings.isInterval && (
          <div className="mt-4 text-center">
            <div className="inline-block bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded-full font-bold animate-pulse">
              FREE HIT
            </div>
          </div>
        )}
      </div>

      {/* Last 6 Balls */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Balls</h3>
        <div className="flex justify-center">
          <div className="cricket-over-container flex flex-wrap justify-center gap-2">
            {lastSixBalls.map((ball, index) => (
              <div
                key={index}
                className={`ball-indicator ${ball.type} ${ball.isFreeHit ? 'free-hit-blink' : ''}`}
              >
                {ball.value}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Match Status */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-800">
            {CricketScorer.getMatchResult(match)}
          </div>
          
          {match.currentInnings === 2 && innings.target && (
            <div className="mt-2 text-lg">
              <span className="text-gray-600">Target: </span>
              <span className="font-bold">{innings.target}</span>
              <span className="text-gray-600"> • Need: </span>
              <span className="font-bold text-red-600">{Math.max(0, innings.target - battingTeam.score)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};