import React, { useState, useEffect } from 'react';
import { MatchState, BallDisplayItem } from '../types';
import { CricketScorer } from '../cricketUtils';
import { firebaseService, getOverlaySettingsFromFirebase, getOverlaySettingsForMatch, subscribeToPublicMatch } from '../firebase';
import { LocalStorageManager } from '../utils/localStorage';
import { TrendingUp, Users, BarChart3, Award, Target, Clock, Zap, Activity } from 'lucide-react';
import { PlayerStatsPanel } from './PlayerStatsPanel';

interface ScoreDisplayProps {
  match: MatchState;
  overlayMode?: boolean;
  forcePanel?: string;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = React.memo(({ match: initialMatch, overlayMode = false, forcePanel }) => {
  const [match, setMatch] = useState<MatchState>(initialMatch);
  const [overlaySettings, setOverlaySettings] = useState<any>(LocalStorageManager.getOverlaySettings());
  const [currentPanelTrigger, setCurrentPanelTrigger] = useState<any>({});
  
  // Ensure style settings is always available to prevent runtime ReferenceError
  const styleSettings = overlaySettings?.styleSettings || {};

  // Real-time updates for overlay mode
  useEffect(() => {
    // Subscribe to realtime updates for the match overlay. Use the incoming prop id
    // (initialMatch) rather than the internal `match` state so the listener is
    // attached to the correct document even before local state updates.
    if (!overlayMode || !initialMatch?.id) return;

    const matchId = initialMatch.id;
    // Debug log to help troubleshoot missing updates in other browsers
    // (will show whether subscription is being created and which path is used)
    // eslint-disable-next-line no-console
    console.debug('[ScoreDisplay] subscribing to match updates', { overlayMode, matchId });

    const user = firebaseService.getCurrentUser?.();
    if (user) {
      // Authenticated user - subscribe to private match
      const unsubscribe = firebaseService.subscribeToMatch(matchId, (updatedMatch) => {
        if (updatedMatch) {
          setMatch(updatedMatch);
        }
      });
      return unsubscribe;
    } else {
      // No user - subscribe to public match
      const unsubscribePublic = subscribeToPublicMatch(matchId, (updatedMatch) => {
        if (updatedMatch) {
          setMatch(updatedMatch);
        }
      });
      return unsubscribePublic;
    }
  }, [overlayMode, initialMatch?.id]);

  // Load overlay settings from Firebase and listen for changes
  useEffect(() => {
    const fetchSettings = async () => {
      const user = firebaseService.getCurrentUser?.();
      if (!user) return;
      
      try {
        const settings = await getOverlaySettingsFromFirebase(user.uid);
        setOverlaySettings(settings);
        LocalStorageManager.saveOverlaySettings(settings);
      } catch (error) {
        console.error('Failed to load overlay settings:', error);
      }
    };
    
    fetchSettings();
    
    // Set up interval to check for setting changes
    const interval = setInterval(fetchSettings, 2000);
    return () => clearInterval(interval);
  }, []);
  
  // Monitor for panel triggers
  useEffect(() => {
    if (!overlaySettings) return;
    
    const checkTriggers = () => {
      const newTriggers = {
        playerStats: overlaySettings.triggerPlayerStats || 0,
        runRate: overlaySettings.triggerRunRate || 0,
        matchSummary: overlaySettings.triggerMatchSummary || 0,
        comparison: overlaySettings.triggerComparison || 0,
        hideAll: overlaySettings.hideAllPanels || 0
      };
      
      // Check if any trigger has changed
      Object.keys(newTriggers).forEach(key => {
        if (newTriggers[key] !== currentPanelTrigger[key] && newTriggers[key] > 0) {
          if (key === 'hideAll') {
            hideAllPanels();
          } else {
            showPanel(key);
          }
        }
      });
      
      setCurrentPanelTrigger(newTriggers);
    };
    
    checkTriggers();
  }, [overlaySettings]);

  // If no user is present, try to load overlay settings for this match from public overlay settings
  useEffect(() => {
    const tryPublicSettings = async () => {
      if (overlaySettings && Object.keys(overlaySettings).length > 0) return;
      
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const matchParam = urlParams.get('match');
        if (!matchParam) return;
        
        const settings = await getOverlaySettingsForMatch(matchParam);
        if (settings) {
          setOverlaySettings(settings);
          LocalStorageManager.saveOverlaySettings(settings);
        }
      } catch (error) {
        console.error('Failed to load public overlay settings:', error);
      }
    };
    
    tryPublicSettings();
  }, [overlaySettings]);

  const [showFullscreenPanel, setShowFullscreenPanel] = useState<string | null>(null);
  const [panelTimer, setPanelTimer] = useState<NodeJS.Timeout | null>(null);
  const [panelAnimation, setPanelAnimation] = useState<string>('');

  const innings = match.currentInnings === 1 ? match.innings1 : match.innings2!;
  const battingTeam = innings.battingTeam === 'A' ? match.teamA : match.teamB;
  const bowlingTeam = innings.bowlingTeam === 'A' ? match.teamA : match.teamB;
  
  const striker = battingTeam.players.find(p => p.id === innings.strikerId);
  const nonStriker = battingTeam.players.find(p => p.id === innings.nonStrikerId);
  const bowler = bowlingTeam.players.find(p => p.id === innings.bowlerId);

  const currentRunRate = CricketScorer.calculateCurrentRunRate(
    battingTeam, 
    innings.overNumber, 
    innings.legalBallsInCurrentOver
  );

  let requiredRunRate = 0;
  if (match.currentInnings === 2 && innings.target && innings.maxOvers) {
    const remainingOvers = innings.maxOvers - innings.overNumber;
    const remainingBalls = 6 - innings.legalBallsInCurrentOver;
    requiredRunRate = CricketScorer.calculateRequiredRunRate(
      innings.target,
      battingTeam.score,
      remainingOvers > 0 ? remainingOvers - 1 : 0,
      remainingBalls
    );
  }

  const lastSixBalls = CricketScorer.getLastSixBalls(innings);
  const currentOverBalls = CricketScorer.getCurrentOverBalls(innings);
  const matchResult = CricketScorer.getMatchResult(match);

  const showPanel = (panelType: string) => {
    if (panelTimer) clearTimeout(panelTimer);
    
    setPanelAnimation('animate-slideDown');
    setShowFullscreenPanel(panelType);
    
    const timer = setTimeout(() => {
      setPanelAnimation('animate-fadeOut');
      setTimeout(() => {
      setShowFullscreenPanel(null);
        setPanelAnimation('');
      }, 300);
    }, (overlaySettings.fullscreenDuration || 10) * 1000);
    
    setPanelTimer(timer);
  };

  const hideAllPanels = () => {
    if (panelTimer) clearTimeout(panelTimer);
    setPanelAnimation('animate-fadeOut');
    setTimeout(() => {
    setShowFullscreenPanel(null);
      setPanelAnimation('');
    }, 300);
  };

  // Force panel display if specified
  useEffect(() => {
    if (forcePanel) {
      setShowFullscreenPanel(forcePanel);
    }
  }, [forcePanel]);

  // Get team colors with fallbacks
  const getTeamAColor = () => overlaySettings.teamAColor || '#3b82f6';
  const getTeamBColor = () => overlaySettings.teamBColor || '#ef4444';
  const getTeamAOpacity = () => overlaySettings.teamAOpacity || 0.9;
  const getTeamBOpacity = () => overlaySettings.teamBOpacity || 0.9;

  // Render fullscreen panels
  const renderFullscreenPanel = () => {
    if (!showFullscreenPanel && !forcePanel) return null;

    const panelType = forcePanel || showFullscreenPanel;
    const styleSettings = overlaySettings?.styleSettings || {};
    
    const panelStyle = {
      background: styleSettings.panelGradient || 
        `linear-gradient(135deg, ${overlaySettings?.primaryColor || '#1e3a8a'} 0%, ${overlaySettings?.secondaryColor || '#1d4ed8'} 50%, ${overlaySettings?.accentColor || '#3b82f6'} 100%)`,
      color: styleSettings.panelTextColor || overlaySettings?.textColor || '#ffffff',
      borderRadius: `${styleSettings.panelBorderRadius || 12}px`,
      padding: `${styleSettings.panelPadding || 24}px`
    };

    switch (panelType) {
      case 'playerStats':
        return <PlayerStatsPanel match={match} overlaySettings={overlaySettings} panelAnimation={panelAnimation} />;

      case 'runRate':
        return (
          <div className={`fixed inset-0 z-50 flex items-center justify-center p-8 ${panelAnimation}`} style={panelStyle}>
      <div className="panel-card bg-white/50 backdrop-blur-3xl rounded-3xl p-12 max-w-5xl w-full">
              <div className="text-center mb-12">
                <div className="relative">
                  <BarChart3 className="h-20 w-20 mx-auto mb-6 text-white animate-pulse" />
                  <Activity className="h-8 w-8 absolute -bottom-2 -right-2 text-green-400 animate-bounce" />
                </div>
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white to-green-200 bg-clip-text text-transparent">
                  RUN RATE ANALYSIS
                </h2>
              </div>
              
              {/* Run Rate Chart Visualization */}
              <div className="mb-12">
                <div className="bg-white/10 rounded-2xl p-8">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-6 text-center">Run Rate Progression</h3>
                  <div className="relative h-48 bg-white/10 rounded-lg overflow-hidden p-3">
                    {/* Two-team run rate progression chart (SVG) */}
                    {(() => {
                      // Determine max overs to plot
                      const maxOvers = Math.max(
                        match.innings1.maxOvers || match.innings1.overNumber || 0,
                        (match.innings2?.maxOvers) || match.innings2?.overNumber || 0,
                        1
                      );

                      // Helper: sum runs in events up to a given over (inclusive)
                      const sumRunsUpTo = (events: any[], overIndex: number) => {
                        return events.filter(e => e.overNumber <= overIndex).reduce((s, ev) => s + (ev.runsBat || ev.runsExtra || 0), 0);
                      };

                      const teamAEvents = match.innings1.events || [];
                      const teamBEvents = match.innings2?.events || [];

                      const aRates: number[] = [];
                      const bRates: number[] = [];

                      for (let i = 0; i < maxOvers; i++) {
                        const aRuns = sumRunsUpTo(teamAEvents, i);
                        const bRuns = sumRunsUpTo(teamBEvents, i);

                        // cumulative run rate = total runs / overs
                        const aRate = (i + 1) > 0 ? aRuns / (i + 1) : 0;
                        const bRate = (i + 1) > 0 ? bRuns / (i + 1) : 0;

                        aRates.push(aRate);
                        bRates.push(bRate);
                      }

                      const allRates = [...aRates, ...bRates, currentRunRate, requiredRunRate];
                      const maxRate = Math.max(6, ...allRates) * 1.25; // scale with margin

                      const viewW = 640;
                      const viewH = 180;

                      const mapX = (idx: number) => (idx / (maxOvers - 1 || 1)) * viewW;
                      const mapY = (rate: number) => viewH - (rate / maxRate) * (viewH - 20) - 10;

                      const teamAColor = getTeamAColor();
                      const teamBColor = getTeamBColor();

                      const makePath = (rates: number[]) => rates.map((r, i) => `${i === 0 ? 'M' : 'L'} ${mapX(i)} ${mapY(r)}`).join(' ');

                      const aPath = makePath(aRates);
                      const bPath = makePath(bRates);

                      return (
                        <svg className="w-full h-full" viewBox={`0 0 ${viewW} ${viewH}`} preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="aLine" x1="0%" x2="100%">
                              <stop offset="0%" stopColor={teamAColor} stopOpacity="0.95" />
                              <stop offset="100%" stopColor={teamAColor} stopOpacity="0.6" />
                            </linearGradient>
                            <linearGradient id="bLine" x1="0%" x2="100%">
                              <stop offset="0%" stopColor={teamBColor} stopOpacity="0.95" />
                              <stop offset="100%" stopColor={teamBColor} stopOpacity="0.6" />
                            </linearGradient>
                          </defs>

                          {/* grid */}
                          {[0.25, 0.5, 0.75].map((g, idx) => (
                            <line key={idx} x1={0} y1={g * viewH} x2={viewW} y2={g * viewH} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                          ))}

                          {/* filled area under Team A */}
                          <path d={`${aPath} L ${viewW} ${viewH} L 0 ${viewH} Z`} fill={teamAColor} fillOpacity={0.08} stroke="none" />
                          {/* filled area under Team B */}
                          <path d={`${bPath} L ${viewW} ${viewH} L 0 ${viewH} Z`} fill={teamBColor} fillOpacity={0.06} stroke="none" />

                          {/* Team A line (thicker, solid) */}
                          <path d={aPath} fill="none" stroke={teamAColor} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" opacity={0.98} />
                          {/* Team B line (thicker, dashed) */}
                          <path d={bPath} fill="none" stroke={teamBColor} strokeWidth={4} strokeDasharray="8,6" strokeLinejoin="round" strokeLinecap="round" opacity={0.98} />

                          {/* markers (larger for visibility) */}
                          {aRates.map((r, i) => (
                            <circle key={`a-${i}`} cx={mapX(i)} cy={mapY(r)} r={4.5} fill={teamAColor} stroke="#00000020" />
                          ))}
                          {bRates.map((r, i) => (
                            <rect key={`b-${i}`} x={mapX(i) - 4} y={mapY(r) - 4} width={8} height={8} fill={teamBColor} stroke="#00000020" rx={1} />
                          ))}

                          {/* x-axis labels */}
                          <g>
                            <text x={6} y={viewH - 6} fontSize={12} fill="rgba(255,255,255,0.9)">0</text>
                            <text x={viewW - 24} y={viewH - 6} fontSize={12} fill="rgba(255,255,255,0.9)">{maxOvers}</text>
                          </g>
                        </svg>
                      );
                    })()}

                    <div className="absolute top-3 right-3 flex items-center space-x-4 text-sm sm:text-base">
                      <div className="flex items-center space-x-1"><span className="w-3 h-2 rounded-sm" style={{ background: getTeamAColor() }}></span><span className="opacity-80">{match.teamA.name}</span></div>
                      <div className="flex items-center space-x-1"><span className="w-3 h-2 rounded-sm" style={{ background: getTeamBColor() }}></span><span className="opacity-80">{match.teamB.name}</span></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-12 mb-8">
                <div className="text-center">
                  <div className="bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-2xl p-8 border border-green-400/30">
                    <div className="flex items-center justify-center mb-4">
                      <TrendingUp className="h-8 w-8 text-green-400 mr-2 animate-pulse" />
                      <div className="text-2xl font-semibold">Current Run Rate</div>
                    </div>
                    <div className="relative">
                      <div className="text-4xl sm:text-5xl md:text-7xl font-bold text-green-400 mb-4 animate-pulse">
                        {currentRunRate.toFixed(2)}
                      </div>
                      <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-400 rounded-full animate-ping"></div>
                    </div>
                    <div className="text-xl opacity-80">Runs per over</div>
                    
                    {/* Progress Bar */}
                    <div className="mt-6 bg-white/10 rounded-full h-3 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-400 to-blue-400 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min((currentRunRate / 15) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {match.currentInnings === 2 && innings.target && (
                  <div className="text-center">
                    <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-2xl p-8 border border-red-400/30">
                      <div className="flex items-center justify-center mb-4">
                        <Target className="h-8 w-8 text-red-400 mr-2 animate-spin-slow" />
                        <div className="text-2xl font-semibold">Required Run Rate</div>
                      </div>
                        <div className="relative">
                        <div className="text-4xl sm:text-5xl md:text-7xl font-bold text-red-400 mb-4 animate-pulse">
                          {requiredRunRate.toFixed(2)}
                        </div>
                        <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-400 rounded-full animate-ping"></div>
                      </div>
                      <div className="text-xl opacity-80">To win the match</div>
                      
                      {/* Progress Bar */}
                      <div className="mt-6 bg-white/10 rounded-full h-3 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-red-400 to-orange-400 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${Math.min((requiredRunRate / 15) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {match.currentInnings === 2 && innings.target && (
                <div className="text-center">
                  <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl p-8 border border-purple-400/30">
                    <div className="flex items-center justify-center mb-6">
                      <Clock className="h-10 w-10 text-purple-400 mr-3 animate-spin-slow" />
                      <div className="text-3xl font-bold">MATCH SITUATION</div>
                    </div>
                    <div className="grid grid-cols-3 gap-6 text-center">
                      <div className="bg-white/10 rounded-xl p-4">
                        <div className="text-sm opacity-80">Runs Needed</div>
                        <div className="text-3xl font-bold text-purple-400">
                          {innings.target - battingTeam.score}
                        </div>
                      </div>
                      <div className="bg-white/10 rounded-xl p-4">
                        <div className="text-sm opacity-80">Balls Left</div>
                        <div className="text-3xl font-bold text-blue-400">
                          {((innings.maxOvers || 20) - innings.overNumber) * 6 - innings.legalBallsInCurrentOver}
                        </div>
                      </div>
                      <div className="bg-white/10 rounded-xl p-4">
                        <div className="text-sm opacity-80">Wickets Left</div>
                        <div className="text-3xl font-bold text-green-400">
                          {10 - battingTeam.wickets}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'matchSummary':
        return (
          <div className={`fixed inset-0 z-50 flex items-center justify-center p-8 ${panelAnimation}`} style={panelStyle}>
            <div className="panel-card bg-white/10 backdrop-blur-xl rounded-3xl p-12 max-w-6xl w-full">
              <div className="text-center mb-12">
                <div className="relative">
                  <Award className="h-20 w-20 mx-auto mb-6 text-yellow-400 animate-pulse" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-ping"></div>
                </div>
                <h2 className="text-6xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                  MATCH SUMMARY
                </h2>
              </div>
              
              <div className="grid grid-cols-2 gap-12 mb-8">
                <div className="text-center">
                  <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl p-8 border border-blue-400/30 transform hover:scale-105 transition-all duration-300">
                    <div className="flex items-center justify-center mb-4">
                      {match.teamA.logoUrl && (
                        <img src={match.teamA.logoUrl} alt={match.teamA.name} className="h-12 w-12 rounded-full mr-3" />
                      )}
                      <div className="text-3xl font-bold text-blue-400">{match.teamA.name}</div>
                    </div>
                    <div className="text-6xl font-bold mb-4 text-white">
                      {match.teamA.score}<span className="text-3xl text-blue-400">/{match.teamA.wickets}</span>
                    </div>
                    <div className="text-xl opacity-80 mb-4">
                      {match.currentInnings === 1 && innings.battingTeam === 'A' ? 
                        `(${innings.overNumber}.${innings.legalBallsInCurrentOver})` :
                        match.innings1.battingTeam === 'A' ? 
                          `(${match.innings1.overNumber}.${match.innings1.legalBallsInCurrentOver})` : 
                          match.innings2 ? `(${match.innings2.overNumber}.${match.innings2.legalBallsInCurrentOver})` : ''
                      }
                    </div>
                    
                    {/* Team A Stats */}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="text-sm opacity-80">Run Rate</div>
                        <div className="font-bold text-lg">
                          {match.innings1.battingTeam === 'A' ? 
                            CricketScorer.calculateCurrentRunRate(match.teamA, match.innings1.overNumber, match.innings1.legalBallsInCurrentOver).toFixed(2) :
                            match.innings2 ? CricketScorer.calculateCurrentRunRate(match.teamA, match.innings2.overNumber, match.innings2.legalBallsInCurrentOver).toFixed(2) : '0.00'
                          }
                        </div>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="text-sm opacity-80">Extras</div>
                        <div className="font-bold text-lg">
                          {match.teamA.extras.wides + match.teamA.extras.noballs + match.teamA.extras.byes + match.teamA.extras.legbyes}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <div className="bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-2xl p-8 border border-red-400/30 transform hover:scale-105 transition-all duration-300">
                    <div className="flex items-center justify-center mb-4">
                      {match.teamB.logoUrl && (
                        <img src={match.teamB.logoUrl} alt={match.teamB.name} className="h-12 w-12 rounded-full mr-3" />
                      )}
                      <div className="text-3xl font-bold text-red-400">{match.teamB.name}</div>
                    </div>
                    <div className="text-6xl font-bold mb-4 text-white">
                      {match.teamB.score}<span className="text-3xl text-red-400">/{match.teamB.wickets}</span>
                    </div>
                    <div className="text-xl opacity-80 mb-4">
                      {match.currentInnings === 1 && innings.battingTeam === 'B' ? 
                        `(${innings.overNumber}.${innings.legalBallsInCurrentOver})` :
                        match.innings1.battingTeam === 'B' ? 
                          `(${match.innings1.overNumber}.${match.innings1.legalBallsInCurrentOver})` : 
                          match.innings2 ? `(${match.innings2.overNumber}.${match.innings2.legalBallsInCurrentOver})` : ''
                      }
                    </div>
                    
                    {/* Team B Stats */}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="text-sm opacity-80">Run Rate</div>
                        <div className="font-bold text-lg">
                          {match.innings1.battingTeam === 'B' ? 
                            CricketScorer.calculateCurrentRunRate(match.teamB, match.innings1.overNumber, match.innings1.legalBallsInCurrentOver).toFixed(2) :
                            match.innings2 ? CricketScorer.calculateCurrentRunRate(match.teamB, match.innings2.overNumber, match.innings2.legalBallsInCurrentOver).toFixed(2) : '0.00'
                          }
                        </div>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="text-sm opacity-80">Extras</div>
                        <div className="font-bold text-lg">
                          {match.teamB.extras.wides + match.teamB.extras.noballs + match.teamB.extras.byes + match.teamB.extras.legbyes}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-2xl p-8 border border-purple-400/30">
                  <div className="flex items-center justify-center mb-6">
                    <Activity className="h-10 w-10 text-purple-400 mr-3 animate-pulse" />
                    <div className="text-3xl font-bold">MATCH STATUS</div>
                  </div>
                  <div className="text-4xl font-bold mb-4 text-white">
                    {match.currentInnings === 1 ? 
                      `${battingTeam.name} batting - Innings 1` :
                      `${battingTeam.name} batting - Innings 2`
                    }
                  </div>
                  {match.currentInnings === 2 && innings.target && (
                    <div className="grid grid-cols-3 gap-4 mt-6">
                      <div className="bg-white/10 rounded-lg p-4">
                        <div className="text-sm opacity-80">Target</div>
                        <div className="text-2xl font-bold text-yellow-400">{innings.target}</div>
                      </div>
                      <div className="bg-white/10 rounded-lg p-4">
                        <div className="text-sm opacity-80">Need</div>
                        <div className="text-2xl font-bold text-red-400">{innings.target - battingTeam.score} runs</div>
                      </div>
                      <div className="bg-white/10 rounded-lg p-4">
                        <div className="text-sm opacity-80">Overs Left</div>
                        <div className="text-2xl font-bold text-blue-400">
                          {((innings.maxOvers || 20) - innings.overNumber - 1) + (6 - innings.legalBallsInCurrentOver) / 6}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'comparison':
        return (
          <div className={`fixed inset-0 z-50 flex items-center justify-center p-8 ${panelAnimation}`} style={panelStyle}>
            <div className="panel-card bg-white/10 backdrop-blur-xl rounded-3xl p-12 max-w-7xl w-full">
              <div className="text-center mb-12">
                <div className="relative">
                  <TrendingUp className="h-20 w-20 mx-auto mb-6 text-white animate-pulse" />
                  <BarChart3 className="h-8 w-8 absolute -bottom-2 -right-2 text-green-400 animate-bounce" />
                </div>
                <h2 className="text-6xl font-bold mb-4 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                  TEAM COMPARISON
                </h2>
              </div>
              
              {/* Comparison Chart */}
              <div className="mb-12">
                <div className="bg-white/10 rounded-2xl p-8">
                  <h3 className="text-2xl font-bold mb-6 text-center">Performance Comparison</h3>
                  <div className="grid grid-cols-2 gap-8">
                    {/* Team A Bar */}
                    <div className="text-center">
                      <div className="text-xl font-bold mb-4 text-blue-400">{match.teamA.name}</div>
                      <div className="relative h-40 bg-white/5 rounded-lg flex items-end justify-center p-4">
                        <div 
                          className="bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-lg w-16 transition-all duration-2000 ease-out flex items-end justify-center pb-2"
                          style={{ height: `${Math.min((match.teamA.score / Math.max(match.teamA.score, match.teamB.score, 1)) * 100, 100)}%` }}
                        >
                          <span className="text-white font-bold text-sm">{match.teamA.score}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Team B Bar */}
                    <div className="text-center">
                      <div className="text-xl font-bold mb-4 text-red-400">{match.teamB.name}</div>
                      <div className="relative h-40 bg-white/5 rounded-lg flex items-end justify-center p-4">
                        <div 
                          className="bg-gradient-to-t from-red-500 to-red-300 rounded-t-lg w-16 transition-all duration-2000 ease-out flex items-end justify-center pb-2"
                          style={{ height: `${Math.min((match.teamB.score / Math.max(match.teamA.score, match.teamB.score, 1)) * 100, 100)}%` }}
                        >
                          <span className="text-white font-bold text-sm">{match.teamB.score}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-2xl p-6 border border-green-400/30">
                    <div className="flex items-center justify-center mb-4">
                      <Target className="h-6 w-6 text-green-400 mr-2" />
                      <div className="text-lg font-semibold">Runs Scored</div>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="text-sm text-blue-400">{match.teamA.name}</div>
                        <div className="text-3xl font-bold text-blue-400">{match.teamA.score}</div>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="text-sm text-red-400">{match.teamB.name}</div>
                        <div className="text-3xl font-bold text-red-400">{match.teamB.score}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-2xl p-6 border border-red-400/30">
                    <div className="flex items-center justify-center mb-4">
                      <Zap className="h-6 w-6 text-red-400 mr-2" />
                      <div className="text-lg font-semibold">Wickets Lost</div>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="text-sm text-blue-400">{match.teamA.name}</div>
                        <div className="text-3xl font-bold text-blue-400">{match.teamA.wickets}</div>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="text-sm text-red-400">{match.teamB.name}</div>
                        <div className="text-3xl font-bold text-red-400">{match.teamB.wickets}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-2xl p-6 border border-yellow-400/30">
                    <div className="flex items-center justify-center mb-4">
                      <Activity className="h-6 w-6 text-yellow-400 mr-2" />
                      <div className="text-lg font-semibold">Extras</div>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="text-sm text-blue-400">{match.teamA.name}</div>
                        <div className="text-3xl font-bold text-blue-400">
                          {match.teamA.extras.wides + match.teamA.extras.noballs + match.teamA.extras.byes + match.teamA.extras.legbyes}
                        </div>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="text-sm text-red-400">{match.teamB.name}</div>
                        <div className="text-3xl font-bold text-red-400">
                          {match.teamB.extras.wides + match.teamB.extras.noballs + match.teamB.extras.byes + match.teamB.extras.legbyes}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl p-6 border border-purple-400/30">
                    <div className="flex items-center justify-center mb-4">
                      <BarChart3 className="h-6 w-6 text-purple-400 mr-2" />
                      <div className="text-lg font-semibold">Run Rate</div>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="text-sm text-blue-400">{match.teamA.name}</div>
                        <div className="text-3xl font-bold text-blue-400">
                          {match.innings1.battingTeam === 'A' ? 
                            CricketScorer.calculateCurrentRunRate(match.teamA, match.innings1.overNumber, match.innings1.legalBallsInCurrentOver).toFixed(1) :
                            match.innings2 ? CricketScorer.calculateCurrentRunRate(match.teamA, match.innings2.overNumber, match.innings2.legalBallsInCurrentOver).toFixed(1) : '0.0'
                          }
                        </div>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="text-sm text-red-400">{match.teamB.name}</div>
                        <div className="text-3xl font-bold text-red-400">
                          {match.innings1.battingTeam === 'B' ? 
                            CricketScorer.calculateCurrentRunRate(match.teamB, match.innings1.overNumber, match.innings1.legalBallsInCurrentOver).toFixed(1) :
                            match.innings2 ? CricketScorer.calculateCurrentRunRate(match.teamB, match.innings2.overNumber, match.innings2.legalBallsInCurrentOver).toFixed(1) : '0.0'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderBallIndicator = (ball: BallDisplayItem, index: number, styleSettings?: any) => {
    const size = styleSettings?.ballIndicatorSize || 32;
    const spacing = styleSettings?.ballIndicatorSpacing || 8;
    
    return (
      <div
        key={index}
        className={`ball-indicator ${ball.type} ${ball.isFreeHit ? 'free-hit-blink' : ''}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          marginRight: index < 5 ? `${spacing}px` : '0',
          fontSize: size < 28 ? '10px' : '12px'
        }}
      >
        {ball.value}
      </div>
    );
  };

  // Compact footer/ticker style for OBS overlay
  if (overlayMode) {
    const styleSettings = overlaySettings?.styleSettings;
    
    // Apply custom CSS if provided
    useEffect(() => {
      if (styleSettings?.customCSS) {
        const styleElement = document.createElement('style');
        styleElement.id = 'custom-overlay-styles';
        styleElement.textContent = styleSettings.customCSS;
        
        // Remove existing custom styles
        const existingStyle = document.getElementById('custom-overlay-styles');
        if (existingStyle) {
          document.head.removeChild(existingStyle);
        }
        
        document.head.appendChild(styleElement);
        
        return () => {
          const element = document.getElementById('custom-overlay-styles');
          if (element) {
            document.head.removeChild(element);
          }
        };
      }
    }, [styleSettings?.customCSS]);

    return (
      <div className="relative">
        {/* Fullscreen panels */}
        {renderFullscreenPanel()}

        {/* Compact footer - only show if no fullscreen panel or if settings allow */}
        {(!showFullscreenPanel && !forcePanel && overlaySettings?.showOverlay) && (
          <div 
            className="cricket-footer fixed bottom-0 left-0 right-0 text-white shadow-2xl backdrop-blur-lg animate-slideUp"
            style={{
              background: styleSettings?.footerGradient || styleSettings?.footerBgColor || 
                `linear-gradient(90deg, 
                  ${getTeamAColor()}${Math.round(getTeamAOpacity() * 255).toString(16).padStart(2, '0')} 0%, 
                  ${overlaySettings?.primaryColor || '#1e3a8a'}${Math.round((overlaySettings?.teamAOpacity || 0.9) * 255).toString(16).padStart(2, '0')} 25%, 
                  ${overlaySettings?.secondaryColor || '#1d4ed8'}${Math.round((overlaySettings?.teamBOpacity || 0.9) * 255).toString(16).padStart(2, '0')} 75%, 
                  ${getTeamBColor()}${Math.round(getTeamBOpacity() * 255).toString(16).padStart(2, '0')} 100%)`,
              color: styleSettings?.footerTextColor || '#ffffff',
              borderRadius: `${styleSettings?.footerBorderRadius || 0}px`,
              padding: `${styleSettings?.footerPadding || 16}px`,
              textAlign: styleSettings?.footerTextAlignment || 'center'
            }}
          >
            {/* Main ticker bar - reduced height */}
            <div className="flex items-center h-16 px-6">
              {/* Team A Flag & Name */}
              <div className="flex items-center space-x-3 min-w-0 flex-shrink-0">
                {battingTeam.logoUrl && (
                  <img src={battingTeam.logoUrl} alt={battingTeam.name} className="h-10 w-10 rounded border-2 border-white/20" />
                )}
                <div className="text-xl font-bold text-white uppercase tracking-wide">
                  {battingTeam.name || 'TEAM'}
                </div>
              </div>

              {/* Score Section */}
              <div className="flex items-center space-x-6 mx-8 flex-shrink-0">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">
                    {battingTeam.score}/{battingTeam.wickets}
                  </div>
                  <div className="text-sm text-white/80">
                    ({innings.overNumber}.{innings.legalBallsInCurrentOver})
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-xs text-white/70 uppercase">Run Rate</div>
                  <div className="text-lg font-semibold text-white">{currentRunRate.toFixed(2)}</div>
                </div>

                {match.currentInnings === 2 && innings.target && (
                  <>
                    <div className="text-center">
                      <div className="text-xs text-white/70 uppercase">Target</div>
                      <div className="text-lg font-semibold text-white">{innings.target}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-white/70 uppercase">Req RR</div>
                      <div className="text-lg font-semibold text-white">{requiredRunRate.toFixed(2)}</div>
                    </div>
                  </>
                )}
              </div>

              {/* Current Players (name prominent, label secondary) */}
              <div className="flex items-center space-x-6 mx-8 flex-1 min-w-0">
                <div className="text-center min-w-0">
                  <div className="text-sm font-semibold text-white truncate">
                    {striker?.name || 'N/A'}
                  </div>
                  <div className="text-xs text-green-300 uppercase">
                    STRIKER · {striker?.battingStats?.runs || 0} ({striker?.battingStats?.balls || 0})
                  </div>
                </div>

                <div className="text-center min-w-0">
                  <div className="text-sm font-semibold text-white truncate">
                    {nonStriker?.name || 'N/A'}
                  </div>
                  <div className="text-xs text-blue-300 uppercase">
                    NON-STRIKER · {nonStriker?.battingStats?.runs || 0} ({nonStriker?.battingStats?.balls || 0})
                  </div>
                </div>

                <div className="text-center min-w-0">
                  <div className="text-sm font-semibold text-white truncate">
                    {bowler?.name || 'N/A'}
                  </div>
                  <div className="text-xs text-red-300 uppercase">
                    BOWLER · {Math.floor((bowler?.bowlingStats?.balls || 0) / 6)}.{(bowler?.bowlingStats?.balls || 0) % 6} - {bowler?.bowlingStats?.runs || 0}/{bowler?.bowlingStats?.wickets || 0}
                  </div>
                </div>
              </div>

              {/* Current Over Balls - showing all deliveries including extras */}
              <div className="flex items-center space-x-2 mx-6 flex-shrink-0">
                <div className="text-xs text-white/70 uppercase mr-2">This Over</div>
                <div className="flex space-x-1">
                  {currentOverBalls.map((ball, index) => renderBallIndicator(ball, index, styleSettings))}
                  {/* Show empty slots for remaining legal balls if over is not complete */}
                  {Array.from({ length: Math.max(0, 6 - currentOverBalls.filter(b => b.type !== 'wide' && b.type !== 'noball').length) }, (_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="ball-indicator"
                      style={{
                        width: `${styleSettings?.ballIndicatorSize || 24}px`,
                        height: `${styleSettings?.ballIndicatorSize || 24}px`,
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        color: 'rgba(255,255,255,0.5)'
                      }}
                    >
                      •
                    </div>
                  ))}
                </div>
              </div>

              {/* Team B Flag & Name */}
              <div className="flex items-center space-x-3 min-w-0 flex-shrink-0">
                <div className="text-right">
                  <div className="text-xs text-white/70 uppercase">vs</div>
                  <div className="text-lg font-bold text-white uppercase tracking-wide">
                    {bowlingTeam.name || 'TEAM'}
                  </div>
                </div>
                {bowlingTeam.logoUrl && (
                  <img src={bowlingTeam.logoUrl} alt={bowlingTeam.name} className="h-10 w-10 rounded border-2 border-white/20" />
                )}
              </div>
            </div>

            {/* Bottom info bar - reduced height */}
            <div className="bg-black/30 px-6 py-1 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-4">
                <div className="text-white/80">
                  <span className="text-yellow-400">Extras:</span> 
                  <span className="ml-2">Wd {battingTeam.extras.wides}, NB {battingTeam.extras.noballs}, B {battingTeam.extras.byes}, LB {battingTeam.extras.legbyes}</span>
                </div>
                {innings.freeHit && (
                  <div className="bg-yellow-600 text-black px-2 py-1 rounded text-xs font-bold">
                    FREE HIT
                  </div>
                )}
              </div>
              
              <div className="text-center">
                <div className="text-blue-200 font-semibold uppercase tracking-wider text-xs">
                  LIVE CRICKET SCORE
                </div>
              </div>

              <div className="text-white/80">
                {innings.maxOvers && (
                  <span>
                    Overs: {innings.overNumber}/{innings.maxOvers}
                    {match.currentInnings === 2 && innings.target && (
                      <span className="ml-4">Need {innings.target - battingTeam.score} runs</span>
                    )}
                  </span>
                )}
              </div>
            </div>
            {/* Last updated timestamp for debugging realtime updates */}
            <div className="text-right text-xs text-white/60 mt-1 mr-4">
              {match.updatedAt ? `Last updated: ${new Date(match.updatedAt).toLocaleTimeString()}` : ''}
            </div>
          </div>
        )}

        {/* Match Result Display */}
        {match.isComplete && matchResult && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
            <div 
              className="cricket-panel bg-white/10 backdrop-blur-xl rounded-3xl p-12 text-center animate-bounce-in"
              style={{
                background: styleSettings?.panelGradient || styleSettings?.panelBgColor || 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #3b82f6 100%)',
                color: styleSettings?.panelTextColor || '#ffffff',
                borderRadius: `${styleSettings?.panelBorderRadius || 12}px`,
                padding: `${styleSettings?.panelPadding || 24}px`
              }}
            >
              <div className="relative">
                <Award className="h-20 w-20 mx-auto mb-6 text-yellow-400 animate-spin-slow" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-ping"></div>
              </div>
              <h2 className="text-6xl font-bold mb-6 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                MATCH COMPLETE
              </h2>
              <div className="text-4xl font-semibold bg-white/20 rounded-2xl p-6 border border-yellow-400/30">
                {matchResult}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Regular display mode (non-overlay) - keeping your original compact design
  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-6">
        {/* Match Result Banner */}
        {match.isComplete && matchResult && (
          <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-4 rounded-lg mb-6 text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Award className="h-6 w-6" />
              <span className="text-lg font-bold">MATCH COMPLETE</span>
            </div>
            <div className="text-xl font-semibold">{matchResult}</div>
          </div>
        )}

        {/* Teams Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            {battingTeam.logoUrl && (
              <img src={battingTeam.logoUrl} alt={battingTeam.name} className="h-12 w-12 rounded-full" />
            )}
            <div>
              <div className="text-sm text-green-600 font-medium">
                BATTING
              </div>
              <div className="text-xl font-bold text-gray-900">{battingTeam.name}</div>
            </div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {battingTeam.score}/{battingTeam.wickets}
            </div>
            <div className="text-lg text-gray-600">
              ({innings.overNumber}.{innings.legalBallsInCurrentOver})
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-red-600 font-medium">
                BOWLING
              </div>
              <div className="text-xl font-bold text-gray-900">{bowlingTeam.name}</div>
            </div>
            {bowlingTeam.logoUrl && (
              <img src={bowlingTeam.logoUrl} alt={bowlingTeam.name} className="h-12 w-12 rounded-full" />
            )}
          </div>
        </div>

        {/* Run Rates */}
        <div className="flex justify-center space-x-8 mb-6">
          <div className="text-center">
            <div className="text-sm text-gray-600">Current RR</div>
            <div className="text-lg font-semibold text-gray-900">{currentRunRate.toFixed(2)}</div>
          </div>
          {match.currentInnings === 2 && innings.target && (
            <>
              <div className="text-center">
                <div className="text-sm text-gray-600">Target</div>
                <div className="text-lg font-semibold text-gray-900">{innings.target}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">Required RR</div>
                <div className="text-lg font-semibold text-gray-900">{requiredRunRate.toFixed(2)}</div>
              </div>
            </>
          )}
        </div>

        {/* Current Batsmen - Player names prominent */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-lg font-semibold text-gray-900 mb-1">{striker?.name || 'N/A'}</div>
            <div className="text-sm text-green-600 font-medium mb-1">
              STRIKER
            </div>
            <div className="text-sm text-gray-600">
              {striker?.battingStats?.runs || 0} ({striker?.battingStats?.balls || 0}) - 
              4s: {striker?.battingStats?.fours || 0}, 6s: {striker?.battingStats?.sixes || 0}
            </div>
            {striker?.battingStats?.balls && striker.battingStats.balls > 0 && (
              <div className="text-sm text-gray-600">
                SR: {((striker.battingStats.runs / striker.battingStats.balls) * 100).toFixed(1)}
              </div>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-lg font-semibold text-gray-900 mb-1">{nonStriker?.name || 'N/A'}</div>
            <div className="text-sm text-blue-600 font-medium mb-1">
              NON-STRIKER
            </div>
            <div className="text-sm text-gray-600">
              {nonStriker?.battingStats?.runs || 0} ({nonStriker?.battingStats?.balls || 0}) - 
              4s: {nonStriker?.battingStats?.fours || 0}, 6s: {nonStriker?.battingStats?.sixes || 0}
            </div>
            {nonStriker?.battingStats?.balls && nonStriker.battingStats.balls > 0 && (
              <div className="text-sm text-gray-600">
                SR: {((nonStriker.battingStats.runs / nonStriker.battingStats.balls) * 100).toFixed(1)}
              </div>
            )}
          </div>
        </div>

        {/* Current Bowler - Player name prominent */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="text-lg font-semibold text-gray-900 mb-1">{bowler?.name || 'N/A'}</div>
          <div className="text-sm text-red-600 font-medium mb-1">
            BOWLER
          </div>
          <div className="text-sm text-gray-600">
            {Math.floor((bowler?.bowlingStats?.balls || 0) / 6)}.{(bowler?.bowlingStats?.balls || 0) % 6} - 
            {bowler?.bowlingStats?.runs || 0}/{bowler?.bowlingStats?.wickets || 0}
          </div>
          {bowler?.bowlingStats?.balls && bowler.bowlingStats.balls > 0 && (
            <div className="text-sm text-gray-600">
              Economy: {((bowler.bowlingStats.runs / bowler.bowlingStats.balls) * 6).toFixed(2)}
            </div>
          )}
        </div>

        {/* Current Over - showing all deliveries including extras */}
        <div className="mb-6">
          <div className="text-sm text-gray-600 font-medium mb-2">
            CURRENT OVER ({innings.overNumber + 1})
          </div>
          <div className="flex space-x-2 flex-wrap">
            {currentOverBalls.map((ball, index) => renderBallIndicator(ball, index))}
            {currentOverBalls.length === 0 && (
              <div className="text-gray-500 text-sm">No balls bowled yet</div>
            )}
          </div>
          
          {/* Over History */}
          <div className="mt-4">
            <div className="text-sm text-gray-600 font-medium mb-2">
              RECENT OVERS
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {Array.from({ length: Math.min(3, innings.overNumber) }, (_, overIndex) => {
                const overNum = innings.overNumber - overIndex;
                if (overNum < 0) return null;
                
                const overEvents = innings.events.filter(e => 
                  e.overNumber === overNum && e.kind !== 'dead'
                );
                
                return (
                  <div key={overNum} className="over-display">
                    <div className="over-number">Over {overNum + 1}:</div>
                    <div className="over-balls">
                      {overEvents.map((event, ballIndex) => {
                        const ballItem: BallDisplayItem = {
                          value: event.kind === 'wicket' ? 'W' : 
                                event.kind === 'boundary4' ? '4' :
                                event.kind === 'boundary6' ? '6' :
                                event.kind === 'wide' ? `w${event.runsExtra && event.runsExtra > 1 ? event.runsExtra : ''}` :
                                event.kind === 'noball' ? `nb${event.runsBat ? event.runsBat : ''}` :
                                event.kind === 'bye' ? `b${event.runsExtra || 1}` :
                                event.kind === 'legbye' ? `lb${event.runsExtra || 1}` :
                                event.runsBat === 0 ? '•' : String(event.runsBat),
                          type: event.kind === 'boundary4' ? 'boundary4' :
                                event.kind === 'boundary6' ? 'boundary6' :
                                event.kind === 'wicket' ? 'wicket' :
                                event.kind === 'wide' ? 'wide' :
                                event.kind === 'noball' ? 'noball' :
                                event.kind === 'bye' ? 'bye' :
                                event.kind === 'legbye' ? 'legbye' :
                                event.runsBat === 0 ? 'dot' : 'run',
                          isFreeHit: event.freeHitBefore
                        };
                        
                        return (
                          <div
                            key={ballIndex}
                            className={`ball-indicator ${ballItem.type} ${ballItem.isFreeHit ? 'free-hit-blink' : ''}`}
                            style={{ width: '24px', height: '24px', fontSize: '10px' }}
                          >
                            {ballItem.value}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Extras and Next Batter */}
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-gray-600 font-medium mb-1">
              EXTRAS
            </div>
            <div className="text-sm text-gray-900">
              Wd: {battingTeam.extras.wides}, 
              NB: {battingTeam.extras.noballs}, 
              B: {battingTeam.extras.byes}, 
              LB: {battingTeam.extras.legbyes}, 
              Pen: {battingTeam.extras.penalties}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});