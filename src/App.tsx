import React, { useState, useEffect } from 'react';
import { MatchState, InningsState, Team, PlayerRef, User } from './types';
import { firebaseService, getPublicMatchFromFirebase, subscribeToPublicMatch, getOverlaySettingsForMatch, saveOverlaySettingsToFirebase } from './firebase';
import { LocalStorageManager } from './utils/localStorage';
import { MatchSetup } from './components/MatchSetup';
import { ScoreControls } from './components/ScoreControls';
import { ScoreDisplay } from './components/ScoreDisplay';
import { AuthModal } from './components/AuthModal';
import { OverlayControlPanel } from './components/OverlayControlPanel';
import { StylePanel } from './components/StylePanel';
import { Settings, Monitor, Users, Trophy, LogOut, Plus, Eye } from 'lucide-react';
import { PanelRouter } from './components/PanelRouter';

import { CricketScorer } from './cricketUtils';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [match, setMatch] = useState<MatchState | null>(null);
  const [matchStarted, setMatchStarted] = useState(false);
  const [overlayMode, setOverlayMode] = useState(false);
  const [userMatches, setUserMatches] = useState<MatchState[]>([]);
  const [showMatchList, setShowMatchList] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);

  // Real-time subscription for overlay mode
  useEffect(() => {
    if (!overlayMode || !match?.id) return;

    let unsubscribe: (() => void) | null = null;

    if (user) {
      unsubscribe = firebaseService.subscribeToMatch(match.id, (updatedMatch) => {
        if (updatedMatch) {
          setMatch(updatedMatch);
          setMatchStarted(updatedMatch.innings1.events.length > 0);
        }
      });
    } else {
      // For unauthenticated users, subscribe to public match data
      const setupPublicSubscription = async () => {
        const { subscribeToPublicMatchWithRetry } = await import('./firebase');
        unsubscribe = subscribeToPublicMatchWithRetry(match.id, (updatedMatch) => {
          if (updatedMatch) {
            setMatch(updatedMatch);
            setMatchStarted(updatedMatch.innings1.events.length > 0);
            LocalStorageManager.cacheMatch(match.id, updatedMatch);
          }
        });
      };
      
      setupPublicSubscription();
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [overlayMode, match?.id, user]);

  // Check for overlay mode in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const overlayParam = urlParams.get('overlay');
    const matchParam = urlParams.get('match');
    const panelParam = urlParams.get('panel');
    
    if (overlayParam === '1' || overlayParam === 'true') {
      setOverlayMode(true);
      document.body.style.backgroundColor = 'transparent';
    }

    if (panelParam) {
      setActivePanel(panelParam);
    }

    // Auto-load match if specified in URL (try cache first for overlay mode)
    if (matchParam) {
      if (user) {
        loadMatch(matchParam);
      } else if (overlayParam === '1' || overlayParam === 'true') {
        // If overlay URL and no user, try to load public match from Firebase
        const loadPublicMatch = async () => {
          const { getPublicMatchWithRetry } = await import('./firebase');
          const publicMatch = await getPublicMatchWithRetry(matchParam);
          if (publicMatch) {
            setMatch(publicMatch);
            setMatchStarted(publicMatch.innings1.events.length > 0);
          }
          // Also attempt to load overlay settings for this match
          const settings = await getOverlaySettingsForMatch(matchParam);
          if (settings) {
            console.log('Loaded overlay settings for match:', settings);
          }
        };
        
        loadPublicMatch();
      }
    }
  }, [user, overlayMode]);

  // Listen for auth changes
  useEffect(() => {
    firebaseService.onAuthStateChanged((user) => {
      setUser(user);
      if (user) {
        loadUserMatches();
        loadThemeSettings();
      }
    });
  }, []);

  // Load theme settings when user changes
  const loadThemeSettings = async () => {
    const user = firebaseService.getCurrentUser();
    if (!user) return;

    try {
      const themeSettings = await firebaseService.getThemeSettings(user.uid);
      
      if (themeSettings) {
        // Apply theme settings to overlay settings
        const overlaySettings = await getOverlaySettingsFromFirebase(user.uid);
        const mergedSettings = {
          ...overlaySettings,
          ...themeSettings,
          styleSettings: {
            ...overlaySettings.styleSettings,
            ...themeSettings
          }
        };
        
        // Save merged settings to Firebase for real-time access
        await saveOverlaySettingsToFirebase(user.uid, mergedSettings);
        
        // Publish to public for cross-network access
        if (match?.id) {
          const { publishOverlaySettingsToPublic } = await import('./firebase');
          await publishOverlaySettingsToPublic(match.id, mergedSettings);
        }
      }
    } catch (error) {
      console.error('Failed to load theme settings:', error);
    }
  };

  // Load theme settings when match starts
  useEffect(() => {
    if (matchStarted && user) {
      loadThemeSettings();
    }
  }, [matchStarted, user]);

  // Load user matches when user changes
  useEffect(() => {
    if (user) {
      loadUserMatches();
    }
  }, [user]);

  const createDefaultMatch = (): MatchState => {
    const defaultInnings: InningsState = {
      battingTeam: 'A',
      bowlingTeam: 'B',
      strikerId: '',
      nonStrikerId: '',
      nextBatterIndex: 2,
      bowlerId: '',
      overNumber: 0,
      legalBallsInCurrentOver: 0,
      freeHit: false,
      isComplete: false,
      events: []
    };

    const teamA: Team = {
      id: 'A',
      name: '',
      players: [],
      score: 0,
      wickets: 0,
      extras: { wides: 0, noballs: 0, byes: 0, legbyes: 0, penalties: 0 }
    };

    const teamB: Team = {
      id: 'B',
      name: '',
      players: [],
      score: 0,
      wickets: 0,
      extras: { wides: 0, noballs: 0, byes: 0, legbyes: 0, penalties: 0 }
    };

    return {
      id: '',
      teamA,
      teamB,
      currentInnings: 1,
      innings1: defaultInnings,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  };

  const createNewMatch = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    try {
      const newMatch = createDefaultMatch();
      const matchId = await firebaseService.createMatch(newMatch);
      newMatch.id = matchId;
      setMatch(newMatch);
      setMatchStarted(false);
      
      // Load and apply theme settings for new match
      await loadThemeSettings();
      
      loadUserMatches();
      
      // Update URL with new match ID
      const url = new URL(window.location.href);
      url.searchParams.set('match', matchId);
      window.history.replaceState({}, '', url.toString());
    } catch (error) {
      console.error('Failed to create match:', error);
    }
  };

  const loadMatch = async (matchId: string) => {
    if (!user) return;

    try {
      const loadedMatch = await firebaseService.getMatch(matchId);
      if (loadedMatch) {
        setMatch(loadedMatch);
        setMatchStarted(loadedMatch.innings1.events.length > 0);
        
        // Update URL
        const url = new URL(window.location.href);
        url.searchParams.set('match', matchId);
        window.history.replaceState({}, '', url.toString());
      }
    } catch (error) {
      console.error('Failed to load match:', error);
    }
  };

  const loadUserMatches = async () => {
    if (!user) return;

    try {
      const matches = await firebaseService.getUserMatches();
      const sortedMatches = matches.sort((a, b) => b.updatedAt - a.updatedAt);
      setUserMatches(sortedMatches);
      console.log('Loaded matches:', sortedMatches.length); // Debug log
    } catch (error) {
      console.error('Failed to load matches:', error);
    }
  };

  const startMatch = () => {
    if (!match || !match.teamA.name || !match.teamB.name || 
        match.teamA.players.length < 2 || match.teamB.players.length < 2) {
      alert('Please complete match setup before starting');
      return;
    }

    // Set up innings based on toss result
    const updatedMatch = { ...match };
    if (match.tossWinner && match.elected) {
      const battingFirst = (match.tossWinner === 'A' && match.elected === 'bat') || 
                          (match.tossWinner === 'B' && match.elected === 'bowl') ? 'A' : 'B';
      
      updatedMatch.innings1.battingTeam = battingFirst;
      updatedMatch.innings1.bowlingTeam = battingFirst === 'A' ? 'B' : 'A';
      
      // Set opening players
      const battingTeam = battingFirst === 'A' ? updatedMatch.teamA : updatedMatch.teamB;
      const bowlingTeam = battingFirst === 'A' ? updatedMatch.teamB : updatedMatch.teamA;
      
      if (battingTeam.players.length >= 2) {
        updatedMatch.innings1.strikerId = battingTeam.players[0].id;
        updatedMatch.innings1.nonStrikerId = battingTeam.players[1].id;
      }
      
      if (bowlingTeam.players.length >= 1) {
        updatedMatch.innings1.bowlerId = bowlingTeam.players[0].id;
      }
    }

    setMatch(updatedMatch);
    setMatchStarted(true);
    updateMatch(updatedMatch);
  };

  const updateMatch = async (updatedMatch: MatchState) => {
    setMatch(updatedMatch);
    updatedMatch.updatedAt = Date.now();
    
    // Update match result
    CricketScorer.updateMatchResult(updatedMatch);
    
    if (user && updatedMatch.id) {
      try {
        await firebaseService.updateMatch(updatedMatch.id, updatedMatch);
        
        // CRITICAL: Always publish to public path for OBS overlay access
        // This ensures unauthenticated users on different networks can access the match
        const { publishMatchToPublic, publishOverlaySettingsToPublic } = await import('./firebase');
        await publishMatchToPublic(updatedMatch);
        
        // Get and publish current overlay settings to public path
        const overlaySettings = await getOverlaySettingsFromFirebase(user.uid);
        await publishOverlaySettingsToPublic(updatedMatch.id, overlaySettings);
        
      } catch (error) {
        console.error('Failed to update match:', error);
      }
    } else {
      // For unauthenticated users, still try to publish to public if possible
      try {
        const { publishMatchToPublic } = await import('./firebase');
        await publishMatchToPublic(updatedMatch);
      } catch (error) {
        console.error('Failed to publish match for unauthenticated user:', error);
      }
    }
  };

  const handleOverlaySettingsUpdate = (settings: any) => {
    // Handle overlay settings updates
    console.log('Overlay settings updated:', settings);
    // You can add additional logic here to handle overlay settings
  };

  const handleEndInnings = () => {
    if (!match) return;

    const updatedMatch = { ...match };
    
    if (match.currentInnings === 1) {
      // End first innings, start second
      updatedMatch.innings1.isComplete = true;
      
      // Set target for second innings
      const firstInningsScore = updatedMatch.innings1.battingTeam === 'A' ? 
        updatedMatch.teamA.score : updatedMatch.teamB.score;
      
      // Create second innings
      updatedMatch.innings2 = {
        battingTeam: updatedMatch.innings1.bowlingTeam,
        bowlingTeam: updatedMatch.innings1.battingTeam,
        strikerId: '',
        nonStrikerId: '',
        nextBatterIndex: 2,
        bowlerId: '',
        overNumber: 0,
        legalBallsInCurrentOver: 0,
        freeHit: false,
        maxOvers: updatedMatch.innings1.maxOvers,
        isComplete: false,
        target: firstInningsScore + 1,
        events: []
      };
      
      // Set opening players for second innings
      const newBattingTeam = updatedMatch.innings2.battingTeam === 'A' ? updatedMatch.teamA : updatedMatch.teamB;
      const newBowlingTeam = updatedMatch.innings2.bowlingTeam === 'A' ? updatedMatch.teamA : updatedMatch.teamB;
      
      if (newBattingTeam.players.length >= 2) {
        updatedMatch.innings2.strikerId = newBattingTeam.players[0].id;
        updatedMatch.innings2.nonStrikerId = newBattingTeam.players[1].id;
      }
      
      if (newBowlingTeam.players.length >= 1) {
        updatedMatch.innings2.bowlerId = newBowlingTeam.players[0].id;
      }
      
      updatedMatch.currentInnings = 2;
    } else {
      // End second innings (match complete)
      if (updatedMatch.innings2) {
        updatedMatch.innings2.isComplete = true;
      }
    }
    
    updateMatch(updatedMatch);
  };

  const generateOBSUrl = () => {
    const currentUrl = window.location.origin + window.location.pathname;
    const obsUrl = `${currentUrl}?overlay=1&match=${match?.id}`;
    navigator.clipboard.writeText(obsUrl);
    alert('OBS URL copied to clipboard!');
  };

  const signOut = async () => {
    try {
      await firebaseService.signOut();
      setUser(null);
      setMatch(null);
      setMatchStarted(false);
      setUserMatches([]);
      
      // Clear URL parameters
      window.history.replaceState({}, '', window.location.pathname);
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const toggleOverlayMode = () => {
    const newOverlayMode = !overlayMode;
    setOverlayMode(newOverlayMode);
    
    const url = new URL(window.location.href);
    if (newOverlayMode) {
      url.searchParams.set('overlay', '1');
      document.body.style.backgroundColor = 'transparent';
    } else {
      url.searchParams.delete('overlay');
      document.body.style.backgroundColor = '';
    }
    window.history.replaceState({}, '', url.toString());
  };

  // Overlay Mode - Show only scoreboard
  if (overlayMode) {
    // If specific panel is requested, show only that panel
    if (activePanel) {
      return <PanelRouter panel={activePanel} match={match} />;
    }

    return (
      <div className="min-h-screen bg-transparent">
        {match ? (
          <div className="p-4">
            <ScoreDisplay match={match} overlayMode={true} />
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-screen">
            <div className="bg-black/80 text-white p-8 rounded-lg text-center">
              <Monitor className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h2 className="text-2xl font-bold mb-2">Waiting for Match</h2>
              <p className="text-gray-300">No active match to display</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show auth modal if no user
  if (!user && showAuthModal) {
    return <AuthModal onClose={() => setShowAuthModal(false)} onAuth={setUser} />;
  }

  return (
    <div className="min-h-screen bg-gray-100" style={{ minHeight: '100vh', width: '100vw' }}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Trophy className="h-8 w-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">CricketZCore</h1>
              </div>
              {match && (
                <div className="text-sm text-gray-600">
                  {match.teamA.name || 'Team A'} vs {match.teamB.name || 'Team B'}
                  {match.innings1.maxOvers && ` • ${match.innings1.maxOvers} Overs`}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {match && matchStarted && (
                <>
                  <button
                    onClick={generateOBSUrl}
                    className="flex items-center space-x-1 px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                  >
                    <Monitor className="h-4 w-4" />
                    <span>OBS URL</span>
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        // Publish to public_matches for cross-network OBS access
                        const mod = await import('./firebase');
                        if (match && match.id) {
                          await mod.publishMatchToPublic(match);
                          
                          // Also publish overlay settings
                          const overlaySettings = LocalStorageManager.getOverlaySettings();
                          await mod.publishOverlaySettingsToPublic(match.id, overlaySettings);
                          
                          const url = `${window.location.origin}${window.location.pathname}?overlay=1&match=${match.id}`;
                          navigator.clipboard.writeText(url);
                          alert('Match published for cross-network access! OBS URL copied to clipboard.');
                        }
                      } catch (e) {
                        console.error(e);
                        alert('Failed to publish match for cross-network access');
                      }
                    }}
                    className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    <Monitor className="h-4 w-4" />
                    <span>Share for OBS</span>
                  </button>
                  <button
                    onClick={toggleOverlayMode}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Overlay Mode</span>
                  </button>
                </>
              )}

              {user && (
                <>
                  <button
                    onClick={() => setShowMatchList(!showMatchList)}
                    className="flex items-center space-x-1 px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    <Users className="h-4 w-4" />
                    <span>Matches</span>
                  </button>
                  <button
                    onClick={() => setShowNavigation(!showNavigation)}
                    className="flex items-center space-x-1 px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Panels</span>
                  </button>
                  <button
                    onClick={() => setShowStylePanel(true)}
                    className="flex items-center space-x-1 px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Styles</span>
                  </button>
                  <button
                    onClick={createNewMatch}
                    className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    <Plus className="h-4 w-4" />
                    <span>New Match</span>
                  </button>
                </>
              )}

              {user ? (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {user.displayName || user.email || 'Anonymous'}
                  </span>
                  <button
                    onClick={signOut}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Sidebar */}
      {showNavigation && user && match && (
        <div className="fixed left-0 top-16 h-full w-80 bg-white shadow-lg z-40 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Panel Channels</h3>
              <button
                onClick={() => setShowNavigation(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Main Overlay</h4>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}${window.location.pathname}?overlay=1&match=${match.id}`;
                    navigator.clipboard.writeText(url);
                    alert('Main overlay URL copied!');
                  }}
                  className="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                >
                  Copy Main Overlay URL
                </button>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Individual Panels</h4>
                <div className="space-y-2">
                  {[
                    { key: 'playerStats', name: 'Player Statistics', icon: '👥' },
                    { key: 'runRate', name: 'Run Rate Analysis', icon: '📊' },
                    { key: 'matchSummary', name: 'Match Summary', icon: '🏆' },
                    { key: 'comparison', name: 'Team Comparison', icon: '📈' },
                    { key: 'wicketFall', name: 'Wicket Fall Chart', icon: '📉' },
                    { key: 'batsmanSummary', name: 'Batsman Summary', icon: '🏏' },
                    { key: 'bowlerSummary', name: 'Bowler Summary', icon: '⚡' },
                    { key: 'winner', name: 'Winner Panel', icon: '👑' }
                  ].map((panel) => (
                    <button
                      key={panel.key}
                      onClick={() => {
                        const url = `${window.location.origin}${window.location.pathname}?overlay=1&panel=${panel.key}&match=${match.id}`;
                        navigator.clipboard.writeText(url);
                        alert(`${panel.name} URL copied!`);
                      }}
                      className="w-full flex items-center space-x-2 bg-white border border-gray-200 px-3 py-2 rounded text-sm hover:bg-gray-50"
                    >
                      <span>{panel.icon}</span>
                      <span className="flex-1 text-left">{panel.name}</span>
                      <span className="text-xs text-gray-500">Copy URL</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Team Themes</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      {match.teamA.name || 'Team A'} Theme
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="color"
                        className="w-12 h-8 rounded border"
                        onChange={async (e) => {
                          if (user) {
                            const settings = await getOverlaySettingsFromFirebase(user.uid);
                            settings.teamAColor = e.target.value;
                            await saveOverlaySettingsToFirebase(user.uid, settings);
                            const { publishOverlaySettingsToPublic } = await import('./firebase');
                            await publishOverlaySettingsToPublic(match.id, settings);
                          }
                        }}
                      />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        className="flex-1"
                        onChange={async (e) => {
                          if (user) {
                            const settings = await getOverlaySettingsFromFirebase(user.uid);
                            settings.teamAOpacity = parseFloat(e.target.value);
                            await saveOverlaySettingsToFirebase(user.uid, settings);
                            const { publishOverlaySettingsToPublic } = await import('./firebase');
                            await publishOverlaySettingsToPublic(match.id, settings);
                          }
                        }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      {match.teamB.name || 'Team B'} Theme
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="color"
                        className="w-12 h-8 rounded border"
                        onChange={async (e) => {
                          if (user) {
                            const settings = await getOverlaySettingsFromFirebase(user.uid);
                            settings.teamBColor = e.target.value;
                            await saveOverlaySettingsToFirebase(user.uid, settings);
                            const { publishOverlaySettingsToPublic } = await import('./firebase');
                            await publishOverlaySettingsToPublic(match.id, settings);
                          }
                        }}
                      />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        className="flex-1"
                        onChange={async (e) => {
                          if (user) {
                            const settings = await getOverlaySettingsFromFirebase(user.uid);
                            settings.teamBOpacity = parseFloat(e.target.value);
                            await saveOverlaySettingsToFirebase(user.uid, settings);
                            const { publishOverlaySettingsToPublic } = await import('./firebase');
                            await publishOverlaySettingsToPublic(match.id, settings);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Match List Dropdown */}
      {showMatchList && user && (
        <div className="absolute right-4 top-16 mt-2 w-80 bg-white rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Your Matches</h3>
            {userMatches.length === 0 ? (
              <p className="text-gray-500 text-sm">No matches found</p>
            ) : (
              <div className="space-y-2">
                {userMatches.slice(0, 10).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      loadMatch(m.id);
                      setShowMatchList(false);
                    }}
                    className="w-full text-left p-3 rounded hover:bg-gray-50 border"
                  >
                    <div className="font-medium">
                      {m.teamA.name || 'Team A'} vs {m.teamB.name || 'Team B'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(m.updatedAt).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-6" style={{ maxWidth: 'none' }}>
        {!user ? (
          <div className="text-center py-12">
            <Trophy className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to CricketZCore</h2>
            <p className="text-gray-600 mb-8">Professional cricket scoring with OBS overlay support</p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
            >
              Get Started
            </button>
          </div>
        ) : !match ? (
          <div className="space-y-8">
            {/* Recent Matches */}
            {userMatches.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Your Recent Matches</h2>
                  <button
                    onClick={createNewMatch}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700"
                  >
                    Create New Match
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userMatches.slice(0, 6).map((m) => (
                    <div
                      key={m.id}
                      className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => loadMatch(m.id)}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-lg text-gray-900">
                            {m.teamA.name || 'Team A'} vs {m.teamB.name || 'Team B'}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {new Date(m.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <>
                            <div className="text-lg font-bold text-gray-900">
                              {m.teamA.score}/{m.teamA.wickets}
                            </div>
                            <div className="text-sm text-gray-500">
                              vs {m.teamB.score}/{m.teamB.wickets}
                            </div>
                          </>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 font-mono">
                        ID: {m.id}
                      </div>
                      <div className="mt-3 flex justify-between items-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          m.innings1.events.length > 0 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {m.innings1.events.length > 0 ? 'In Progress' : 'Not Started'}
                        </span>
                        {m.innings1.maxOvers && (
                          <span className="text-sm text-gray-600">
                            {m.innings1.maxOvers} Overs
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Create First Match */}
            {userMatches.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your First Match</h2>
                <p className="text-gray-600 mb-8">Set up teams, players, and start scoring</p>
                <button
                  onClick={createNewMatch}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700"
                >
                  Create New Match
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
            {/* Left Panel - Controls */}
            <div className="xl:col-span-1 space-y-6">
              {!matchStarted ? (
                <MatchSetup 
                  match={match} 
                  onUpdateMatch={updateMatch}
                  onStartMatch={startMatch}
                />
              ) : (
                <>
                  <ScoreControls 
                    match={match}
                    onUpdateMatch={updateMatch}
                  />
                  <OverlayControlPanel
                    match={match}
                    onUpdateOverlaySettings={handleOverlaySettingsUpdate}
                    onEndInnings={handleEndInnings}
                  />
                </>
              )}
            </div>

            {/* Right Panel - Display */}
            <div className="xl:col-span-2 space-y-6">
              {matchStarted && (
                <ScoreDisplay match={match} />
              )}
              
              {/* Live Preview */}
              {matchStarted && (
                <div className="bg-white rounded-lg shadow-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center space-x-2">
                      <Eye className="h-5 w-5 text-blue-600" />
                      <span>Live Overlay Preview</span>
                    </h3>
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      {showPreview ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  
                  {showPreview && (
                    <div className="bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-300">
                      <div className="relative" style={{ paddingBottom: '56.25%' }}>
                        <iframe
                          src={`${window.location.origin}${window.location.pathname}?overlay=1&match=${match?.id}&preview=1`}
                          className="absolute inset-0 w-full h-full border-0"
                          style={{ transform: 'scale(1)', transformOrigin: 'top left' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)} 
          onAuth={setUser}
        />
      )}

      {/* Style Panel */}
      {showStylePanel && (
        <StylePanel 
          onClose={() => setShowStylePanel(false)}
          matchId={match?.id}
        />
      )}
    </div>
  );
}

export default App;