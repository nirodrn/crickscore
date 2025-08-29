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
  const [realtimeSettings, setRealtimeSettings] = useState<any>(null);

  const innings = match.currentInnings === 1 ? match.innings1 : match.innings2!;
  const battingTeam = innings.battingTeam === 'A' ? match.teamA : match.teamB;
  const bowlingTeam = innings.bowlingTeam === 'A' ? match.teamA : match.teamB;
  
  const striker = battingTeam.players.find(p => p.id === innings.strikerId);
  const nonStriker = battingTeam.players.find(p => p.id === innings.nonStrikerId);
  const bowler = bowlingTeam.players.find(p => p.id === innings.bowlerId);

  // Load overlay settings with real-time updates
  useEffect(() => {
    if (!overlayMode) return;

    let unsubscribe: (() => void) | null = null;
    
    const setupOverlaySettings = async () => {
      try {
        const { getOverlaySettingsForMatch, subscribeToPublicOverlaySettings } = await import('../firebase');
        
        // Initial load
        const initialSettings = await getOverlaySettingsForMatch(match.id);
        console.log('[ScoreDisplay] Initial overlay settings loaded:', initialSettings);
        setOverlaySettings(initialSettings);
        setRealtimeSettings(initialSettings);

        // Set up real-time subscription
        unsubscribe = subscribeToPublicOverlaySettings(match.id, (settings) => {
          console.log('[ScoreDisplay] Real-time settings update:', settings);
          if (settings) {
            setOverlaySettings(settings);
            setRealtimeSettings(settings);
          }
        });
      } catch (error) {
        console.error('[ScoreDisplay] Failed to setup overlay settings:', error);
        // Fallback to default settings
        const defaultSettings = {
          showOverlay: true,
          showPlayerStats: true,
          showSidePanels: true,
          showRunRateChart: true,
          showFullscreenPlayerStats: true,
          showFullscreenRunRate: true,
          showFullscreenMatchSummary: true,
          showComparisonChart: true,
          fullscreenDuration: 10,
          primaryColor: '#1e3a8a',
          secondaryColor: '#1d4ed8',
          accentColor: '#3b82f6',
          textColor: '#ffffff',
          teamAColor: '#3b82f6',
          teamBColor: '#ef4444'
        };
        setOverlaySettings(defaultSettings);
        setRealtimeSettings(defaultSettings);
      }
    };

    setupOverlaySettings();
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [match.id]);

  // Panel management with enhanced animations
  useEffect(() => {
    if (!realtimeSettings || !overlayMode) return;

    const checkForPanelTriggers = () => {
      const now = Date.now();
      const threshold = 5000; // 5 seconds to ensure triggers are caught

      console.log('[ScoreDisplay] Checking panel triggers:', {
        now,
        triggerPlayerStats: realtimeSettings.triggerPlayerStats,
        triggerRunRate: realtimeSettings.triggerRunRate,
        triggerMatchSummary: realtimeSettings.triggerMatchSummary,
        triggerComparison: realtimeSettings.triggerComparison,
        hideAllPanels: realtimeSettings.hideAllPanels
      });

      // Check for manual triggers
      if (realtimeSettings.triggerPlayerStats && now - realtimeSettings.triggerPlayerStats < threshold) {
        console.log('[ScoreDisplay] Triggering playerStats panel');
        showPanelWithAnimation('playerStats');
      } else if (realtimeSettings.triggerRunRate && now - realtimeSettings.triggerRunRate < threshold) {
        console.log('[ScoreDisplay] Triggering runRate panel');
        showPanelWithAnimation('runRate');
      } else if (realtimeSettings.triggerMatchSummary && now - realtimeSettings.triggerMatchSummary < threshold) {
        console.log('[ScoreDisplay] Triggering matchSummary panel');
        showPanelWithAnimation('matchSummary');
      } else if (realtimeSettings.triggerComparison && now - realtimeSettings.triggerComparison < threshold) {
        console.log('[ScoreDisplay] Triggering comparison panel');
        showPanelWithAnimation('comparison');
      } else if (realtimeSettings.triggerBatsmanSummary && now - realtimeSettings.triggerBatsmanSummary < threshold) {
        console.log('[ScoreDisplay] Triggering batsmanSummary panel');
        showPanelWithAnimation('batsmanSummary');
      } else if (realtimeSettings.triggerBowlerSummary && now - realtimeSettings.triggerBowlerSummary < threshold) {
        console.log('[ScoreDisplay] Triggering bowlerSummary panel');
        showPanelWithAnimation('bowlerSummary');
      } else if (realtimeSettings.triggerWinner && now - realtimeSettings.triggerWinner < threshold) {
        console.log('[ScoreDisplay] Triggering winner panel');
        showPanelWithAnimation('winner');
      } else if (realtimeSettings.hideAllPanels && now - realtimeSettings.hideAllPanels < threshold) {
        console.log('[ScoreDisplay] Hiding all panels');
        hidePanelWithAnimation();
      }
    };

    const interval = setInterval(checkForPanelTriggers, 1000);
    return () => clearInterval(interval);
  }, [realtimeSettings, overlayMode]);

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
    console.log(`[ScoreDisplay] Showing panel: ${panelType}`);
    setPanelAnimation('animate-fadeIn');
    setShowFullscreenPanel(panelType);
    
    const duration = (realtimeSettings?.fullscreenDuration || 10) * 1000;
    console.log(`[ScoreDisplay] Panel will hide after ${duration}ms`);
    
    setTimeout(() => {
      hidePanelWithAnimation();
    }, duration);
  };

  const hidePanelWithAnimation = () => {
    console.log('[ScoreDisplay] Hiding panel with animation');
    setPanelAnimation('animate-fadeOut');
    setTimeout(() => {
      setShowFullscreenPanel(null);
      setPanelAnimation('');
      console.log('[ScoreDisplay] Panel hidden');
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
        {showFullscreenPanel === 'playerStats' && (
          <PlayerStatsPanel match={match} overlaySettings={overlaySettings} panelAnimation={panelAnimation} />
        )}
        {showFullscreenPanel === 'runRate' && (
          <RunRateAnalysisPanel match={match} overlaySettings={overlaySettings} panelAnimation={panelAnimation} />
        )}
        {showFullscreenPanel === 'matchSummary' && (
          <MatchSummaryPanel match={match} overlaySettings={overlaySettings} panelAnimation={panelAnimation} />
        )}
        {showFullscreenPanel === 'comparison' && (
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
                           `linear-gradient(135deg, ${overlaySettings?.primaryColor || '#4c1d95'} 0%, ${overlaySettings?.secondaryColor || '#7c3aed'} 50%, ${overlaySettings?.accentColor || '#a855f7'} 100%)`,
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
                </div>
              )}

              {/* Main Footer Layout - Modern Broadcast Style */}
              {!innings.isInterval && (
                <div className="cricket-footer-content">
                  {/* Left Team Flag */}
                  <div className="team-flag-section">
                    {battingTeam.logoUrl ? (
                      <img src={battingTeam.logoUrl} alt={battingTeam.name} className="team-flag" />
                    ) : (
                      <div className="team-flag bg-blue-600 flex items-center justify-center text-xs font-bold">
                        {battingTeam.name.substring(0, 3).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Players Section */}
                  <div className="players-section">
                    <div className="player-row">
                      <div className="striker-indicator"></div>
                      <span className="player-name">{striker?.name || 'N/A'}</span>
                      <span className="player-score">{striker?.battingStats?.runs || 0}</span>
                    </div>
                    <div className="player-row">
                      <span className="player-name">{nonStriker?.name || 'N/A'}</span>
                      <span className="player-score">{nonStriker?.battingStats?.runs || 0}</span>
                    </div>
                  </div>

                  {/* Central Match Info */}
                  <div className="match-info-section">
                    <div className="match-header">
                      <div className="team-vs-display">
                        {battingTeam.name.substring(0, 2).toUpperCase()} v {bowlingTeam.name.substring(0, 3).toUpperCase()}
                      </div>
                      <div className="match-score">
                        {battingTeam.score}-{battingTeam.wickets}
                      </div>
                      <div className="run-rate-display">
                        RR: {calculateRunRate().toFixed(2)}
                      </div>
                      {requiredRunRate !== null && (
                        <div className="required-rate-display">
                          REQ: {requiredRunRate.toFixed(2)}
                        </div>
                      )}
                      <div className="innings-indicator">
                        {innings.powerplayActive ? `P${innings.powerplayOversRemaining || 1}` : `P${match.currentInnings}`}
                      </div>
                      <div className="overs-display">
                        {formatOvers(innings.overNumber, innings.legalBallsInCurrentOver)} overs
                      </div>
                    </div>
                    <div className="tournament-info">
                      {match.tournamentName || 'Cricket Match'}
                    </div>
                  </div>

                  {/* Bowler Section */}
                  <div className="bowler-section">
                    <div className="bowler-info">
                      <div className="bowler-name">{bowler?.name || 'N/A'}</div>
                      <div className="bowler-stats">
                        {Math.floor((bowler?.bowlingStats?.balls || 0) / 6)}.{(bowler?.bowlingStats?.balls || 0) % 6} - {bowler?.bowlingStats?.runs || 0}/{bowler?.bowlingStats?.wickets || 0}
                      </div>
                    </div>
                    <div className="current-over-balls">
                      {/* Show ALL balls in current over, including extras */}
                      {currentOverBalls.map((ball, index) => (
                        <div
                          key={index}
                          className={`ball-dot ${ball.type}`}
                        >
                          {ball.value === '•' ? '' : ball.value}
                        </div>
                      ))}
                      {/* Fill remaining legal balls only if under 6 legal balls */}
                      {Array.from({ length: Math.max(0, 6 - innings.legalBallsInCurrentOver) }, (_, index) => (
                        <div key={`empty-${index}`} className="ball-dot empty"></div>
                      ))}
                    </div>
                  </div>

                  {/* Right Team Flag */}
                  <div className="team-flag-section">
                    {bowlingTeam.logoUrl ? (
                      <img src={bowlingTeam.logoUrl} alt={bowlingTeam.name} className="team-flag" />
                    ) : (
                      <div className="team-flag bg-red-600 flex items-center justify-center text-xs font-bold">
                        {bowlingTeam.name.substring(0, 3).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Free Hit Indicator */}
              {innings.freeHit && !innings.isInterval && (
                <div 
                  className="free-hit-indicator"
                >
                  FREE HIT
                </div>
              )}
            </div>
          </div>
        )}

        {/* Side Panels */}
        {realtimeSettings?.showPlayerStats && realtimeSettings?.showSidePanels && !showFullscreenPanel && (
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
        {realtimeSettings?.showRunRateChart && realtimeSettings?.showSidePanels && !showFullscreenPanel && (
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
                  <div className="cricket-over-container flex flex-wrap justify-center gap-2 max-w-lg">
                    {/* Show ALL balls in current over */}
                    {currentOverBalls.map((ball, index) => (
                      <div
                        key={index}
                        className={`ball-indicator ${ball.type} ${ball.isFreeHit ? 'free-hit-blink' : ''}`}
                      >
                        {ball.value}
                      </div>
                    ))}
                    {/* Fill remaining legal balls only */}
                    {Array.from({ length: Math.max(0, 6 - innings.legalBallsInCurrentOver) }, (_, index) => (
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