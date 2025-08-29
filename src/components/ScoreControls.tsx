import React, { useState } from 'react';
import { MatchState, PlayerRef } from '../types';
import { CricketScorer } from '../cricketUtils';
import { RotateCcw, Users, ArrowLeftRight, AlertTriangle, UserPlus, Edit3 } from 'lucide-react';

interface ScoreControlsProps {
  match: MatchState;
  onUpdateMatch: (match: MatchState) => void;
}

export const ScoreControls: React.FC<ScoreControlsProps> = ({ match, onUpdateMatch }) => {
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showBatsmanModal, setShowBatsmanModal] = useState(false);
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [showPlayerManagement, setShowPlayerManagement] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedTeamForNewPlayer, setSelectedTeamForNewPlayer] = useState<'A' | 'B'>('A');
  const [customRuns, setCustomRuns] = useState('');
  const [wicketType, setWicketType] = useState<PlayerRef['dismissal']['type']>('bowled');
  const [fielder, setFielder] = useState('');
  const [showIntervalModal, setShowIntervalModal] = useState(false);
  const [intervalType, setIntervalType] = useState<'drinks' | 'innings' | 'lunch' | 'tea' | 'custom'>('drinks');
  const [intervalMessage, setIntervalMessage] = useState('');

  const innings = match.currentInnings === 1 ? match.innings1 : match.innings2!;
  const battingTeam = innings.battingTeam === 'A' ? match.teamA : match.teamB;
  const bowlingTeam = innings.bowlingTeam === 'A' ? match.teamA : match.teamB;
  
  const striker = battingTeam.players.find(p => p.id === innings.strikerId);
  const nonStriker = battingTeam.players.find(p => p.id === innings.nonStrikerId);
  const bowler = bowlingTeam.players.find(p => p.id === innings.bowlerId);
  const currentOverBalls = CricketScorer.getCurrentOverBalls(innings);

  const availableBatsmen = battingTeam.players.filter(p => 
    !p.isOut && p.id !== innings.strikerId && p.id !== innings.nonStrikerId
  );

  const availableBowlers = bowlingTeam.players.filter(p => 
    (p.canBowl !== false && (p.roles?.includes('Bowler') || !p.roles || p.roles.length === 0 || p.canBowl === true)) && 
    p.id !== innings.bowlerId && 
    !p.isOut
  );

  const handleRunClick = (runs: number) => {
    const updatedMatch = { ...match };
    CricketScorer.applyRun(updatedMatch, runs);
    
    // Check if innings is complete after this ball
    if (CricketScorer.isInningsComplete(updatedMatch)) {
      const currentInnings = updatedMatch.currentInnings === 1 ? updatedMatch.innings1 : updatedMatch.innings2!;
      currentInnings.isComplete = true;
    }
    
    onUpdateMatch(updatedMatch);
  };

  const handleDotBall = () => {
    handleRunClick(0);
  };

  const handleWide = () => {
    const additionalRuns = parseInt(customRuns) || 0;
    const updatedMatch = { ...match };
    CricketScorer.applyWide(updatedMatch, additionalRuns);
    
    // Check if innings is complete
    if (CricketScorer.isInningsComplete(updatedMatch)) {
      const currentInnings = updatedMatch.currentInnings === 1 ? updatedMatch.innings1 : updatedMatch.innings2!;
      currentInnings.isComplete = true;
    }
    
    onUpdateMatch(updatedMatch);
    setCustomRuns('');
  };

  const handleNoBall = () => {
    const batRuns = parseInt(customRuns) || 0;
    const updatedMatch = { ...match };
    CricketScorer.applyNoBall(updatedMatch, batRuns);
    
    // Check if innings is complete
    if (CricketScorer.isInningsComplete(updatedMatch)) {
      const currentInnings = updatedMatch.currentInnings === 1 ? updatedMatch.innings1 : updatedMatch.innings2!;
      currentInnings.isComplete = true;
    }
    
    onUpdateMatch(updatedMatch);
    setCustomRuns('');
  };

  const handleBye = () => {
    const runs = parseInt(customRuns) || 1;
    const updatedMatch = { ...match };
    CricketScorer.applyBye(updatedMatch, runs);
    
    // Check if innings is complete
    if (CricketScorer.isInningsComplete(updatedMatch)) {
      const currentInnings = updatedMatch.currentInnings === 1 ? updatedMatch.innings1 : updatedMatch.innings2!;
      currentInnings.isComplete = true;
    }
    
    onUpdateMatch(updatedMatch);
    setCustomRuns('');
  };

  const handleLegBye = () => {
    const runs = parseInt(customRuns) || 1;
    const updatedMatch = { ...match };
    CricketScorer.applyLegBye(updatedMatch, runs);
    
    // Check if innings is complete
    if (CricketScorer.isInningsComplete(updatedMatch)) {
      const currentInnings = updatedMatch.currentInnings === 1 ? updatedMatch.innings1 : updatedMatch.innings2!;
      currentInnings.isComplete = true;
    }
    
    onUpdateMatch(updatedMatch);
    setCustomRuns('');
  };

  const handleWicket = () => {
    const runs = parseInt(customRuns) || 0;
    const updatedMatch = { ...match };
    const applied = CricketScorer.applyWicket(updatedMatch, wicketType, fielder || undefined, runs);
    
    if (applied) {
      // Check if innings is complete after wicket
      if (CricketScorer.isInningsComplete(updatedMatch)) {
        const currentInnings = updatedMatch.currentInnings === 1 ? updatedMatch.innings1 : updatedMatch.innings2!;
        currentInnings.isComplete = true;
      }
      
      onUpdateMatch(updatedMatch);
      
      // Show batsman selection if there are available batsmen
      if (availableBatsmen.length > 0 && !CricketScorer.isInningsComplete(updatedMatch)) {
        setShowBatsmanModal(true);
      }
    }
    
    setShowWicketModal(false);
    setCustomRuns('');
    setFielder('');
  };

  const handleNewBatsman = (playerId: string) => {
    const updatedMatch = { ...match };
    CricketScorer.setNextBatter(updatedMatch, playerId);
    onUpdateMatch(updatedMatch);
    setShowBatsmanModal(false);
  };

  const handleChangeBowler = (playerId: string) => {
    const updatedMatch = { ...match };
    const currentInnings = updatedMatch.currentInnings === 1 ? updatedMatch.innings1 : updatedMatch.innings2!;
    
    // Allow bowler change at any time
    currentInnings.bowlerId = playerId;
    onUpdateMatch(updatedMatch);
    setShowBowlerModal(false);
  };

  const handleAddNewPlayer = () => {
    if (!newPlayerName.trim()) return;

    const updatedMatch = { ...match };
    const newPlayer: PlayerRef = {
      id: `${selectedTeamForNewPlayer}_${Date.now()}`,
      name: newPlayerName,
      roles: [],
    };

    if (selectedTeamForNewPlayer === 'A') {
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
    setShowPlayerManagement(false);
  };

  const handleRemovePlayer = (teamId: 'A' | 'B', playerId: string) => {
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

  const handleSwitchStrike = () => {
    const updatedMatch = { ...match };
    CricketScorer.manualSwitchStrike(updatedMatch.currentInnings === 1 ? updatedMatch.innings1 : updatedMatch.innings2!);
    onUpdateMatch(updatedMatch);
  };

  const handleUndo = () => {
    const updatedMatch = { ...match };
    CricketScorer.undoLastEvent(updatedMatch);
    onUpdateMatch(updatedMatch);
  };

  const toggleFreeHit = () => {
    const updatedMatch = { ...match };
    const currentInnings = updatedMatch.currentInnings === 1 ? updatedMatch.innings1 : updatedMatch.innings2!;
    currentInnings.freeHit = !currentInnings.freeHit;
    onUpdateMatch(updatedMatch);
  };

  const handleInterval = () => {
    const updatedMatch = { ...match };
    const currentInnings = updatedMatch.currentInnings === 1 ? updatedMatch.innings1 : updatedMatch.innings2!;
    currentInnings.isInterval = true;
    currentInnings.intervalType = intervalType;
    currentInnings.intervalMessage = intervalMessage || undefined;
    onUpdateMatch(updatedMatch);
    setShowIntervalModal(false);
    setIntervalMessage('');
  };

  const endInterval = () => {
    const updatedMatch = { ...match };
    const currentInnings = updatedMatch.currentInnings === 1 ? updatedMatch.innings1 : updatedMatch.innings2!;
    currentInnings.isInterval = false;
    currentInnings.intervalType = undefined;
    currentInnings.intervalMessage = undefined;
    onUpdateMatch(updatedMatch);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Ball Controls</h3>
        
        {/* Free Hit Indicator */}
        {innings.freeHit && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
              <span className="font-medium text-yellow-800">FREE HIT</span>
            </div>
          </div>
        )}

        {/* Current Over Balls */}
        <div className="flex justify-center mb-4">
          <div className="cricket-over-container flex flex-wrap justify-center gap-2 max-w-lg">
            <div className="text-xs text-gray-500 w-full text-center mb-2">
              Current Over: {innings.legalBallsInCurrentOver}/6 legal balls ({currentOverBalls.length} total deliveries)
            </div>
            {/* Show ALL balls in current over */}
            {currentOverBalls.map((ball, index) => (
              <div
                key={index}
                className={`ball-indicator ${ball.type} ${ball.isFreeHit ? 'free-hit-blink' : ''} ${
                  ball.type === 'wide' || ball.type === 'noball' ? 'illegal' : ''
                }`}
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

        {/* Runs */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2 mb-3">
            <button onClick={() => handleRunClick(1)} className="score-btn">1</button>
            <button onClick={() => handleRunClick(2)} className="score-btn">2</button>
            <button onClick={() => handleRunClick(3)} className="score-btn">3</button>
            <button onClick={() => handleRunClick(4)} className="score-btn boundary">4</button>
            <button onClick={() => handleRunClick(5)} className="score-btn">5</button>
            <button onClick={() => handleRunClick(6)} className="score-btn boundary">6</button>
            <button onClick={handleDotBall} className="score-btn dot">•</button>
          </div>
          
          <div className="flex space-x-2">
            <input
              type="number"
              value={customRuns}
              onChange={(e) => setCustomRuns(e.target.value)}
              className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
              placeholder="Runs"
              min="0"
            />
            <button 
              onClick={() => handleRunClick(parseInt(customRuns) || 0)}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
            >
              Add Custom
            </button>
          </div>
        </div>

        {/* Extras */}
        <div className="mb-4">
          <h4 className="font-medium text-gray-700 mb-2">Extras</h4>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleWide} className="extra-btn">Wide</button>
            <button onClick={handleNoBall} className="extra-btn">No Ball</button>
            <button onClick={handleBye} className="extra-btn">Bye</button>
            <button onClick={handleLegBye} className="extra-btn">Leg Bye</button>
          </div>
        </div>

        {/* Wicket */}
        <div className="mb-4">
          <button
            onClick={() => setShowWicketModal(true)}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded font-medium"
          >
            Wicket
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowBowlerModal(true)}
            className="flex items-center space-x-1 px-3 py-1 bg-purple-600 text-white rounded text-sm"
          >
            <Users className="h-4 w-4" />
            <span>Bowler</span>
          </button>
          
          <button
            onClick={handleSwitchStrike}
            className="flex items-center space-x-1 px-3 py-1 bg-gray-600 text-white rounded text-sm"
          >
            <ArrowLeftRight className="h-4 w-4" />
            <span>Switch Strike</span>
          </button>

          <button
            onClick={() => setShowBatsmanModal(true)}
            className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded text-sm"
          >
            <Users className="h-4 w-4" />
            <span>Change Batsman</span>
          </button>
          
          <button
            onClick={toggleFreeHit}
            className={`px-3 py-1 rounded text-sm ${
              innings.freeHit 
                ? 'bg-yellow-600 text-white' 
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            Free Hit: {innings.freeHit ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={handleUndo}
            className="flex items-center space-x-1 px-3 py-1 bg-orange-600 text-white rounded text-sm"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Undo</span>
          </button>

          <button
            onClick={() => setShowPlayerManagement(true)}
            className="flex items-center space-x-1 px-3 py-1 bg-indigo-600 text-white rounded text-sm"
          >
            <UserPlus className="h-4 w-4" />
            <span>Manage Players</span>
          </button>

          {!innings.isInterval ? (
            <button
              onClick={() => setShowIntervalModal(true)}
              className="flex items-center space-x-1 px-3 py-1 bg-yellow-600 text-white rounded text-sm"
            >
              <span>Start Interval</span>
            </button>
          ) : (
            <button
              onClick={endInterval}
              className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded text-sm"
            >
              <span>End Interval</span>
            </button>
          )}
        </div>
      </div>

      {/* Current Players */}
      <div className="border-t pt-4">
        <h4 className="font-medium text-gray-700 mb-3">Current Players</h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center bg-green-50 p-2 rounded">
            <span className="font-medium text-green-800">Striker: {striker?.name}</span>
            <span className="text-sm text-green-600">
              {striker?.battingStats?.runs || 0}({striker?.battingStats?.balls || 0})
            </span>
          </div>
          <div className="flex justify-between items-center bg-blue-50 p-2 rounded">
            <span className="font-medium text-blue-800">Non-Striker: {nonStriker?.name}</span>
            <span className="text-sm text-blue-600">
              {nonStriker?.battingStats?.runs || 0}({nonStriker?.battingStats?.balls || 0})
            </span>
          </div>
          <div className="flex justify-between items-center bg-red-50 p-2 rounded">
            <span className="font-medium text-red-800">Bowler: {bowler?.name}</span>
            <span className="text-sm text-red-600">
              {Math.floor((bowler?.bowlingStats?.balls || 0) / 6)}.{(bowler?.bowlingStats?.balls || 0) % 6} - {bowler?.bowlingStats?.runs || 0}/{bowler?.bowlingStats?.wickets || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Wicket Modal */}
      {showWicketModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Wicket Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dismissal Type
                </label>
                <select
                  value={wicketType}
                  onChange={(e) => setWicketType(e.target.value as PlayerRef['dismissal']['type'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="bowled">Bowled</option>
                  <option value="lbw">LBW</option>
                  <option value="caught">Caught</option>
                  <option value="runout-striker">Run Out (Striker)</option>
                  <option value="runout-nonstriker">Run Out (Non-Striker)</option>
                  <option value="stumped">Stumped</option>
                  <option value="hitwicket">Hit Wicket</option>
                  <option value="obstructing">Obstructing</option>
                  <option value="hit-ball-twice">Hit Ball Twice</option>
                </select>
              </div>

              {(wicketType === 'caught' || wicketType === 'runout-striker' || wicketType === 'runout-nonstriker' || wicketType === 'stumped') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fielder
                  </label>
                  <input
                    type="text"
                    value={fielder}
                    onChange={(e) => setFielder(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Fielder name"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Runs Completed
                </label>
                <input
                  type="number"
                  value={customRuns}
                  onChange={(e) => setCustomRuns(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleWicket}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
              >
                Confirm Wicket
              </button>
              <button
                onClick={() => setShowWicketModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bowler Selection Modal */}
      {showBowlerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Select New Bowler</h3>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableBowlers.map((player) => (
                <button
                  key={player.id}
                  onClick={() => handleChangeBowler(player.id)}
                  className="w-full text-left p-3 rounded hover:bg-gray-50 border"
                >
                  <div className="font-medium">{player.name}</div>
                  {player.roles && player.roles.length > 0 && (
                    <div className="text-sm text-gray-500">{player.roles.join(', ')}</div>
                  )}
                  {player.bowlingStats && (
                    <div className="text-sm text-gray-600">
                      {Math.floor(player.bowlingStats.balls / 6)}.{player.bowlingStats.balls % 6} - 
                      {player.bowlingStats.runs}/{player.bowlingStats.wickets}
                    </div>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowBowlerModal(false)}
              className="w-full mt-4 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* New Batsman Modal */}
      {showBatsmanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Change Batsman</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Select which batsman to replace and choose the new batsman:
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="bg-gray-50 p-3 rounded mb-4">
                <h4 className="font-medium mb-2">Current Batsmen:</h4>
                <div className="space-y-1 text-sm">
                  <div>Striker: {striker?.name}</div>
                  <div>Non-Striker: {nonStriker?.name}</div>
                </div>
              </div>
              
              <h4 className="font-medium mb-2">Available Batsmen:</h4>
              {availableBatsmen.map((player) => (
                <button
                  key={player.id}
                  onClick={() => handleNewBatsman(player.id)}
                  className="w-full text-left p-3 rounded hover:bg-gray-50 border"
                >
                  <div className="font-medium">{player.name}</div>
                  {player.roles && (
                    <div className="text-sm text-gray-500">{player.roles.join(', ')}</div>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowBatsmanModal(false)}
              className="w-full mt-4 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Player Management Modal */}
      {showPlayerManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-[600px] max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Manage Players</h3>
            
            {/* Add New Player */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-3">Add New Player</h4>
              <div className="flex space-x-2 mb-3">
                <select
                  value={selectedTeamForNewPlayer}
                  onChange={(e) => setSelectedTeamForNewPlayer(e.target.value as 'A' | 'B')}
                  className="px-3 py-2 border border-gray-300 rounded"
                >
                  <option value="A">{match.teamA.name || 'Team A'}</option>
                  <option value="B">{match.teamB.name || 'Team B'}</option>
                </select>
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded"
                  placeholder="Player name"
                />
                <button
                  onClick={handleAddNewPlayer}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Team A Players */}
            <div className="mb-6">
              <h4 className="font-medium mb-3">{match.teamA.name || 'Team A'} Players</h4>
              <div className="space-y-2">
                {(match.teamA.players || []).map((player, index) => (
                  <div key={player.id} className="flex items-center justify-between bg-blue-50 p-3 rounded">
                    <div>
                      <div className="font-medium">{index + 1}. {player.name}</div>
                      {player.roles && player.roles.length > 0 && (
                        <div className="text-sm text-gray-500">{player.roles.join(', ')}</div>
                      )}
                      {player.isOut && (
                        <div className="text-sm text-red-600">OUT</div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemovePlayer('A', player.id)}
                      className="text-red-600 hover:text-red-700 px-2 py-1 rounded"
                      disabled={player.id === innings.strikerId || player.id === innings.nonStrikerId}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Team B Players */}
            <div className="mb-6">
              <h4 className="font-medium mb-3">{match.teamB.name || 'Team B'} Players</h4>
              <div className="space-y-2">
                {(match.teamB.players || []).map((player, index) => (
                  <div key={player.id} className="flex items-center justify-between bg-red-50 p-3 rounded">
                    <div>
                      <div className="font-medium">{index + 1}. {player.name}</div>
                      {player.roles && player.roles.length > 0 && (
                        <div className="text-sm text-gray-500">{player.roles.join(', ')}</div>
                      )}
                      {player.isOut && (
                        <div className="text-sm text-red-600">OUT</div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemovePlayer('B', player.id)}
                      className="text-red-600 hover:text-red-700 px-2 py-1 rounded"
                      disabled={player.id === innings.bowlerId}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowPlayerManagement(false)}
              className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Interval Modal */}
      {showIntervalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Start Interval</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interval Type
                </label>
                <select
                  value={intervalType}
                  onChange={(e) => setIntervalType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="drinks">Drinks Break</option>
                  <option value="innings">Innings Break</option>
                  <option value="lunch">Lunch Break</option>
                  <option value="tea">Tea Break</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Message (Optional)
                </label>
                <input
                  type="text"
                  value={intervalMessage}
                  onChange={(e) => setIntervalMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Strategic Timeout, Rain Delay"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleInterval}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded"
              >
                Start Interval
              </button>
              <button
                onClick={() => setShowIntervalModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};