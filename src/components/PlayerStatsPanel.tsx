import React, { useMemo } from 'react';
import { MatchState, PlayerRef } from '../types';
import { Users } from 'lucide-react';

interface PlayerStatsPanelProps {
  match: MatchState;
  overlaySettings?: any;
  panelAnimation?: string;
}

const statOrZero = (v: number | undefined) => v || 0;

const barWidth = (value: number, max: number) => (max > 0 ? Math.round((value / max) * 100) : 0);

export const PlayerStatsPanel: React.FC<PlayerStatsPanelProps> = ({ match, overlaySettings, panelAnimation }) => {
  const innings = match.currentInnings === 1 ? match.innings1 : match.innings2!;
  const battingTeam = innings.battingTeam === 'A' ? match.teamA : match.teamB;
  const bowlingTeam = innings.bowlingTeam === 'A' ? match.teamA : match.teamB;

  const striker = battingTeam.players.find(p => p.id === innings.strikerId) || null;
  const nonStriker = battingTeam.players.find(p => p.id === innings.nonStrikerId) || null;
  const bowler = bowlingTeam.players.find(p => p.id === innings.bowlerId) || null;

  const topBatters = useMemo(() => {
    // Include players who have batted; also include current batters (striker/nonStriker)
    return [...battingTeam.players]
      .filter(p => (p.battingStats && (p.battingStats.balls || 0) > 0) || p.id === innings.strikerId || p.id === innings.nonStrikerId)
      .sort((a, b) => statOrZero(b.battingStats?.runs) - statOrZero(a.battingStats?.runs))
      .slice(0, 5);
  }, [battingTeam.players]);

  const topBowlers = useMemo(() => {
    return [...bowlingTeam.players]
      .sort((a, b) => statOrZero(b.bowlingStats?.wickets) - statOrZero(a.bowlingStats?.wickets))
      .slice(0, 5);
  }, [bowlingTeam.players]);

  const maxRuns = Math.max(...topBatters.map(p => statOrZero(p.battingStats?.runs)), 1);
  const maxWkts = Math.max(...topBowlers.map(p => statOrZero(p.bowlingStats?.wickets)), 1);

  const formatOvers = (balls?: number) => {
    if (!balls) return '0.0';
    const overs = Math.floor(balls / 6);
    const rem = balls % 6;
    return `${overs}.${rem}`;
  };

  const formatSR = (runs?: number, balls?: number) => {
    if (!balls || balls === 0) return '-';
    return ((runs || 0) / balls * 100).toFixed(1);
  };

  const formatAverage = (runs?: number, dismissals?: number) => {
    if (!dismissals || dismissals === 0) return '-';
    return (runs! / dismissals).toFixed(2);
  };

  const panelStyle = {
    color: overlaySettings?.styleSettings?.panelTextColor || overlaySettings?.textColor || '#ffffff'
  } as React.CSSProperties;

  // OBS-safe glass card: darker semi-transparent glass so it remains visible on bright backgrounds,
  // stronger blur and border for contrast in daytime/white scenes.
  const glassClass = 'bg-black/28 backdrop-blur-3xl border border-white/18 rounded-2xl shadow-2xl';

  const headerBg = overlaySettings?.accentColor || overlaySettings?.primaryColor || '#1e3a8a';
  const secondaryBg = overlaySettings?.secondaryColor || '#1d4ed8';

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-6 ${panelAnimation || ''}`} style={panelStyle}>
  <div className={`w-full ${glassClass} overflow-hidden`}>
        <div className="p-6" style={{ background: `linear-gradient(90deg, ${headerBg}20, ${secondaryBg}10)` }}>
          <div className="flex items-center space-x-4">
            <div className="bg-black/40 rounded-full p-3" style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.45)' }}>
              <Users className="h-8 w-8 text-white/90" />
            </div>
            <div>
              <div className="text-3xl font-semibold">Player Statistics</div>
              <div className="text-sm opacity-80">{battingTeam.name} vs {bowlingTeam.name}</div>
            </div>
          </div>
        </div>

  <div className="p-6 grid grid-cols-12 gap-6">
          {/* Left: Current players */}
          <div className="col-span-3 space-y-4 min-h-[220px]">
            <div className="p-4 rounded-lg bg-black/40 border border-white/6 min-h-[68px]">
              <div className="text-xs opacity-80">Striker</div>
              <div className="text-xl font-bold truncate">{striker?.name || 'N/A'}</div>
              <div className="text-sm opacity-70">{statOrZero(striker?.battingStats?.runs)} • {statOrZero(striker?.battingStats?.balls)}</div>
            </div>

            <div className="p-4 rounded-lg bg-black/40 border border-white/6 min-h-[68px]">
              <div className="text-xs opacity-80">Non-Striker</div>
              <div className="text-xl font-bold truncate">{nonStriker?.name || 'N/A'}</div>
              <div className="text-sm opacity-70">{statOrZero(nonStriker?.battingStats?.runs)} • {statOrZero(nonStriker?.battingStats?.balls)}</div>
            </div>

            <div className="p-4 rounded-lg bg-black/40 border border-white/6 min-h-[68px]">
              <div className="text-xs opacity-80">Bowler</div>
              <div className="text-xl font-bold truncate">{bowler?.name || 'N/A'}</div>
              <div className="text-sm opacity-70">{formatOvers(bowler?.bowlingStats?.balls)} • {statOrZero(bowler?.bowlingStats?.wickets)} wkts</div>
            </div>
          </div>

          {/* Center: Top Batters table */}
          <div className="col-span-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Top Batters</div>
              <div className="text-sm opacity-70">R • B • SR • 4s • 6s • HS • Ave</div>
            </div>

            <div className="space-y-2">
              {topBatters.length === 0 && (
                <div className="p-3 bg-black/35 rounded-md text-sm opacity-70">No batters have batted yet</div>
              )}

              {topBatters.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-black/35 rounded-md p-3 border border-white/6 min-w-0">
                  <div className="flex items-center space-x-3 min-w-0">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-white/6 flex items-center justify-center text-sm">{p.name?.slice(0,1).toUpperCase()}</div>
                    )}

                    <div className="min-w-0">
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="text-xs opacity-70">{p.roles?.join(', ')}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 text-sm font-semibold truncate ml-4">
                    <div className="text-right w-10">{statOrZero(p.battingStats?.runs)}</div>
                    <div className="text-right w-10">{statOrZero(p.battingStats?.balls)}</div>
                    <div className="text-right w-12">{formatSR(p.battingStats?.runs, p.battingStats?.balls)}</div>
                    <div className="text-right w-8">{statOrZero(p.battingStats?.fours)}</div>
                    <div className="text-right w-8">{statOrZero(p.battingStats?.sixes)}</div>
                    <div className="text-right w-12">{p.battingStats?.highestScore ?? '-'}</div>
                    <div className="text-right w-12">{p.battingStats?.average ? p.battingStats.average.toFixed(2) : '-'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Top Bowlers table */}
          <div className="col-span-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Top Bowlers</div>
              <div className="text-sm opacity-70">O • M • R • W • Econ • Best</div>
            </div>

            <div className="space-y-2">
              {topBowlers.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-black/35 rounded-md p-3 border border-white/6 min-w-0 overflow-hidden">
                  <div className="min-w-0 pr-3">
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-xs opacity-70 truncate">{p.roles?.join(', ')}</div>
                  </div>

                  <div className="ml-4 flex items-center space-x-3 text-sm font-semibold truncate">
                    <div className="w-12 text-right flex-shrink-0">{formatOvers(p.bowlingStats?.balls)}</div>
                    <div className="w-8 text-right flex-shrink-0">{statOrZero(p.bowlingStats?.maidens)}</div>
                    <div className="w-10 text-right flex-shrink-0">{statOrZero(p.bowlingStats?.runs)}</div>
                    <div className="w-10 text-right flex-shrink-0">{statOrZero(p.bowlingStats?.wickets)}</div>
                    <div className="w-12 text-right flex-shrink-0">{p.bowlingStats?.balls ? ((p.bowlingStats!.runs / p.bowlingStats!.balls) * 6).toFixed(2) : '-'}</div>
                    <div className="w-14 text-right truncate">{p.bowlingStats?.bestFigures || '-'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerStatsPanel;
