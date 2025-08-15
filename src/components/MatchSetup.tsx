import React, { useState, useEffect, useRef } from 'react';
import { MatchState, Team, PlayerRef } from '../types';
import { Upload, Plus, Trash2, Users, Trophy, Edit3 } from 'lucide-react';

interface MatchSetupProps {
  match: MatchState;
  onUpdateMatch: (match: MatchState) => void;
  onStartMatch: () => void;
}

export const MatchSetup: React.FC<MatchSetupProps> = ({ match, onUpdateMatch, onStartMatch }) => {
  const [activeTab, setActiveTab] = useState<'setup' | 'teamA' | 'teamB'>('setup');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [playerImageFile, setPlayerImageFile] = useState<File | null>(null);
  const [showPlayerStats, setShowPlayerStats] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerRef | null>(null);
  const [playerCareerData, setPlayerCareerData] = useState({
    matchesPlayed: '',
    totalRuns: '',
    totalWickets: '',
    bestBatting: '',
    bestBowling: '',
    catches: '',
    stumpings: '',
    highestScore: '',
    average: '',
    strikeRate: '',
    centuries: '',
    halfCenturies: '',
    bowlingAverage: '',
    economyRate: '',
    fiveWickets: ''
  });

  // Hardcoded ImgBB API key
  const IMGBB_API_KEY = 'd103f36ca874ca985030f7e11d1f5a41';

  const uploadPlayerImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        return data.data.display_url;
      }
      throw new Error('Upload failed');
    } catch (error) {
      console.error('Player image upload failed:', error);
      throw error;
    }
  };

  // Local state for team names to ensure immediate UI updates
  const [teamAName, setTeamAName] = useState(match.teamA?.name || '');
  const [teamBName, setTeamBName] = useState(match.teamB?.name || '');
  const [teamALogoPreview, setTeamALogoPreview] = useState<string | null>(null);
  const [teamBLogoPreview, setTeamBLogoPreview] = useState<string | null>(null);
  const [uploadingLogoA, setUploadingLogoA] = useState(false);
  const [uploadingLogoB, setUploadingLogoB] = useState(false);
  const teamALogoPreviewRef = useRef<string | null>(null);
  const teamBLogoPreviewRef = useRef<string | null>(null);

  const uploadLogo = async (file: File, teamId: 'A' | 'B') => {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        const updatedMatch = { ...match };
        if (teamId === 'A') {
          updatedMatch.teamA = { ...updatedMatch.teamA, logoUrl: data.data.display_url };
        } else {
          updatedMatch.teamB = { ...updatedMatch.teamB, logoUrl: data.data.display_url };
        }
        onUpdateMatch(updatedMatch);
      }
    } catch (error) {
      console.error('Logo upload failed:', error);
    }
  };

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (teamALogoPreviewRef.current) {
        try { URL.revokeObjectURL(teamALogoPreviewRef.current); } catch (e) {}
        teamALogoPreviewRef.current = null;
      }
      if (teamBLogoPreviewRef.current) {
        try { URL.revokeObjectURL(teamBLogoPreviewRef.current); } catch (e) {}
        teamBLogoPreviewRef.current = null;
      }
    };
  }, []);

  const addPlayer = async (teamId: 'A' | 'B') => {
    if (!newPlayerName.trim()) return;

    let imageUrl = '';
    if (playerImageFile) {
      try {
        imageUrl = await uploadPlayerImage(playerImageFile);
      } catch (error) {
        console.error('Failed to upload player image:', error);
      }
    }

    const updatedMatch = { ...match };

    const newPlayer: PlayerRef = {
      id: `${teamId}_${Date.now()}`,
      name: newPlayerName,
      imageUrl: imageUrl || undefined,
      roles: selectedRoles.length > 0 ? selectedRoles as PlayerRef['roles'] : [],
      canBowl: selectedRoles.includes('Bowler') || selectedRoles.length === 0,
      canBat: selectedRoles.includes('Batter') || selectedRoles.length === 0,
      canKeep: selectedRoles.includes('Wicketkeeper')
    };
    // Assign a new team object back onto the match to avoid accidental
    // shared references to nested objects (shallow clone of match above).
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
    setNewPlayerName('');
    setSelectedRoles([]);
    setPlayerImageFile(null);
  };

  const removePlayer = (teamId: 'A' | 'B', playerId: string) => {
    const updatedMatch = { ...match };
    const team = teamId === 'A' ? updatedMatch.teamA : updatedMatch.teamB;
    team.players = (team.players || []).filter(p => p.id !== playerId);
    onUpdateMatch(updatedMatch);
  };

  const handleTeamNameChange = (teamId: 'A' | 'B', name: string) => {
    // Update local state immediately for UI responsiveness
    if (teamId === 'A') {
      setTeamAName(name);
    } else {
      setTeamBName(name);
    }

    // Update the match state
    const updatedMatch = { ...match };
    if (teamId === 'A') {
      updatedMatch.teamA = { ...updatedMatch.teamA, name };
    } else {
      updatedMatch.teamB = { ...updatedMatch.teamB, name };
    }
    onUpdateMatch(updatedMatch);
  };

  const canStartMatch = () => {
    return (teamAName || match.teamA?.name) && 
           (teamBName || match.teamB?.name) && 
           (match.teamA?.players?.length || 0) >= 2 && 
           (match.teamB?.players?.length || 0) >= 2 &&
           match.tossWinner && match.elected;
  };

  const openPlayerStats = (player: PlayerRef) => {
    setSelectedPlayer(player);
    setShowPlayerStats(true);
  };

  // Sync local state with props when match changes
  React.useEffect(() => {
    if (match.teamA?.name !== teamAName) {
      setTeamAName(match.teamA?.name || '');
    }
    if (match.teamB?.name !== teamBName) {
      setTeamBName(match.teamB?.name || '');
    }
  }, [match.teamA?.name, match.teamB?.name]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('setup')}
          className={`px-4 py-2 rounded-md flex items-center space-x-2 ${
            activeTab === 'setup' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'
          }`}
        >
          <Trophy className="h-4 w-4" />
          <span>Match Setup</span>
        </button>
        <button
          onClick={() => setActiveTab('teamA')}
          className={`px-4 py-2 rounded-md flex items-center space-x-2 ${
            activeTab === 'teamA' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Team A</span>
        </button>
        <button
          onClick={() => setActiveTab('teamB')}
          className={`px-4 py-2 rounded-md flex items-center space-x-2 ${
            activeTab === 'teamB' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Team B</span>
        </button>
      </div>

      {activeTab === 'setup' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overs Limit
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={match.innings1?.maxOvers || ''}
              onChange={(e) => {
                const overs = e.target.value ? parseInt(e.target.value) : undefined;
                const updatedMatch = { ...match };
                updatedMatch.innings1 = { ...updatedMatch.innings1, maxOvers: overs };
                if (updatedMatch.innings2) {
                  updatedMatch.innings2 = { ...updatedMatch.innings2, maxOvers: overs };
                }
                onUpdateMatch(updatedMatch);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 20, 50 (leave empty for unlimited)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Toss Winner
              </label>
              <select
                value={match.tossWinner || ''}
                onChange={(e) => {
                  const updatedMatch = { ...match };
                  updatedMatch.tossWinner = e.target.value as 'A' | 'B';
                  onUpdateMatch(updatedMatch);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select...</option>
                <option value="A">{teamAName || match.teamA?.name || 'Team A'}</option>
                <option value="B">{teamBName || match.teamB?.name || 'Team B'}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Elected to
              </label>
              <select
                value={match.elected || ''}
                onChange={(e) => {
                  const updatedMatch = { ...match };
                  updatedMatch.elected = e.target.value as 'bat' | 'bowl';
                  onUpdateMatch(updatedMatch);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select...</option>
                <option value="bat">Bat first</option>
                <option value="bowl">Bowl first</option>
              </select>
            </div>
          </div>

          <button
            onClick={onStartMatch}
            disabled={!canStartMatch()}
            className={`w-full py-3 px-4 rounded-md font-medium ${
              canStartMatch()
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Start Match
          </button>
        </div>
      )}

      {activeTab === 'teamA' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team A Name
            </label>
            <input
              type="text"
              value={teamAName}
              onChange={(e) => handleTeamNameChange('A', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter Team A name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team Logo
            </label>
            <div className="flex items-center space-x-4">
                {(teamALogoPreview || match.teamA?.logoUrl) && (
                  <img
                    src={teamALogoPreview || match.teamA?.logoUrl}
                    alt="Team A Logo"
                    className="h-16 w-16 object-cover rounded"
                  />
                )}
                <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center space-x-2">
                  <Upload className="h-4 w-4" />
                  <span>{uploadingLogoA ? 'Uploading...' : 'Upload Logo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      // revoke previous preview if any
                      if (teamALogoPreviewRef.current) {
                        try { URL.revokeObjectURL(teamALogoPreviewRef.current); } catch (e) {}
                      }
                      const obj = URL.createObjectURL(file);
                      teamALogoPreviewRef.current = obj;
                      setTeamALogoPreview(obj);
                      try {
                        setUploadingLogoA(true);
                        await uploadLogo(file, 'A');
                      } finally {
                        setUploadingLogoA(false);
                        // after upload, clear preview ref (match.logoUrl will be used)
                        if (teamALogoPreviewRef.current) {
                          try { URL.revokeObjectURL(teamALogoPreviewRef.current); } catch (e) {}
                          teamALogoPreviewRef.current = null;
                          setTeamALogoPreview(null);
                        }
                      }
                    }}
                  />
                </label>
              </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-3">Add Player</h4>
            <div className="flex space-x-2 mb-3">
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Player name"
              />
              <button
                onClick={() => addPlayer('A')}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {['Captain', 'Wicketkeeper', 'Batter', 'Bowler'].map((role) => (
                <label key={role} className="flex items-center space-x-1">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRoles([...selectedRoles, role]);
                      } else {
                        setSelectedRoles(selectedRoles.filter(r => r !== role));
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-600">{role}</span>
                </label>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Player Image (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPlayerImageFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-3">
              Players ({(match.teamA?.players || []).length})
            </h4>
            <div className="space-y-2">
              {(match.teamA?.players || []).map((player, index) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between bg-gray-50 p-3 rounded-md"
                >
                  <div className="flex items-center space-x-3">
                    {player.imageUrl && (
                      <img
                        src={player.imageUrl}
                        alt={player.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <div className="font-medium">{index + 1}. {player.name}</div>
                      {player.roles && player.roles.length > 0 && (
                        <div className="text-sm text-gray-500">
                          {player.roles.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removePlayer('A', player.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'teamB' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team B Name
            </label>
            <input
              type="text"
              value={teamBName}
              onChange={(e) => handleTeamNameChange('B', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter Team B name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team Logo
            </label>
            <div className="flex items-center space-x-4">
                {(teamBLogoPreview || match.teamB?.logoUrl) && (
                  <img
                    src={teamBLogoPreview || match.teamB?.logoUrl}
                    alt="Team B Logo"
                    className="h-16 w-16 object-cover rounded"
                  />
                )}
                <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center space-x-2">
                  <Upload className="h-4 w-4" />
                  <span>{uploadingLogoB ? 'Uploading...' : 'Upload Logo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      // revoke previous preview if any
                      if (teamBLogoPreviewRef.current) {
                        try { URL.revokeObjectURL(teamBLogoPreviewRef.current); } catch (e) {}
                      }
                      const obj = URL.createObjectURL(file);
                      teamBLogoPreviewRef.current = obj;
                      setTeamBLogoPreview(obj);
                      try {
                        setUploadingLogoB(true);
                        await uploadLogo(file, 'B');
                      } finally {
                        setUploadingLogoB(false);
                        // after upload, clear preview ref (match.logoUrl will be used)
                        if (teamBLogoPreviewRef.current) {
                          try { URL.revokeObjectURL(teamBLogoPreviewRef.current); } catch (e) {}
                          teamBLogoPreviewRef.current = null;
                          setTeamBLogoPreview(null);
                        }
                      }
                    }}
                  />
                </label>
              </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-3">Add Player</h4>
            <div className="flex space-x-2 mb-3">
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Player name"
              />
              <button
                onClick={() => addPlayer('B')}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {['Captain', 'Wicketkeeper', 'Batter', 'Bowler'].map((role) => (
                <label key={role} className="flex items-center space-x-1">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRoles([...selectedRoles, role]);
                      } else {
                        setSelectedRoles(selectedRoles.filter(r => r !== role));
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-600">{role}</span>
                </label>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Player Image (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPlayerImageFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-3">
              Players ({(match.teamB?.players || []).length})
            </h4>
            <div className="space-y-2">
              {(match.teamB?.players || []).map((player, index) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between bg-gray-50 p-3 rounded-md"
                >
                  <div className="flex items-center space-x-3">
                    {player.imageUrl && (
                      <img
                        src={player.imageUrl}
                        alt={player.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <div className="font-medium">{index + 1}. {player.name}</div>
                      {player.roles && player.roles.length > 0 && (
                        <div className="text-sm text-gray-500">
                          {player.roles.join(', ')}
                        </div>
                      )}
                      <div className="text-xs text-blue-600 mt-1">
                        {player.canBat && 'Bat'} {player.canBowl && 'Bowl'} {player.canKeep && 'Keep'}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openPlayerStats(player)}
                      className="text-blue-600 hover:text-blue-700 p-1"
                      title="Edit Stats"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removePlayer('B', player.id)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};