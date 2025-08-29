import React from 'react';
import { MatchState } from '../types';
import { ScoreDisplay } from './ScoreDisplay';
import { MatchSummaryPanel } from './MatchSummaryPanel';
import { WicketFallChartPanel } from './WicketFallChartPanel';
import { TeamComparisonPanel } from './TeamComparisonPanel';
import { RunRateAnalysisPanel } from './RunRateAnalysisPanel';
import { BatsmanSummaryPanel } from './BatsmanSummaryPanel';
import { BowlerSummaryPanel } from './BowlerSummaryPanel';
import { WinnerPanel } from './WinnerPanel';
import { LocalStorageManager } from '../utils/localStorage';

interface PanelRouterProps {
  panel: string;
  match: MatchState | null;
}

export const PanelRouter: React.FC<PanelRouterProps> = ({ panel, match }) => {
  // If no match provided, try to get from URL params and cache
  React.useEffect(() => {
    if (!match) {
      const urlParams = new URLSearchParams(window.location.search);
      const matchParam = urlParams.get('match');
      
      if (matchParam) {
        const cachedMatch = LocalStorageManager.getCachedMatch(matchParam);
        if (cachedMatch) {
          // Force re-render with cached match
          window.location.reload();
        }
      }
    }
  }, [match]);

  if (!match) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold mb-2">Loading Match Data...</h2>
          <p>Please wait while we load the match information</p>
        </div>
      </div>
    );
  }

  const renderPanel = () => {
    switch (panel) {
      case 'playerStats':
        return <ScoreDisplay match={match} overlayMode={true} forcePanel="playerStats" />;
      case 'runRate':
        return <RunRateAnalysisPanel match={match} overlaySettings={LocalStorageManager.getOverlaySettings()} />;
      case 'matchSummary':
        return <MatchSummaryPanel match={match} overlaySettings={LocalStorageManager.getOverlaySettings()} />;
      case 'comparison':
        return <TeamComparisonPanel match={match} overlaySettings={LocalStorageManager.getOverlaySettings()} />;
      case 'wicketFall':
        return <WicketFallChartPanel match={match} overlaySettings={LocalStorageManager.getOverlaySettings()} />;
      case 'batsmanSummary':
        return <BatsmanSummaryPanel match={match} overlaySettings={LocalStorageManager.getOverlaySettings()} />;
      case 'bowlerSummary':
        return <BowlerSummaryPanel match={match} overlaySettings={LocalStorageManager.getOverlaySettings()} />;
      case 'winner':
        return <WinnerPanel match={match} overlaySettings={LocalStorageManager.getOverlaySettings()} />;
      default:
        return <ScoreDisplay match={match} overlayMode={true} />;
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      {renderPanel()}
    </div>
  );
};