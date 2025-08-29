import React, { useState, useEffect } from 'react';
import { MatchState } from '../types';
import { firebaseService, saveOverlaySettingsToFirebase, getOverlaySettingsFromFirebase } from '../firebase';
import { URLHelper } from '../utils/urlHelper';
import { Monitor, EyeOff, Maximize2, BarChart3, Users, Clock, Palette, Play, Square, TrendingUp, Award, Zap } from 'lucide-react';

interface OverlayControlPanelProps {
  match: MatchState;
  onUpdateOverlaySettings: (settings: any) => void;
  onEndInnings?: () => void;
}

export const OverlayControlPanel: React.FC<OverlayControlPanelProps> = ({ match, onUpdateOverlaySettings, onEndInnings }) => {
  const [overlaySettings, setOverlaySettings] = useState<any>(null);
  const [showPreview] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Update settings and save to Firebase
  const updateSetting = async (key: string, value: any) => {
    const user = firebaseService.getCurrentUser();
    if (!user || !overlaySettings) return;
    const newSettings = { ...overlaySettings, [key]: value };
    setOverlaySettings(newSettings);
    await saveOverlaySettingsToFirebase(user.uid, newSettings);
    
    // Also update theme settings if it's a theme-related setting
    const themeKeys = ['primaryColor', 'secondaryColor', 'accentColor', 'textColor', 'teamAColor', 'teamBColor', 'teamAOpacity', 'teamBOpacity'];
    if (themeKeys.includes(key)) {
      const themeSettings = LocalStorageManager.getThemeSettings();
      const updatedThemeSettings = { ...themeSettings, [key]: value };
      LocalStorageManager.saveThemeSettings(updatedThemeSettings);
      await firebaseService.saveThemeSettings(user.uid, updatedThemeSettings);
    }
    
    onUpdateOverlaySettings(newSettings);
  };

  // Load overlay settings from Firebase on mount
  useEffect(() => {
    const fetchSettings = async () => {
      const user = firebaseService.getCurrentUser();
      if (!user) return;
      const settings = await getOverlaySettingsFromFirebase(user.uid);
      setOverlaySettings(settings);
    };
    fetchSettings();
  }, []);

  const generateOBSUrl = () => {
    const obsUrl = URLHelper.generateOverlayURL(match?.id || '');
    navigator.clipboard.writeText(obsUrl);
    alert(`OBS URL copied to clipboard!\n\n${URLHelper.getOverlayInstructions()}`);
  };

  const handleEndInnings = () => {
    if (onEndInnings) {
      onEndInnings();
    }
  };

  const triggerPanelWithAnimation = (panelType: string) => {
    // Add animation class to button
    const panelButton = document.querySelector(`[data-panel="${panelType}"]`);
    if (panelButton) {
      panelButton.classList.add('animate-pulse', 'scale-110');
      setTimeout(() => {
        panelButton.classList.remove('animate-pulse', 'scale-110');
      }, 1000);
    }
    
    updateSetting(`trigger${panelType.charAt(0).toUpperCase() + panelType.slice(1)}`, Date.now());
    
    // Also publish the trigger to public overlay settings for real-time updates
    const publishTrigger = async () => {
      try {
        const { publishOverlaySettingsToPublic } = await import('../firebase');
        const currentSettings = await getOverlaySettingsFromFirebase(firebaseService.getCurrentUser()?.uid || '');
        const updatedSettings = {
          ...currentSettings,
          [`trigger${panelType.charAt(0).toUpperCase() + panelType.slice(1)}`]: Date.now()
        };
        await publishOverlaySettingsToPublic(match.id, updatedSettings);
      } catch (error) {
        console.error('Failed to publish trigger to public settings:', error);
      }
    };
    
    publishTrigger();
  };

  if (!overlaySettings) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center text-gray-500">
        Loading overlay settings...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2 p-6 pb-0">
          <Monitor className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold">Overlay Control Panel</h3>
        </div>
      </div>

      <div className="p-6 pt-0">
        {/* Main Overlay Controls */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={overlaySettings.showOverlay}
                onChange={(e) => updateSetting('showOverlay', e.target.checked)}
                className="rounded"
              />
              <span>Show Main Footer Overlay</span>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={overlaySettings.showPlayerStats}
                onChange={(e) => updateSetting('showPlayerStats', e.target.checked)}
                className="rounded"
              />
              <span>Show Player Stats Panels</span>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={overlaySettings.showRunRateChart}
                onChange={(e) => updateSetting('showRunRateChart', e.target.checked)}
                className="rounded"
              />
              <span>Show Run Rate Chart</span>
            </label>
          </div>
        </div>

        {/* Color Customization */}
        <div className="border-t pt-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-700 flex items-center space-x-2">
              <Palette className="h-4 w-4" />
              <span>Footer Colors</span>
            </h4>
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showColorPicker ? 'Hide' : 'Customize'}
            </button>
          </div>
          
          {showColorPicker && (
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Primary Color</label>
                  <input
                    type="color"
                    value={overlaySettings.primaryColor || '#1e3a8a'}
                    onChange={(e) => updateSetting('primaryColor', e.target.value)}
                    className="w-full h-10 rounded border"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Secondary Color</label>
                  <input
                    type="color"
                    value={overlaySettings.secondaryColor || '#1d4ed8'}
                    onChange={(e) => updateSetting('secondaryColor', e.target.value)}
                    className="w-full h-10 rounded border"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Accent Color</label>
                  <input
                    type="color"
                    value={overlaySettings.accentColor || '#3b82f6'}
                    onChange={(e) => updateSetting('accentColor', e.target.value)}
                    className="w-full h-10 rounded border"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Text Color</label>
                  <input
                    type="color"
                    value={overlaySettings.textColor || '#ffffff'}
                    onChange={(e) => updateSetting('textColor', e.target.value)}
                    className="w-full h-10 rounded border"
                  />
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    updateSetting('primaryColor', '#1e3a8a');
                    updateSetting('secondaryColor', '#1d4ed8');
                    updateSetting('accentColor', '#3b82f6');
                    updateSetting('textColor', '#ffffff');
                  }}
                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                >
                  Reset to Default
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Innings Management */}
        <div className="border-t pt-4 mb-6">
          <h4 className="font-medium text-gray-700 mb-3 flex items-center space-x-2">
            <Play className="h-4 w-4" />
            <span>Innings Control</span>
          </h4>
          
          <div className="space-y-3">
            <button
              onClick={handleEndInnings}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-all duration-200 hover:scale-105"
            >
              <Square className="h-5 w-5" />
              <span>End Current Innings</span>
            </button>
            
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <strong>Current:</strong> Innings {match.currentInnings} - {match.currentInnings === 1 ? match.innings1.battingTeam === 'A' ? match.teamA.name : match.teamB.name : match.innings2?.battingTeam === 'A' ? match.teamA.name : match.teamB.name} batting
            </div>
          </div>
        </div>

        {/* Fullscreen Panel Controls */}
        <div className="border-t pt-4 mb-6">
          <h4 className="font-medium text-gray-700 mb-3 flex items-center space-x-2">
            <Maximize2 className="h-4 w-4" />
            <span>Fullscreen Panels</span>
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={overlaySettings.showFullscreenPlayerStats}
                  onChange={(e) => updateSetting('showFullscreenPlayerStats', e.target.checked)}
                  className="rounded"
                />
                <Users className="h-4 w-4 text-blue-500" />
                <span>Fullscreen Player Stats</span>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={overlaySettings.showFullscreenRunRate}
                  onChange={(e) => updateSetting('showFullscreenRunRate', e.target.checked)}
                  className="rounded"
                />
                <BarChart3 className="h-4 w-4 text-green-500" />
                <span>Fullscreen Run Rate Analysis</span>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={overlaySettings.showFullscreenMatchSummary}
                  onChange={(e) => updateSetting('showFullscreenMatchSummary', e.target.checked)}
                  className="rounded"
                />
                <Clock className="h-4 w-4 text-purple-500" />
                <span>Fullscreen Match Summary</span>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={overlaySettings.showComparisonChart}
                  onChange={(e) => updateSetting('showComparisonChart', e.target.checked)}
                  className="rounded"
                />
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                <span>Team Comparison Chart</span>
              </label>
            </div>
          </div>
        </div>

        {/* Panel Display Duration */}
        <div className="border-t pt-4 mb-6">
          <h4 className="font-medium text-gray-700 mb-3">Panel Display Settings</h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Fullscreen Panel Duration (seconds)
              </label>
              <input
                type="number"
                min="5"
                max="60"
                value={overlaySettings.fullscreenDuration || 10}
                onChange={(e) => updateSetting('fullscreenDuration', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Auto-cycle Panels
              </label>
              <select
                value={overlaySettings.autoCycle || 'off'}
                onChange={(e) => updateSetting('autoCycle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="off">Off</option>
                <option value="30">Every 30 seconds</option>
                <option value="60">Every 1 minute</option>
                <option value="120">Every 2 minutes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Manual Panel Triggers */}
        <div className="border-t pt-4 mb-6">
          <h4 className="font-medium text-gray-700 mb-3">Manual Panel Controls</h4>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              data-panel="playerStats"
              onClick={() => triggerPanelWithAnimation('playerStats')}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 text-sm font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 animate-glow"
            >
              <Users className="h-4 w-4" />
              <span>Player Stats</span>
              <Zap className="h-3 w-3 opacity-75" />
            </button>

            <button
              data-panel="runRate"
              onClick={() => triggerPanelWithAnimation('runRate')}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 text-sm font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-500/25 animate-glow"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Run Rate</span>
              <Zap className="h-3 w-3 opacity-75" />
            </button>

            <button
              data-panel="matchSummary"
              onClick={() => triggerPanelWithAnimation('matchSummary')}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 text-sm font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 animate-glow"
            >
              <Award className="h-4 w-4" />
              <span>Summary</span>
              <Zap className="h-3 w-3 opacity-75" />
            </button>

            <button
              data-panel="comparison"
              onClick={() => triggerPanelWithAnimation('comparison')}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 text-sm font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/25 animate-glow"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Comparison</span>
              <Zap className="h-3 w-3 opacity-75" />
            </button>

            <button
              data-panel="batsmanSummary"
              onClick={() => triggerPanelWithAnimation('batsmanSummary')}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 text-sm font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-orange-500/25 animate-glow"
            >
              <Users className="h-4 w-4" />
              <span>Batsmen</span>
              <Zap className="h-3 w-3 opacity-75" />
            </button>

            <button
              data-panel="bowlerSummary"
              onClick={() => triggerPanelWithAnimation('bowlerSummary')}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 text-sm font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-red-500/25 animate-glow"
            >
              <Zap className="h-4 w-4" />
              <span>Bowlers</span>
              <Zap className="h-3 w-3 opacity-75" />
            </button>

            <button
              data-panel="winner"
              onClick={() => triggerPanelWithAnimation('winner')}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-yellow-600 to-yellow-700 text-white rounded-lg hover:from-yellow-700 hover:to-yellow-800 text-sm font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-yellow-500/25 animate-glow"
            >
              <Award className="h-4 w-4" />
              <span>Winner</span>
              <Zap className="h-3 w-3 opacity-75" />
            </button>
          </div>
          
          <button
            onClick={() => updateSetting('hideAllPanels', Date.now())}
            className="w-full mt-3 flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 text-sm font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-red-500/25"
          >
            <EyeOff className="h-4 w-4" />
            <span>Hide All Panels</span>
          </button>
        </div>

        {/* OBS URL */}
        <div className="border-t pt-4">
          <button
            onClick={generateOBSUrl}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 font-medium transition-all duration-300 transform hover:scale-105"
          >
            <Monitor className="h-5 w-5" />
            <span>Copy OBS URL</span>
          </button>
        </div>

        {/* Live Preview */}
        {showPreview && (
          <div className="mt-6 border-t pt-4">
            <h4 className="font-medium text-gray-700 mb-3">Live Preview</h4>
            <div className="bg-gray-900 rounded-lg overflow-hidden" style={{ height: '200px' }}>
              <iframe
                src={`${window.location.origin}${window.location.pathname}?overlay=1&match=${match?.id}&preview=1`}
                className="w-full h-full border-0"
                style={{ transform: 'scale(0.3)', transformOrigin: 'top left', width: '333%', height: '333%' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};