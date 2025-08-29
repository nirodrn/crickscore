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
  const [localMatch, setLocalMatch] = React.useState<MatchState | null>(match);

  // If no match provided, try to get from URL params and cache
  React.useEffect(() => {
    if (!localMatch) {
      const urlParams = new URLSearchParams(window.location.search);
      const matchParam = urlParams.get('match');
      
      if (matchParam) {
        const cachedMatch = LocalStorageManager.getCachedMatch(matchParam);
        if (cachedMatch) {
          setLocalMatch(cachedMatch);
        }
      }
    }
  }, [localMatch]);

  // Use localMatch if available, otherwise use prop
  const activeMatch = localMatch || match;

  if (!activeMatch) {
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
        return <ScoreDisplay match={activeMatch} overlayMode={true} forcePanel="playerStats" />;
      case 'runRate':
        return <RunRateAnalysisPanel match={activeMatch} overlaySettings={LocalStorageManager.getOverlaySettings()} />;
      case 'matchSummary':
        return <MatchSummaryPanel match={activeMatch} overlaySettings={LocalStorageManager.getOverlaySettings()} />;
      case 'comparison':
        return <TeamComparisonPanel match={activeMatch} overlaySettings={LocalStorageManager.getOverlaySettings()} />;
      case 'wicketFall':
        return <WicketFallChartPanel match={activeMatch} overlaySettings={LocalStorageManager.getOverlaySettings()} />;
      case 'batsmanSummary':
        return <BatsmanSummaryPanel match={activeMatch} overlaySettings={LocalStorageManager.getOverlaySettings()} />;
      case 'bowlerSummary':
        return <BowlerSummaryPanel match={activeMatch} overlaySettings={LocalStorageManager.getOverlaySettings()} />;
      case 'winner':
        return <WinnerPanel match={activeMatch} overlaySettings={LocalStorageManager.getOverlaySettings()} />;
      default:
        return <ScoreDisplay match={activeMatch} overlayMode={true} />;
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      {renderPanel()}
    </div>
  );
};