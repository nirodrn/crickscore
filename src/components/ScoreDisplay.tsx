import React, { useState, useEffect } from 'react';
import { MatchState } from '../types';
import { CricketScorer } from '../cricketUtils';
import { firebaseService, getOverlaySettingsFromFirebase, getOverlaySettingsForMatch } from '../firebase';
import { TrendingUp, Users, BarChart3, Award } from 'lucide-react';



interface ScoreDisplayProps {
  match: MatchState;
  overlayMode?: boolean;
  forcePanel?: string;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = React.memo(({ match, overlayMode = false, forcePanel }) => {
  const [overlaySettings, setOverlaySettings] = useState<any>(null);
  // Load overlay settings from Firebase
  useEffect(() => {
    const fetchSettings = async () => {
      const user = firebaseService.getCurrentUser?.();
      if (!user) return;
      const settings = await getOverlaySettingsFromFirebase(user.uid);
      setOverlaySettings(settings);
    };
    fetchSettings();
  }, []);
  
  // If no user is present, try to load overlay settings for this match from public overlay settings
  useEffect(() => {
    const tryPublicSettings = async () => {
      if (overlaySettings) return;
      // Try to get match id from URL
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const matchParam = urlParams.get('match');
        if (!matchParam) return;
        const settings = await getOverlaySettingsForMatch(matchParam);
        setOverlaySettings(settings);
      } catch (e) {
        // ignore
      }
    };
    tryPublicSettings();
  }, [overlaySettings]);
  const [showFullscreenPanel, setShowFullscreenPanel] = useState<string | null>(null);
  const [panelTimer, setPanelTimer] = useState<NodeJS.Timeout | null>(null);

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

  // Optionally, you can add a Firebase listener for real-time updates if needed
  // For now, overlaySettings will update only on mount or manual refresh

  const showPanel = (panelType: string) => {
    if (panelTimer) clearTimeout(panelTimer);
    
    setShowFullscreenPanel(panelType);
    
    const timer = setTimeout(() => {
      setShowFullscreenPanel(null);
    }, (overlaySettings.fullscreenDuration || 10) * 1000);
    
    setPanelTimer(timer);
  };

  const hideAllPanels = () => {
    if (panelTimer) clearTimeout(panelTimer);
    setShowFullscreenPanel(null);
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
    const panelStyle = {
      background: `linear-gradient(135deg, ${(overlaySettings && overlaySettings.primaryColor) || '#1e3a8a'} 0%, ${(overlaySettings && overlaySettings.secondaryColor) || '#1d4ed8'} 50%, ${(overlaySettings && overlaySettings.accentColor) || '#3b82f6'} 100%)`,
      color: (overlaySettings && overlaySettings.textColor) || '#ffffff'
    };

    switch (panelType) {
      case 'playerStats':
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8" style={panelStyle}>
            <div className="panel-card bg-white/10 backdrop-blur-xl rounded-3xl p-12 max-w-6xl w-full animate-fadeIn">
              <div className="text-center mb-12">
                <Users className="h-16 w-16 mx-auto mb-6 text-white" />
                <h2 className="text-5xl font-bold mb-4">PLAYER STATISTICS</h2>
                <div className="text-2xl opacity-80">{battingTeam.name} vs {bowlingTeam.name}</div>
              </div>
              
              <div className="grid grid-cols-3 gap-12">
                {/* Striker */}
                <div className="text-center">
                  <div className="bg-white/20 rounded-2xl p-8">
                    <div className="text-green-400 text-lg font-semibold mb-2">STRIKER</div>
                    <div className="text-3xl font-bold mb-4">{striker?.name || 'N/A'}</div>
                    <div className="space-y-3 text-xl">
                      <div>Runs: <span className="font-bold">{striker?.battingStats?.runs || 0}</span></div>
                      <div>Balls: <span className="font-bold">{striker?.battingStats?.balls || 0}</span></div>
                      <div>4s: <span className="font-bold">{striker?.battingStats?.fours || 0}</span></div>
                      <div>6s: <span className="font-bold">{striker?.battingStats?.sixes || 0}</span></div>
                      {striker?.battingStats?.balls && striker.battingStats.balls > 0 && (
                        <div>SR: <span className="font-bold">{((striker.battingStats.runs / striker.battingStats.balls) * 100).toFixed(1)}</span></div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Non-Striker */}
                <div className="text-center">
                  <div className="bg-white/20 rounded-2xl p-8">
                    <div className="text-blue-400 text-lg font-semibold mb-2">NON-STRIKER</div>
                    <div className="text-3xl font-bold mb-4">{nonStriker?.name || 'N/A'}</div>
                    <div className="space-y-3 text-xl">
                      <div>Runs: <span className="font-bold">{nonStriker?.battingStats?.runs || 0}</span></div>
                      <div>Balls: <span className="font-bold">{nonStriker?.battingStats?.balls || 0}</span></div>
                      <div>4s: <span className="font-bold">{nonStriker?.battingStats?.fours || 0}</span></div>
                      <div>6s: <span className="font-bold">{nonStriker?.battingStats?.sixes || 0}</span></div>
                      {nonStriker?.battingStats?.balls && nonStriker.battingStats.balls > 0 && (
                        <div>SR: <span className="font-bold">{((nonStriker.battingStats.runs / nonStriker.battingStats.balls) * 100).toFixed(1)}</span></div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bowler */}
                <div className="text-center">
                  <div className="bg-white/20 rounded-2xl p-8">
                    <div className="text-red-400 text-lg font-semibold mb-2">BOWLER</div>
                    <div className="text-3xl font-bold mb-4">{bowler?.name || 'N/A'}</div>
                    <div className="space-y-3 text-xl">
                      <div>Overs: <span className="font-bold">{Math.floor((bowler?.bowlingStats?.balls || 0) / 6)}.{(bowler?.bowlingStats?.balls || 0) % 6}</span></div>
                      <div>Runs: <span className="font-bold">{bowler?.bowlingStats?.runs || 0}</span></div>
                      <div>Wickets: <span className="font-bold">{bowler?.bowlingStats?.wickets || 0}</span></div>
                      {bowler?.bowlingStats?.balls && bowler.bowlingStats.balls > 0 && (
                        <div>Economy: <span className="font-bold">{((bowler.bowlingStats.runs / bowler.bowlingStats.balls) * 6).toFixed(2)}</span></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'runRate':
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8" style={panelStyle}>
            <div className="panel-card bg-white/10 backdrop-blur-xl rounded-3xl p-12 max-w-4xl w-full animate-fadeIn">
              <div className="text-center mb-12">
                <BarChart3 className="h-16 w-16 mx-auto mb-6 text-white" />
                <h2 className="text-5xl font-bold mb-4">RUN RATE ANALYSIS</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-12">
                <div className="text-center">
                  <div className="bg-white/20 rounded-2xl p-8">
                    <div className="text-2xl font-semibold mb-4">Current Run Rate</div>
                    <div className="text-6xl font-bold text-green-400 mb-4">{currentRunRate.toFixed(2)}</div>
                    <div className="text-xl opacity-80">Runs per over</div>
                  </div>
                </div>

                {match.currentInnings === 2 && innings.target && (
                  <div className="text-center">
                    <div className="bg-white/20 rounded-2xl p-8">
                      <div className="text-2xl font-semibold mb-4">Required Run Rate</div>
                      <div className="text-6xl font-bold text-red-400 mb-4">{requiredRunRate.toFixed(2)}</div>
                      <div className="text-xl opacity-80">To win the match</div>
                    </div>
                  </div>
                )}
              </div>

              {match.currentInnings === 2 && innings.target && (
                <div className="mt-12 text-center">
                  <div className="bg-white/20 rounded-2xl p-8">
                    <div className="text-3xl font-bold mb-4">
                      Need {innings.target - battingTeam.score} runs from {((innings.maxOvers || 20) - innings.overNumber) * 6 - innings.legalBallsInCurrentOver} balls
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'matchSummary':
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8" style={panelStyle}>
            <div className="panel-card bg-white/10 backdrop-blur-xl rounded-3xl p-12 max-w-5xl w-full animate-fadeIn">
              <div className="text-center mb-12">
                <Award className="h-16 w-16 mx-auto mb-6 text-white" />
                <h2 className="text-5xl font-bold mb-4">MATCH SUMMARY</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-12">
                <div className="text-center">
                  <div className="bg-white/20 rounded-2xl p-8">
                    <div className="text-2xl font-semibold mb-4">{match.teamA.name}</div>
                    <div className="text-5xl font-bold mb-4">{match.teamA.score}/{match.teamA.wickets}</div>
                    <div className="text-xl opacity-80">
                      {match.currentInnings === 1 && innings.battingTeam === 'A' ? 
                        `(${innings.overNumber}.${innings.legalBallsInCurrentOver})` :
                        match.innings1.battingTeam === 'A' ? 
                          `(${match.innings1.overNumber}.${match.innings1.legalBallsInCurrentOver})` : 
                          match.innings2 ? `(${match.innings2.overNumber}.${match.innings2.legalBallsInCurrentOver})` : ''
                      }
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <div className="bg-white/20 rounded-2xl p-8">
                    <div className="text-2xl font-semibold mb-4">{match.teamB.name}</div>
                    <div className="text-5xl font-bold mb-4">{match.teamB.score}/{match.teamB.wickets}</div>
                    <div className="text-xl opacity-80">
                      {match.currentInnings === 1 && innings.battingTeam === 'B' ? 
                        `(${innings.overNumber}.${innings.legalBallsInCurrentOver})` :
                        match.innings1.battingTeam === 'B' ? 
                          `(${match.innings1.overNumber}.${match.innings1.legalBallsInCurrentOver})` : 
                          match.innings2 ? `(${match.innings2.overNumber}.${match.innings2.legalBallsInCurrentOver})` : ''
                      }
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-12 text-center">
                <div className="bg-white/20 rounded-2xl p-8">
                  <div className="text-2xl font-semibold mb-4">Match Status</div>
                  <div className="text-3xl font-bold">
                    {match.currentInnings === 1 ? 
                      `${battingTeam.name} batting - Innings 1` :
                      `${battingTeam.name} batting - Innings 2`
                    }
                  </div>
                  {match.currentInnings === 2 && innings.target && (
                    <div className="text-xl mt-4 opacity-80">
                      Target: {innings.target} | Need: {innings.target - battingTeam.score} runs
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'comparison':
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8" style={panelStyle}>
            <div className="panel-card bg-white/10 backdrop-blur-xl rounded-3xl p-12 max-w-6xl w-full animate-fadeIn">
              <div className="text-center mb-12">
                <TrendingUp className="h-16 w-16 mx-auto mb-6 text-white" />
                <h2 className="text-5xl font-bold mb-4">TEAM COMPARISON</h2>
              </div>
              
              <div className="grid grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="bg-white/20 rounded-2xl p-8">
                    <div className="text-2xl font-semibold mb-4">Runs Scored</div>
                    <div className="space-y-4">
                      <div>
                        <div className="text-lg">{match.teamA.name}</div>
                        <div className="text-4xl font-bold text-blue-400">{match.teamA.score}</div>
                      </div>
                      <div>
                        <div className="text-lg">{match.teamB.name}</div>
                        <div className="text-4xl font-bold text-red-400">{match.teamB.score}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <div className="bg-white/20 rounded-2xl p-8">
                    <div className="text-2xl font-semibold mb-4">Wickets Lost</div>
                    <div className="space-y-4">
                      <div>
                        <div className="text-lg">{match.teamA.name}</div>
                        <div className="text-4xl font-bold text-blue-400">{match.teamA.wickets}</div>
                      </div>
                      <div>
                        <div className="text-lg">{match.teamB.name}</div>
                        <div className="text-4xl font-bold text-red-400">{match.teamB.wickets}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <div className="bg-white/20 rounded-2xl p-8">
                    <div className="text-2xl font-semibold mb-4">Extras</div>
                    <div className="space-y-4">
                      <div>
                        <div className="text-lg">{match.teamA.name}</div>
                        <div className="text-4xl font-bold text-blue-400">
                          {match.teamA.extras.wides + match.teamA.extras.noballs + match.teamA.extras.byes + match.teamA.extras.legbyes}
                        </div>
                      </div>
                      <div>
                        <div className="text-lg">{match.teamB.name}</div>
                        <div className="text-4xl font-bold text-red-400">
                          {match.teamB.extras.wides + match.teamB.extras.noballs + match.teamB.extras.byes + match.teamB.extras.legbyes}
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

  // Compact footer/ticker style for OBS overlay
  if (overlayMode) {
    return (
      <div className="relative">
        {/* Fullscreen panels */}
        {renderFullscreenPanel()}

        {/* Compact footer - only show if no fullscreen panel or if settings allow */}
  {(!showFullscreenPanel && !forcePanel && overlaySettings?.showOverlay) && (
          <div 
            className="fixed bottom-0 left-0 right-0 text-white shadow-2xl backdrop-blur-lg"
            style={{
              background: `linear-gradient(90deg, 
                ${getTeamAColor()}${Math.round(getTeamAOpacity() * 255).toString(16).padStart(2, '0')} 0%, 
                ${overlaySettings.primaryColor || '#1e3a8a'}${Math.round((overlaySettings.teamAOpacity || 0.9) * 255).toString(16).padStart(2, '0')} 25%, 
                ${overlaySettings.secondaryColor || '#1d4ed8'}${Math.round((overlaySettings.teamBOpacity || 0.9) * 255).toString(16).padStart(2, '0')} 75%, 
                ${getTeamBColor()}${Math.round(getTeamBOpacity() * 255).toString(16).padStart(2, '0')} 100%)`
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
                    {striker?.name || striker?.id || 'N/A'}
                  </div>
                  <div className="text-xs text-green-300 uppercase">
                    STRIKER · {striker?.battingStats?.runs || 0} ({striker?.battingStats?.balls || 0})
                  </div>
                </div>

                <div className="text-center min-w-0">
                  <div className="text-sm font-semibold text-white truncate">
                    {nonStriker?.name || nonStriker?.id || 'N/A'}
                  </div>
                  <div className="text-xs text-blue-300 uppercase">
                    NON-STRIKER · {nonStriker?.battingStats?.runs || 0} ({nonStriker?.battingStats?.balls || 0})
                  </div>
                </div>

                <div className="text-center min-w-0">
                  <div className="text-sm font-semibold text-white truncate">
                    {bowler?.name || bowler?.id || 'N/A'}
                  </div>
                  <div className="text-xs text-red-300 uppercase">
                    BOWLER · {Math.floor((bowler?.bowlingStats?.balls || 0) / 6)}.{(bowler?.bowlingStats?.balls || 0) % 6} - {bowler?.bowlingStats?.runs || 0}/{bowler?.bowlingStats?.wickets || 0}
                  </div>
                </div>
              </div>

              {/* Last 6 Balls */}
              <div className="flex items-center space-x-2 mx-6 flex-shrink-0">
                <div className="text-xs text-white/70 uppercase mr-2">This Over</div>
                {Array.from({ length: 6 }, (_, i) => {
                  const ball = lastSixBalls[i];
                  const isEmpty = !ball;
                  
                  return (
                    <div
                      key={i}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
                        isEmpty
                          ? 'bg-white/20 border-white/30 text-white/50'
                          : ball === 'W'
                          ? 'bg-red-600 border-red-400 text-white'
                          : ball === '4'
                          ? 'bg-green-600 border-green-400 text-white'
                          : ball === '6'
                          ? 'bg-purple-600 border-purple-400 text-white'
                          : 'bg-blue-600 border-blue-400 text-white'
                      }`}
                    >
                      {ball || '•'}
                    </div>
                  );
                })}
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
          </div>
        )}
      </div>
    );
  }

  // Regular display mode (non-overlay) - keeping your original compact design
  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-6">
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

        {/* Current Batsmen */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-green-600 font-medium mb-1">
              STRIKER
            </div>
            <div className="text-lg font-semibold text-gray-900 mb-1">{striker?.name}</div>
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
            <div className="text-sm text-blue-600 font-medium mb-1">
              NON-STRIKER
            </div>
            <div className="text-lg font-semibold text-gray-900 mb-1">{nonStriker?.name}</div>
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

        {/* Current Bowler */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="text-sm text-red-600 font-medium mb-1">
            BOWLER
          </div>
          <div className="text-lg font-semibold text-gray-900 mb-1">{bowler?.name}</div>
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

        {/* Last 6 Balls */}
        <div className="mb-6">
          <div className="text-sm text-gray-600 font-medium mb-2">
            LAST 6 BALLS
          </div>
          <div className="flex space-x-2">
            {Array.from({ length: 6 }, (_, i) => {
              const ball = lastSixBalls[i];
              const isEmpty = !ball;
              
              return (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    isEmpty
                      ? 'bg-gray-200 text-gray-400'
                      : ball === 'W'
                      ? 'bg-red-500 text-white'
                      : ball === '4'
                      ? 'bg-green-500 text-white'
                      : ball === '6'
                      ? 'bg-purple-500 text-white'
                      : 'bg-blue-500 text-white'
                  }`}
                >
                  {ball || '-'}
                </div>
              );
            })}
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