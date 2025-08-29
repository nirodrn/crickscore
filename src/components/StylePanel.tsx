import React, { useState, useEffect } from 'react';
import { OverlayStyleSettings } from '../types';
import { firebaseService, saveOverlaySettingsToFirebase, getOverlaySettingsFromFirebase } from '../firebase';
import { LocalStorageManager } from '../utils/localStorage';
import { Palette, Save, RotateCcw, X, Code, Eye, EyeOff } from 'lucide-react';

interface StylePanelProps {
  onClose: () => void;
  matchId?: string;
}

export const StylePanel: React.FC<StylePanelProps> = ({ onClose, matchId }) => {
  const [styleSettings, setStyleSettings] = useState<OverlayStyleSettings>({
    footerBgColor: '#1e3a8a',
    footerTextColor: '#ffffff',
    footerBorderRadius: 8,
    footerPadding: 16,
    footerTextAlignment: 'center',
    footerGradient: 'linear-gradient(90deg, #1e3a8a 0%, #1d4ed8 50%, #3b82f6 100%)',
    panelBgColor: '#1e3a8a',
    panelTextColor: '#ffffff',
    panelBorderRadius: 12,
    panelPadding: 24,
    panelGradient: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #3b82f6 100%)',
    ballIndicatorSize: 32,
    ballIndicatorSpacing: 8,
    customCSS: ''
  });
  
  const [showPreview, setShowPreview] = useState(false);
  const [showCustomCSS, setShowCustomCSS] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const user = firebaseService.getCurrentUser();
      if (!user) return;
      
      try {
        const settings = await getOverlaySettingsFromFirebase(user.uid);
        if (settings.styleSettings) {
          setStyleSettings(settings.styleSettings);
        }
      } catch (error) {
        console.error('Failed to load style settings:', error);
      }
    };
    
    loadSettings();
  }, []);

  const updateSetting = (key: keyof OverlayStyleSettings, value: any) => {
    setStyleSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = async () => {
    const user = firebaseService.getCurrentUser();
    if (!user) return;
    
    setSaving(true);
    try {
      const currentSettings = await getOverlaySettingsFromFirebase(user.uid);
      const updatedSettings = {
        ...currentSettings,
        styleSettings
      };
      
      await saveOverlaySettingsToFirebase(user.uid, updatedSettings);
      
      // Also save theme settings separately for easier access
      await firebaseService.saveThemeSettings(user.uid, {
        ...styleSettings,
        primaryColor: currentSettings.primaryColor,
        secondaryColor: currentSettings.secondaryColor,
        accentColor: currentSettings.accentColor,
        textColor: currentSettings.textColor,
        teamAColor: currentSettings.teamAColor,
        teamBColor: currentSettings.teamBColor,
        teamAOpacity: currentSettings.teamAOpacity,
        teamBOpacity: currentSettings.teamBOpacity
      });
      
      LocalStorageManager.saveOverlaySettings(updatedSettings);
      LocalStorageManager.saveThemeSettings(styleSettings);
      
      alert('Style settings saved successfully!');
    } catch (error) {
      console.error('Failed to save style settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setStyleSettings({
      footerBgColor: '#1e3a8a',
      footerTextColor: '#ffffff',
      footerBorderRadius: 8,
      footerPadding: 16,
      footerTextAlignment: 'center',
      footerGradient: 'linear-gradient(90deg, #1e3a8a 0%, #1d4ed8 50%, #3b82f6 100%)',
      panelBgColor: '#1e3a8a',
      panelTextColor: '#ffffff',
      panelBorderRadius: 12,
      panelPadding: 24,
      panelGradient: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #3b82f6 100%)',
      ballIndicatorSize: 32,
      ballIndicatorSpacing: 8,
      customCSS: ''
    });
  };

  const generateGradient = (color1: string, color2: string, direction: string = '90deg') => {
    return `linear-gradient(${direction}, ${color1} 0%, ${color2} 100%)`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex">
        {/* Main Panel */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Palette className="h-6 w-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">Style Editor</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-8">
            {/* Footer Styles */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Footer Overlay Styles</h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Background Color
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="color"
                      value={styleSettings.footerBgColor}
                      onChange={(e) => updateSetting('footerBgColor', e.target.value)}
                      className="w-16 h-10 rounded border"
                    />
                    <input
                      type="text"
                      value={styleSettings.footerBgColor}
                      onChange={(e) => updateSetting('footerBgColor', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Text Color
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="color"
                      value={styleSettings.footerTextColor}
                      onChange={(e) => updateSetting('footerTextColor', e.target.value)}
                      className="w-16 h-10 rounded border"
                    />
                    <input
                      type="text"
                      value={styleSettings.footerTextColor}
                      onChange={(e) => updateSetting('footerTextColor', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Border Radius (px)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={styleSettings.footerBorderRadius}
                    onChange={(e) => updateSetting('footerBorderRadius', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Padding (px)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={styleSettings.footerPadding}
                    onChange={(e) => updateSetting('footerPadding', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Text Alignment
                  </label>
                  <select
                    value={styleSettings.footerTextAlignment}
                    onChange={(e) => updateSetting('footerTextAlignment', e.target.value as 'left' | 'center' | 'right')}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Background Gradient
                  </label>
                  <textarea
                    value={styleSettings.footerGradient || ''}
                    onChange={(e) => updateSetting('footerGradient', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows={2}
                    placeholder="linear-gradient(90deg, #1e3a8a 0%, #1d4ed8 100%)"
                  />
                  <div className="flex space-x-2 mt-2">
                    <button
                      onClick={() => updateSetting('footerGradient', generateGradient(styleSettings.footerBgColor, '#1d4ed8'))}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Auto Generate
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel Styles */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Fullscreen Panel Styles</h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Background Color
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="color"
                      value={styleSettings.panelBgColor}
                      onChange={(e) => updateSetting('panelBgColor', e.target.value)}
                      className="w-16 h-10 rounded border"
                    />
                    <input
                      type="text"
                      value={styleSettings.panelBgColor}
                      onChange={(e) => updateSetting('panelBgColor', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Text Color
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="color"
                      value={styleSettings.panelTextColor}
                      onChange={(e) => updateSetting('panelTextColor', e.target.value)}
                      className="w-16 h-10 rounded border"
                    />
                    <input
                      type="text"
                      value={styleSettings.panelTextColor}
                      onChange={(e) => updateSetting('panelTextColor', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Border Radius (px)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={styleSettings.panelBorderRadius}
                    onChange={(e) => updateSetting('panelBorderRadius', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Padding (px)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={styleSettings.panelPadding}
                    onChange={(e) => updateSetting('panelPadding', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Background Gradient
                  </label>
                  <textarea
                    value={styleSettings.panelGradient || ''}
                    onChange={(e) => updateSetting('panelGradient', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows={2}
                    placeholder="linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)"
                  />
                </div>
              </div>
            </div>

            {/* Ball Indicator Styles */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Ball Indicator Styles</h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ball Size (px)
                  </label>
                  <input
                    type="number"
                    min="20"
                    max="60"
                    value={styleSettings.ballIndicatorSize}
                    onChange={(e) => updateSetting('ballIndicatorSize', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ball Spacing (px)
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="20"
                    value={styleSettings.ballIndicatorSpacing}
                    onChange={(e) => updateSetting('ballIndicatorSpacing', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Custom CSS */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                  <Code className="h-5 w-5" />
                  <span>Custom CSS</span>
                </h3>
                <button
                  onClick={() => setShowCustomCSS(!showCustomCSS)}
                  className="flex items-center space-x-1 text-sm text-purple-600 hover:text-purple-700"
                >
                  {showCustomCSS ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span>{showCustomCSS ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              
              {showCustomCSS && (
                <div>
                  <textarea
                    value={styleSettings.customCSS || ''}
                    onChange={(e) => updateSetting('customCSS', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                    rows={8}
                    placeholder={`/* Custom CSS for overlay elements */
.cricket-footer {
  /* Your custom styles here */
}

.cricket-panel {
  /* Panel styles */
}

.ball-indicator {
  /* Ball indicator styles */
}`}
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    Add custom CSS to override default styles. Use classes like .cricket-footer, .cricket-panel, .ball-indicator
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4 mt-8 pt-6 border-t">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
            >
              <Save className="h-5 w-5" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
            
            <button
              onClick={resetToDefaults}
              className="flex items-center space-x-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
            >
              <RotateCcw className="h-5 w-5" />
              <span>Reset to Defaults</span>
            </button>
            
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              {showPreview ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              <span>{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
            </button>
          </div>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="w-1/2 bg-gray-900 p-4">
            <h3 className="text-white text-lg font-semibold mb-4">Live Preview</h3>
            <div className="bg-gray-800 rounded-lg overflow-hidden" style={{ height: '400px' }}>
              {matchId && (
                <iframe
                  src={`${window.location.origin}${window.location.pathname}?overlay=1&match=${matchId}`}
                  className="w-full h-full border-0"
                  style={{ 
                    transform: 'scale(0.4)', 
                    transformOrigin: 'top left', 
                    width: '250%', 
                    height: '250%'
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};