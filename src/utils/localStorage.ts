import { OverlayStyleSettings } from '../types';

// Local Storage utility for cricket scoring app
export class LocalStorageManager {
  private static readonly KEYS = {
    USER_SESSION: 'cricketZCore_userSession',
    CURRENT_MATCH: 'cricketZCore_currentMatch',
    MATCH_CACHE: 'cricketZCore_matchCache',
    OVERLAY_SETTINGS: 'cricketZCore_overlaySettings'
  };

  // User Session Management
  static saveUserSession(user: any): void {
    try {
      localStorage.setItem(this.KEYS.USER_SESSION, JSON.stringify({
        ...user,
        savedAt: Date.now()
      }));
    } catch (error) {
      console.error('Failed to save user session:', error);
    }
  }

  static getUserSession(): any | null {
    try {
      const saved = localStorage.getItem(this.KEYS.USER_SESSION);
      if (!saved) return null;
      
      const session = JSON.parse(saved);
      // Check if session is less than 30 days old
      if (Date.now() - session.savedAt > 30 * 24 * 60 * 60 * 1000) {
        this.clearUserSession();
        return null;
      }
      
      return session;
    } catch (error) {
      console.error('Failed to get user session:', error);
      return null;
    }
  }

  static clearUserSession(): void {
    try {
      localStorage.removeItem(this.KEYS.USER_SESSION);
    } catch (error) {
      console.error('Failed to clear user session:', error);
    }
  }

  // Current Match Management
  static saveCurrentMatch(match: any): void {
    try {
      localStorage.setItem(this.KEYS.CURRENT_MATCH, JSON.stringify({
        ...match,
        cachedAt: Date.now()
      }));
    } catch (error) {
      console.error('Failed to save current match:', error);
    }
  }

  static getCurrentMatch(): any | null {
    try {
      const saved = localStorage.getItem(this.KEYS.CURRENT_MATCH);
      if (!saved) return null;
      
      const match = JSON.parse(saved);
      return match;
    } catch (error) {
      console.error('Failed to get current match:', error);
      return null;
    }
  }

  static clearCurrentMatch(): void {
    try {
      localStorage.removeItem(this.KEYS.CURRENT_MATCH);
    } catch (error) {
      console.error('Failed to clear current match:', error);
    }
  }

  // Match Cache for Offline Support
  static cacheMatch(matchId: string, matchData: any): void {
    try {
      const cache = this.getMatchCache();
      cache[matchId] = {
        ...matchData,
        cachedAt: Date.now()
      };
      localStorage.setItem(this.KEYS.MATCH_CACHE, JSON.stringify(cache));
    } catch (error) {
      console.error('Failed to cache match:', error);
    }
  }

  static getCachedMatch(matchId: string): any | null {
    try {
      const cache = this.getMatchCache();
      return cache[matchId] || null;
    } catch (error) {
      console.error('Failed to get cached match:', error);
      return null;
    }
  }

  static getMatchCache(): Record<string, any> {
    try {
      const cache = localStorage.getItem(this.KEYS.MATCH_CACHE);
      return cache ? JSON.parse(cache) : {};
    } catch (error) {
      console.error('Failed to get match cache:', error);
      return {};
    }
  }

  static clearOldCache(): void {
    try {
      const cache = this.getMatchCache();
      const now = Date.now();
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      
      const cleanedCache: Record<string, any> = {};
      Object.entries(cache).forEach(([matchId, data]: [string, any]) => {
        if (now - data.cachedAt < oneWeek) {
          cleanedCache[matchId] = data;
        }
      });
      
      localStorage.setItem(this.KEYS.MATCH_CACHE, JSON.stringify(cleanedCache));
    } catch (error) {
      console.error('Failed to clear old cache:', error);
    }
  }

  // Overlay Settings
  static saveOverlaySettings(settings: any): void {
    try {
      localStorage.setItem(this.KEYS.OVERLAY_SETTINGS, JSON.stringify({
        ...settings,
        savedAt: Date.now()
      }));
    } catch (error) {
      console.error('Failed to save overlay settings:', error);
    }
  }

  static getOverlaySettings(): any {
    try {
      const settings = localStorage.getItem(this.KEYS.OVERLAY_SETTINGS);
      return settings ? JSON.parse(settings) : {
        showOverlay: true,
        showPlayerStats: true,
        showSidePanels: true,
        showRunRateChart: true,
        showFullscreenPlayerStats: false,
        showFullscreenRunRate: false,
        showFullscreenMatchSummary: false,
        showComparisonChart: false,
        fullscreenDuration: 10,
        autoCycle: 'off',
        triggerPlayerStats: 0,
        triggerRunRate: 0,
        triggerMatchSummary: 0,
        triggerComparison: 0,
        hideAllPanels: 0,
        primaryColor: '#1e3a8a',
        secondaryColor: '#1d4ed8',
        accentColor: '#3b82f6',
        textColor: '#ffffff'
      };
    } catch (error) {
      console.error('Failed to get overlay settings:', error);
      return {
        showOverlay: true,
        showPlayerStats: true,
        showSidePanels: true,
        showRunRateChart: true,
        showFullscreenPlayerStats: false,
        showFullscreenRunRate: false,
        showFullscreenMatchSummary: false,
        showComparisonChart: false,
        fullscreenDuration: 10,
        autoCycle: 'off',
        triggerPlayerStats: 0,
        triggerRunRate: 0,
        triggerMatchSummary: 0,
        triggerComparison: 0,
        hideAllPanels: 0,
        primaryColor: '#1e3a8a',
        secondaryColor: '#1d4ed8',
        accentColor: '#3b82f6',
        textColor: '#ffffff',
        teamAColor: '#3b82f6',
        teamBColor: '#ef4444',
        teamAOpacity: 0.9,
        teamBOpacity: 0.9,
        styleSettings: {
          footerBgColor: '#1e3a8a',
          footerTextColor: '#ffffff',
          footerBorderRadius: 8,
          footerPadding: 16,
          footerTextAlignment: 'center' as const,
          footerGradient: 'linear-gradient(90deg, #1e3a8a 0%, #1d4ed8 50%, #3b82f6 100%)',
          panelBgColor: '#1e3a8a',
          panelTextColor: '#ffffff',
          panelBorderRadius: 12,
          panelPadding: 24,
          panelGradient: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #3b82f6 100%)',
          ballIndicatorSize: 32,
          ballIndicatorSpacing: 8,
          customCSS: ''
        }
      };
    }
  }

  // Theme Settings Management
  static saveThemeSettings(themeSettings: any): void {
    try {
      localStorage.setItem('cricketZCore_themeSettings', JSON.stringify({
        ...themeSettings,
        savedAt: Date.now()
      }));
    } catch (error) {
      console.error('Failed to save theme settings:', error);
    }
  }

  static getThemeSettings(): any {
    try {
      const settings = localStorage.getItem('cricketZCore_themeSettings');
      return settings ? JSON.parse(settings) : {
        primaryColor: '#1e3a8a',
        secondaryColor: '#1d4ed8',
        accentColor: '#3b82f6',
        textColor: '#ffffff',
        teamAColor: '#3b82f6',
        teamBColor: '#ef4444',
        teamAOpacity: 0.9,
        teamBOpacity: 0.9,
        footerBgColor: '#1e3a8a',
        footerTextColor: '#ffffff',
        footerBorderRadius: 8,
        footerPadding: 16,
        footerTextAlignment: 'center',
        footerGradient: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #a855f7 100%)',
        panelBgColor: '#1e3a8a',
        panelTextColor: '#ffffff',
        panelBorderRadius: 12,
        panelPadding: 24,
        panelGradient: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #3b82f6 100%)',
        ballIndicatorSize: 32,
        ballIndicatorSpacing: 8,
        customCSS: ''
      };
    } catch (error) {
      console.error('Failed to get theme settings:', error);
      return {
        primaryColor: '#1e3a8a',
        secondaryColor: '#1d4ed8',
        accentColor: '#3b82f6',
        textColor: '#ffffff',
        teamAColor: '#3b82f6',
        teamBColor: '#ef4444',
        teamAOpacity: 0.9,
        teamBOpacity: 0.9
      };
    }
  }

  // Network Status
  static saveNetworkStatus(isOnline: boolean): void {
    try {
      localStorage.setItem('cricketZCore_networkStatus', JSON.stringify({
        isOnline,
        lastUpdate: Date.now()
      }));
    } catch (error) {
      console.error('Failed to save network status:', error);
    }
  }

  static getNetworkStatus(): { isOnline: boolean; lastUpdate: number } {
    try {
      const status = localStorage.getItem('cricketZCore_networkStatus');
      return status ? JSON.parse(status) : { isOnline: true, lastUpdate: Date.now() };
    } catch (error) {
      console.error('Failed to get network status:', error);
      return { isOnline: true, lastUpdate: Date.now() };
    }
  }
}