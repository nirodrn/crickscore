import React, { useState, useEffect } from 'react';
import { MatchState, PlayerRef } from '../types';
import { firebaseService } from '../firebase';
import { ImageUploadComponent } from './ImageUploadComponent';
import { Users, Trophy, Settings, Plus, Upload, X, Crown, Shield, Target, Zap, CheckCircle, AlertCircle, User } from 'lucide-react';

interface MatchSetupProps {
  match: MatchState;
  onUpdateMatch: (match: MatchState) => void;
  onStartMatch: () => void;
}

export const MatchSetup: React.FC<MatchSetupProps> = ({ match, onUpdateMatch, onStartMatch }) => {
  const [activeTab, setActiveTab] = useState<'setup' | 'teamA' | 'teamB'>('setup');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRoles, setNewPlayerRoles] = useState<string[]>([]);
  const [newPlayerImageUrl, setNewPlayerImageUrl] = useState('');
  const [savedPlayers, setSavedPlayers] = useState<PlayerRef[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'T20' | 'ODI' | 'Test' | 'Custom' | null>(null);
  const [customOvers, setCustomOvers] = useState<number | undefined>(undefined);
  const [customBallsPerOver, setCustomBallsPerOver] = useState<number>(6);

  // Load saved players from Firebase
  useEffect(() => {
    const loadSavedPlayers = async () => {
      const user = firebaseService.getCurrentUser();
      if (!user) return;

      setLoadingPlayers(true);
      try {
        const players = await firebaseService.getPlayersFromDatabase(user.uid);
        setSavedPlayers(players);
      } catch (error) {
        console.error('Failed to load saved players:', error);
      } finally {
        setLoadingPlayers(false);
      }
    };

    loadSavedPlayers();
  }, []);

  const updateMatchField = (field: string, value: any) => {
    const updatedMatch = { ...match };
    
    if (field.startsWith('teamA.')) {
      const teamField = field.replace('teamA.', '');
      updatedMatch.teamA = { ...updatedMatch.teamA, [teamField]: value };
    } else if (field.startsWith('teamB.')) {
      const teamField = field.replace('teamB.', '');
      updatedMatch.teamB = { ...updatedMatch.teamB, [teamField]: value };
    } else if (field.startsWith('innings1.')) {
      const inningsField = field.replace('innings1.', '');
      updatedMatch.innings1 = { ...updatedMatch.innings1, [inningsField]: value };
    } else {
      (updatedMatch as any)[field] = value;
    }
    
    onUpdateMatch(updatedMatch);
  };

  const addPlayer = async (teamId: 'A' | 'B') => {
    if (!newPlayerName.trim()) return;

    const user = firebaseService.getCurrentUser();
    if (!user) {
      alert('Please sign in to add players');
      return;
    }

    try {
      const newPlayer: PlayerRef = {
        id: `${teamId}_${Date.now()}`,
        name: newPlayerName.trim(),
        roles: newPlayerRoles.length > 0 ? newPlayerRoles as any : undefined,
        imageUrl: newPlayerImageUrl.trim() || undefined,
        canBowl: newPlayerRoles.includes('Bowler') || newPlayerRoles.length === 0,
        canBat: newPlayerRoles.includes('Batter') || newPlayerRoles.length === 0,
        canKeep: newPlayerRoles.includes('Wicketkeeper')
      };

      // Save player to Firebase database
      await firebaseService.savePlayerToDatabase(user.uid, newPlayer);

      // Add to current match
      const updatedMatch = { ...match };
      if (teamId === 'A') {
        updatedMatch.teamA = {
          ...updatedMatch.teamA,
          players: [...(updatedMatch.teamA?.players || []), newPlayer]
        };
      } else {
        updatedMatch.teamB = {
          ...updatedMatch.teamB,
          players: [...(updatedMatch.teamB?.players || []), newPlayer]
        };
      }

      onUpdateMatch(updatedMatch);

      // Reset form
      setNewPlayerName('');
      setNewPlayerRoles([]);
      setNewPlayerImageUrl('');

      // Refresh saved players list
      const players = await firebaseService.getPlayersFromDatabase(user.uid);
      setSavedPlayers(players);

    } catch (error) {
      console.error('Failed to add player:', error);
      alert('Failed to add player. Please try again.');
    }
  };

  const addSavedPlayer = (player: PlayerRef, teamId: 'A' | 'B') => {
    const newPlayer = {
      ...player,
      id: `${teamId}_${Date.now()}` // Generate new ID for this match
    };

    const updatedMatch = { ...match };
    if (teamId === 'A') {
      updatedMatch.teamA = {
        ...updatedMatch.teamA,
        players: [...(updatedMatch.teamA?.players || []), newPlayer]
      };
    } else {
      updatedMatch.teamB = {
        ...updatedMatch.teamB,
        players: [...(updatedMatch.teamB?.players || []), newPlayer]
      };
    }

    onUpdateMatch(updatedMatch);
  };

  const removePlayer = (teamId: 'A' | 'B', playerId: string) => {
    const updatedMatch = { ...match };
    if (teamId === 'A') {
      updatedMatch.teamA = {
        ...updatedMatch.teamA,
        players: (updatedMatch.teamA?.players || []).filter(p => p.id !== playerId)
      };
    } else {
      updatedMatch.teamB = {
        ...updatedMatch.teamB,
        players: (updatedMatch.teamB?.players || []).filter(p => p.id !== playerId)
      };
    }
    onUpdateMatch(updatedMatch);
  };

  const toggleRole = (role: string) => {
    setNewPlayerRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const selectFormat = (format: 'T20' | 'ODI' | 'Test' | 'Custom') => {
    setSelectedFormat(format);
    if (format === 'Custom') {
      setCustomOvers(undefined);
      setCustomBallsPerOver(6);
    } else {
      const maxOvers = format === 'T20' ? 20 : format === 'ODI' ? 50 : format === 'Test' ? undefined : undefined;
      setCustomOvers(maxOvers);
      setCustomBallsPerOver(6); // Standard 6 balls per over for all formats
    }
  };

  const confirmMatchFormat = () => {
    if (!selectedFormat) return;
    
    updateMatchField('innings1.maxOvers', customOvers);
    updateMatchField('innings1.ballsPerOver', customBallsPerOver);
    if (selectedFormat !== 'Custom') {
      updateMatchField('tournamentName', `${selectedFormat} Match`);
    }
    
    // Clear selection after confirmation
    setSelectedFormat(null);
    setCustomOvers(undefined);
    setCustomBallsPerOver(6);
  };

  const canStartMatch = () => {
    return match.teamA.name && 
           match.teamB.name && 
           match.teamA.players.length >= 2 && 
           match.teamB.players.length >= 2 &&
           match.tossWinner &&
           match.elected &&
           match.innings1.strikerId &&
           match.innings1.nonStrikerId &&
           match.innings1.bowlerId &&
           match.innings1.strikerId !== match.innings1.nonStrikerId;
  };

  const getSetupProgress = () => {
    let completed = 0;
    let total = 9;
    
    if (match.teamA.name) completed++;
    if (match.teamB.name) completed++;
    if (match.teamA.players.length >= 2) completed++;
    if (match.teamB.players.length >= 2) completed++;
    if (match.tossWinner) completed++;
    if (match.elected) completed++;
    if (match.innings1.strikerId) completed++;
    if (match.innings1.nonStrikerId) completed++;
    if (match.innings1.bowlerId) completed++;
    
    return { completed, total, percentage: (completed / total) * 100 };
  };

  const progress = getSetupProgress();

  return (
    <div className="bg-white rounded-xl shadow-xl overflow-hidden">
      {/* Header with Progress */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 rounded-full p-3">
              <Trophy className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Match Setup</h2>
              <p className="text-blue-100">Configure your cricket match</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-blue-100 mb-1">Setup Progress</div>
            <div className="text-2xl font-bold">{progress.completed}/{progress.total}</div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          {[
            { id: 'setup', label: 'Match Details', icon: Settings },
            { id: 'teamA', label: match.teamA.name || 'Team A', icon: Users },
            { id: 'teamB', label: match.teamB.name || 'Team B', icon: Users }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center space-x-2 py-4 px-6 font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-8">
        {activeTab === 'setup' && (
          <div className="space-y-8">
            {/* Match Format Selection */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <Target className="h-6 w-6 text-blue-600" />
                <span>Match Format</span>
              </h3>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { format: 'T20', overs: 20, description: '20 Overs per side' },
                  { format: 'ODI', overs: 50, description: '50 Overs per side' },
                  { format: 'Test', overs: null, description: 'Unlimited overs' },
                  { format: 'Custom', overs: null, description: 'Set custom overs' }
                ].map((fmt) => (
                  <button
                    key={fmt.format}
                    onClick={() => selectFormat(fmt.format as any)}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                      selectedFormat === fmt.format
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-bold text-lg">{fmt.format}</div>
                    <div className="text-sm text-gray-600">{fmt.description}</div>
                  </button>
                ))}
              </div>

              {selectedFormat === 'Custom' && (
                <div className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Custom Overs per Innings
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={customOvers || ''}
                        onChange={(e) => setCustomOvers(parseInt(e.target.value) || undefined)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter number of overs"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Balls per Over
                      </label>
                      <select
                        value={customBallsPerOver}
                        onChange={(e) => setCustomBallsPerOver(parseInt(e.target.value))}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      >
                        <option value={4}>4 Balls per Over</option>
                        <option value={5}>5 Balls per Over</option>
                        <option value={6}>6 Balls per Over (Standard)</option>
                        <option value={8}>8 Balls per Over</option>
                        <option value={10}>10 Balls per Over</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Standard cricket uses 6 balls per over
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedFormat && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={confirmMatchFormat}
                    disabled={selectedFormat === 'Custom' && (!customOvers || !customBallsPerOver)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    Confirm {selectedFormat} Format
                    {selectedFormat === 'Custom' && customOvers && ` (${customOvers} Overs, ${customBallsPerOver} Balls)`}
                    {selectedFormat !== 'Custom' && customOvers !== undefined && ` (${customOvers || 'Unlimited'} Overs, 6 Balls)`}
                  </button>
                </div>
              )}

              {match.innings1.maxOvers !== undefined && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-green-800">
                        Format Confirmed: {match.tournamentName || 'Custom Match'}
                      </div>
                      <div className="text-sm text-green-600">
                        {match.innings1.maxOvers ? `${match.innings1.maxOvers} overs per innings` : 'Unlimited overs'}
                        {match.innings1.ballsPerOver && match.innings1.ballsPerOver !== 6 && ` • ${match.innings1.ballsPerOver} balls per over`}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        updateMatchField('innings1.maxOvers', undefined);
                        updateMatchField('innings1.ballsPerOver', undefined);
                        updateMatchField('tournamentName', undefined);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 underline"
                    >
                      Change Format
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Team Names */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
                <h3 className="text-lg font-bold text-blue-900 mb-4">Team A Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-2">Team Name</label>
                    <input
                      type="text"
                      value={match.teamA.name}
                      onChange={(e) => updateMatchField('teamA.name', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter team name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-2">Team Logo URL</label>
                    <ImageUploadComponent
                      onImageUploaded={(url) => updateMatchField('teamA.logoUrl', url)}
                      currentImageUrl={match.teamA.logoUrl}
                      placeholder="Upload team logo or enter URL"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6">
                <h3 className="text-lg font-bold text-red-900 mb-4">Team B Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-red-800 mb-2">Team Name</label>
                    <input
                      type="text"
                      value={match.teamB.name}
                      onChange={(e) => updateMatchField('teamB.name', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter team name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-red-800 mb-2">Team Logo URL</label>
                    <ImageUploadComponent
                      onImageUploaded={(url) => updateMatchField('teamB.logoUrl', url)}
                      currentImageUrl={match.teamB.logoUrl}
                      placeholder="Upload team logo or enter URL"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tournament Name */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6">
              <h3 className="text-lg font-bold text-purple-900 mb-4">Tournament Information</h3>
              <div>
                <label className="block text-sm font-medium text-purple-800 mb-2">Tournament Name</label>
                <input
                  type="text"
                  value={match.tournamentName || ''}
                  onChange={(e) => updateMatchField('tournamentName', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  placeholder="e.g., IPL 2024, World Cup, Local Tournament"
                />
              </div>
            </div>

            {/* Toss */}
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6">
              <h3 className="text-lg font-bold text-yellow-900 mb-4 flex items-center space-x-2">
                <Crown className="h-6 w-6 text-yellow-600" />
                <span>Toss Result</span>
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-yellow-800 mb-3">Toss Winner</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => updateMatchField('tossWinner', 'A')}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                        match.tossWinner === 'A'
                          ? 'border-yellow-500 bg-yellow-200 text-yellow-800 shadow-lg'
                          : 'border-gray-200 hover:border-yellow-300'
                      }`}
                    >
                      <Crown className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
                      <div className="font-bold">{match.teamA.name || 'Team A'}</div>
                    </button>
                    <button
                      onClick={() => updateMatchField('tossWinner', 'B')}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                        match.tossWinner === 'B'
                          ? 'border-yellow-500 bg-yellow-200 text-yellow-800 shadow-lg'
                          : 'border-gray-200 hover:border-yellow-300'
                      }`}
                    >
                      <Crown className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
                      <div className="font-bold">{match.teamB.name || 'Team B'}</div>
                    </button>
                  </div>
                </div>

                {match.tossWinner && (
                  <div>
                    <label className="block text-sm font-medium text-yellow-800 mb-3">Elected to</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => updateMatchField('elected', 'bat')}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                          match.elected === 'bat'
                            ? 'border-green-500 bg-green-100 text-green-800 shadow-lg'
                            : 'border-gray-200 hover:border-green-300'
                        }`}
                      >
                        <Target className="h-6 w-6 mx-auto mb-2 text-green-600" />
                        <div className="font-bold">Bat First</div>
                      </button>
                      <button
                        onClick={() => updateMatchField('elected', 'bowl')}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                          match.elected === 'bowl'
                            ? 'border-blue-500 bg-blue-100 text-blue-800 shadow-lg'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <Zap className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                        <div className="font-bold">Bowl First</div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Opening Players Selection */}
            {match.tossWinner && match.elected && (
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6">
                <h3 className="text-xl font-bold text-emerald-900 mb-4 flex items-center space-x-2">
                  <Users className="h-6 w-6 text-emerald-600" />
                  <span>Select Opening Players</span>
                </h3>
                
                {(() => {
                  const battingFirst = (match.tossWinner === 'A' && match.elected === 'bat') || 
                                     (match.tossWinner === 'B' && match.elected === 'bowl') ? 'A' : 'B';
                  const battingTeam = battingFirst === 'A' ? match.teamA : match.teamB;
                  const bowlingTeam = battingFirst === 'A' ? match.teamB : match.teamA;
                  
                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Striker Selection */}
                      <div>
                        <label className="block text-sm font-medium text-emerald-800 mb-2">
                          Opening Striker ({battingTeam.name})
                        </label>
                        <select
                          value={match.innings1.strikerId || ''}
                          onChange={(e) => updateMatchField('innings1.strikerId', e.target.value)}
                          className="w-full px-4 py-3 border-2 border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                        >
                          <option value="">Select Striker</option>
                          {battingTeam.players.map((player) => (
                            <option key={player.id} value={player.id}>
                              {player.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Non-Striker Selection */}
                      <div>
                        <label className="block text-sm font-medium text-emerald-800 mb-2">
                          Opening Non-Striker ({battingTeam.name})
                        </label>
                        <select
                          value={match.innings1.nonStrikerId || ''}
                          onChange={(e) => updateMatchField('innings1.nonStrikerId', e.target.value)}
                          className="w-full px-4 py-3 border-2 border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                        >
                          <option value="">Select Non-Striker</option>
                          {battingTeam.players
                            .filter(player => player.id !== match.innings1.strikerId)
                            .map((player) => (
                              <option key={player.id} value={player.id}>
                                {player.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Opening Bowler Selection */}
                      <div>
                        <label className="block text-sm font-medium text-emerald-800 mb-2">
                          Opening Bowler ({bowlingTeam.name})
                        </label>
                        <select
                          value={match.innings1.bowlerId || ''}
                          onChange={(e) => updateMatchField('innings1.bowlerId', e.target.value)}
                          className="w-full px-4 py-3 border-2 border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                        >
                          <option value="">Select Opening Bowler</option>
                          {bowlingTeam.players
                            .filter(player => player.canBowl !== false && (player.roles?.includes('Bowler') || !player.roles || player.roles.length === 0 || player.canBowl === true))
                            .map((player) => (
                              <option key={player.id} value={player.id}>
                                {player.name}
                                {player.roles && player.roles.length > 0 && ` (${player.roles.join(', ')})`}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  );
                })()}
                
                {/* Player Selection Status */}
                <div className="mt-4 p-4 bg-white/50 rounded-lg">
                  <div className="text-sm text-emerald-800">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        {match.innings1.strikerId ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span>Striker Selected</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {match.innings1.nonStrikerId ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span>Non-Striker Selected</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {match.innings1.bowlerId ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span>Bowler Selected</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Setup Checklist */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-6">
              <h3 className="text-lg font-bold text-green-900 mb-4">Setup Checklist</h3>
              <div className="space-y-3">
                {[
                  { label: 'Team A Name', completed: !!match.teamA.name },
                  { label: 'Team B Name', completed: !!match.teamB.name },
                  { label: 'Team A Players (min 2)', completed: match.teamA.players.length >= 2 },
                  { label: 'Team B Players (min 2)', completed: match.teamB.players.length >= 2 },
                  { label: 'Toss Winner', completed: !!match.tossWinner },
                  { label: 'Elected Decision', completed: !!match.elected },
                  { label: 'Opening Striker', completed: !!match.innings1.strikerId },
                  { label: 'Opening Non-Striker', completed: !!match.innings1.nonStrikerId },
                  { label: 'Opening Bowler', completed: !!match.innings1.bowlerId }
                ].map((item, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    {item.completed ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-gray-400" />
                    )}
                    <span className={`font-medium ${item.completed ? 'text-green-800' : 'text-gray-600'}`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {(activeTab === 'teamA' || activeTab === 'teamB') && (
          <div className="space-y-6">
            {/* Team Header */}
            <div className={`${activeTab === 'teamA' ? 'bg-gradient-to-br from-blue-50 to-blue-100' : 'bg-gradient-to-br from-red-50 to-red-100'} rounded-xl p-6`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-2xl font-bold ${activeTab === 'teamA' ? 'text-blue-900' : 'text-red-900'}`}>
                  {activeTab === 'teamA' ? (match.teamA.name || 'Team A') : (match.teamB.name || 'Team B')} Squad
                </h3>
                <div className={`px-4 py-2 rounded-full ${activeTab === 'teamA' ? 'bg-blue-200 text-blue-800' : 'bg-red-200 text-red-800'}`}>
                  {activeTab === 'teamA' ? match.teamA.players.length : match.teamB.players.length} Players
                </div>
              </div>
            </div>

            {/* Add New Player */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
              <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <Plus className="h-5 w-5 text-green-600" />
                <span>Add New Player</span>
              </h4>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Player Name</label>
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter player name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Player Image URL</label>
                  <ImageUploadComponent
                    onImageUploaded={(url) => setNewPlayerImageUrl(url)}
                    currentImageUrl={newPlayerImageUrl}
                    placeholder="Upload player image or enter URL"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
                  <div className="flex flex-wrap gap-2">
                    {['Captain', 'Wicketkeeper', 'Batter', 'Bowler'].map((role) => (
                      <button
                        key={role}
                        onClick={() => toggleRole(role)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                          newPlayerRoles.includes(role)
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {role === 'Captain' && <Crown className="h-3 w-3 inline mr-1" />}
                        {role === 'Wicketkeeper' && <Shield className="h-3 w-3 inline mr-1" />}
                        {role === 'Batter' && <Target className="h-3 w-3 inline mr-1" />}
                        {role === 'Bowler' && <Zap className="h-3 w-3 inline mr-1" />}
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => addPlayer(activeTab === 'teamA' ? 'A' : 'B')}
                disabled={!newPlayerName.trim()}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <Plus className="h-5 w-5 inline mr-2" />
                Add Player to {activeTab === 'teamA' ? (match.teamA.name || 'Team A') : (match.teamB.name || 'Team B')}
              </button>
            </div>

            {/* Saved Players */}
            {savedPlayers.length > 0 && (
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-6">
                <h4 className="text-lg font-bold text-indigo-900 mb-4 flex items-center space-x-2">
                  <User className="h-5 w-5 text-indigo-600" />
                  <span>Your Saved Players</span>
                </h4>
                
                {loadingPlayers ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                    {savedPlayers.map((player) => (
                      <div
                        key={player.id}
                        className="bg-white rounded-lg p-4 border border-indigo-200 hover:border-indigo-400 transition-all duration-200 hover:shadow-md"
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          {player.imageUrl ? (
                            <img 
                              src={player.imageUrl} 
                              alt={player.name} 
                              className="h-10 w-10 rounded-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-indigo-200 flex items-center justify-center">
                              <User className="h-5 w-5 text-indigo-600" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">{player.name}</div>
                            {player.roles && player.roles.length > 0 && (
                              <div className="text-xs text-gray-500 truncate">{player.roles.join(', ')}</div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => addSavedPlayer(player, activeTab === 'teamA' ? 'A' : 'B')}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 rounded text-sm font-medium transition-all duration-200"
                        >
                          Add to Team
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Current Squad */}
            <div className={`${activeTab === 'teamA' ? 'bg-gradient-to-br from-blue-50 to-blue-100' : 'bg-gradient-to-br from-red-50 to-red-100'} rounded-xl p-6`}>
              <h4 className={`text-lg font-bold mb-4 ${activeTab === 'teamA' ? 'text-blue-900' : 'text-red-900'}`}>
                Current Squad ({activeTab === 'teamA' ? match.teamA.players.length : match.teamB.players.length} players)
              </h4>
              
              <div className="space-y-3">
                {(activeTab === 'teamA' ? match.teamA.players : match.teamB.players).map((player, index) => (
                  <div
                    key={player.id}
                    className="bg-white rounded-lg p-4 border-2 border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${activeTab === 'teamA' ? 'bg-blue-600' : 'bg-red-600'}`}>
                          {index + 1}
                        </div>
                        
                        {player.imageUrl ? (
                          <img 
                            src={player.imageUrl} 
                            alt={player.name} 
                            className="h-12 w-12 rounded-full object-cover border-2 border-gray-300"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-6 w-6 text-gray-500" />
                          </div>
                        )}
                        
                        <div>
                          <div className="font-bold text-lg text-gray-900">{player.name}</div>
                          {player.roles && player.roles.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {player.roles.map((role) => (
                                <span
                                  key={role}
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    role === 'Captain' ? 'bg-yellow-100 text-yellow-800' :
                                    role === 'Wicketkeeper' ? 'bg-blue-100 text-blue-800' :
                                    role === 'Batter' ? 'bg-green-100 text-green-800' :
                                    'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {role === 'Captain' && <Crown className="h-3 w-3 inline mr-1" />}
                                  {role === 'Wicketkeeper' && <Shield className="h-3 w-3 inline mr-1" />}
                                  {role === 'Batter' && <Target className="h-3 w-3 inline mr-1" />}
                                  {role === 'Bowler' && <Zap className="h-3 w-3 inline mr-1" />}
                                  {role}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => removePlayer(activeTab === 'teamA' ? 'A' : 'B', player.id)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {(activeTab === 'teamA' ? match.teamA.players : match.teamB.players).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No players added yet</p>
                    <p className="text-sm">Add at least 2 players to start the match</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Start Match Button */}
      <div className="bg-gray-50 p-6 border-t">
        <button
          onClick={onStartMatch}
          disabled={!canStartMatch()}
          className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 transform ${
            canStartMatch()
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:scale-105 hover:shadow-xl'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {canStartMatch() ? (
            <div className="flex items-center justify-center space-x-2">
              <Trophy className="h-6 w-6" />
              <span>Start Match</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <AlertCircle className="h-6 w-6" />
              <span>Complete Setup to Start</span>
            </div>
          )}
        </button>
        
        {!canStartMatch() && (
          <div className="mt-3 text-center text-sm text-gray-600">
            Complete all checklist items above to start the match
          </div>
        )}
      </div>
    </div>
  );
};