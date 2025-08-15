// URL Helper for cross-network overlay links
export class URLHelper {
  private static readonly PRODUCTION_URL = 'https://cricketzcore.web.app';
  private static readonly FIREBASE_HOSTING_URL = 'https://cricketzcore.firebaseapp.com';
  
  /**
   * Get the base URL for overlay links that works across networks
   */
  static getBaseURL(): string {
    // In production, always use the Firebase hosting URL
    if (process.env.NODE_ENV === 'production') {
      return this.PRODUCTION_URL;
    }
    
    // In development, check if we're already on a Firebase URL
    const currentHost = window.location.hostname;
    if (currentHost.includes('firebaseapp.com') || currentHost.includes('web.app')) {
      return window.location.origin;
    }
    
    // For local development, use local URL
    return window.location.origin + window.location.pathname;
  }
  
  /**
   * Generate overlay URL for OBS
   */
  static generateOverlayURL(matchId: string, panel?: string): string {
    const baseUrl = this.getBaseURL();
    const params = new URLSearchParams({
      overlay: '1',
      match: matchId
    });
    
    if (panel) {
      params.set('panel', panel);
    }
    
    return `${baseUrl}?${params.toString()}`;
  }
  
  /**
   * Generate preview URL for iframe
   */
  static generatePreviewURL(matchId: string): string {
    const baseUrl = this.getBaseURL();
    return `${baseUrl}?overlay=1&match=${matchId}&preview=1`;
  }
  
  /**
   * Check if current environment supports cross-network access
   */
  static isCrossNetworkReady(): boolean {
    return process.env.NODE_ENV === 'production' || 
           window.location.hostname.includes('firebaseapp.com') ||
           window.location.hostname.includes('web.app');
  }
  
  /**
   * Get user-friendly instructions for overlay setup
   */
  static getOverlayInstructions(): string {
    if (this.isCrossNetworkReady()) {
      return "These URLs work across different networks and devices. Perfect for OBS streaming!";
    } else {
      return "For cross-network access, deploy to Firebase Hosting first. Current URLs work locally only.";
    }
  }
}