// Overlay Settings (Firebase Realtime Database)
export async function saveOverlaySettingsToFirebase(userId: string, settings: any) {
  const settingsRef = ref(database, `users/${userId}/overlaySettings`);
  await set(settingsRef, settings);
}

export async function getOverlaySettingsFromFirebase(userId: string): Promise<any> {
  const settingsRef = ref(database, `users/${userId}/overlaySettings`);
  const snapshot = await get(settingsRef);
  if (snapshot.exists()) {
    return snapshot.val();
  }
  // Default settings if not found
  return {
    showOverlay: true,
    showPlayerStats: true,
    showRunRateChart: true,
    showFullscreenPlayerStats: false,
    showFullscreenRunRate: false,
    showFullscreenMatchSummary: false,
    showComparisonChart: false,
    fullscreenDuration: 10,
    primaryColor: '#1e3a8a',
    secondaryColor: '#1d4ed8',
    accentColor: '#3b82f6',
    textColor: '#ffffff',
    teamAColor: '#3b82f6',
    teamBColor: '#ef4444',
    teamAOpacity: 0.9,
    teamBOpacity: 0.9,
    hideAllPanels: false,
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
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, off, push } from 'firebase/database';
import { getAuth, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { MatchState, User, OverlayStyleSettings } from './types';
import { LocalStorageManager } from './utils/localStorage';

// Helper function to normalize match data from Firebase
function normalizeMatchState(match: any): MatchState {
  return {
    ...match,
    teamA: {
      ...match.teamA,
      players: match.teamA?.players || [],
      extras: match.teamA?.extras || { wides: 0, noballs: 0, byes: 0, legbyes: 0, penalties: 0 }
    },
    teamB: {
      ...match.teamB,
      players: match.teamB?.players || [],
      extras: match.teamB?.extras || { wides: 0, noballs: 0, byes: 0, legbyes: 0, penalties: 0 }
    },
    innings1: {
      ...match.innings1,
      events: match.innings1?.events || []
    },
    innings2: match.innings2 ? {
      ...match.innings2,
      events: match.innings2?.events || []
    } : undefined
  };
}

const firebaseConfig = {
  apiKey: "AIzaSyCRRBLrD9_4c-d_H1A0Ed279YDC9EvvTqo",
  authDomain: "cricketzcore.firebaseapp.com",
  projectId: "cricketzcore",
  storageBucket: "cricketzcore.firebasestorage.app",
  messagingSenderId: "1057255365604",
  appId: "1:1057255365604:web:5aefc789071800783185f1",
  measurementId: "G-ZRYMGKMRD3",
  databaseURL: "https://cricketzcore-default-rtdb.firebaseio.com/",
  // Add the hosting URL for cross-network access
  hostingURL: "https://cricketzcore.web.app"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const auth = getAuth(app);

// Utility function to recursively remove undefined values from objects
function removeUndefined(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  }

  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = removeUndefined(value);
    }
  }
  return cleaned;
}

export class FirebaseService {
  private static instance: FirebaseService;
  private currentUser: User | null = null;
  private authCallbacks: ((user: User | null) => void)[] = [];

  static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  constructor() {
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user ? {
        uid: user.uid,
        email: user.email || undefined,
        displayName: user.displayName || undefined
      } : null;
      
      // Save/clear user session in localStorage
      if (this.currentUser) {
        LocalStorageManager.saveUserSession(this.currentUser);
      } else {
        LocalStorageManager.clearUserSession();
      }
      
      this.authCallbacks.forEach(callback => callback(this.currentUser));
    });
    
    // Try to restore user session from localStorage
    const savedSession = LocalStorageManager.getUserSession();
    if (savedSession && !this.currentUser) {
      // Note: This won't actually authenticate with Firebase, but provides session continuity
      // The user will need to re-authenticate for Firebase operations
    }
  }

  onAuthStateChanged(callback: (user: User | null) => void) {
    this.authCallbacks.push(callback);
    callback(this.currentUser); // Call immediately with current state
  }

  async signInAnonymously(): Promise<User> {
    const result = await signInAnonymously(auth);
    return {
      uid: result.user.uid,
      displayName: 'Anonymous User'
    };
  }

  async signInWithEmail(email: string, password: string): Promise<User> {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return {
      uid: result.user.uid,
      email: result.user.email || undefined,
      displayName: result.user.displayName || undefined
    };
  }

  async signUpWithEmail(email: string, password: string): Promise<User> {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return {
      uid: result.user.uid,
      email: result.user.email || undefined,
      displayName: result.user.displayName || undefined
    };
  }

  async signOut(): Promise<void> {
    await signOut(auth);
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  async createMatch(matchData: Omit<MatchState, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (!this.currentUser) throw new Error('User must be authenticated');
    
    const matchesRef = ref(database, `users/${this.currentUser.uid}/matches`);
    const newMatchRef = push(matchesRef);
    
    const match: MatchState = {
      ...matchData,
      id: newMatchRef.key!,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await set(newMatchRef, match);
    return match.id;
  }

  async updateMatch(matchId: string, matchData: MatchState): Promise<void> {
    if (!this.currentUser) throw new Error('User must be authenticated');
    
    const matchRef = ref(database, `users/${this.currentUser.uid}/matches/${matchId}`);
    const updatedMatch = {
      ...matchData,
      updatedAt: Date.now()
    };
    
    // Remove undefined values before sending to Firebase
    const cleanedMatch = removeUndefined(updatedMatch);
    
    try {
      await set(matchRef, cleanedMatch);
      // Cache the match locally for offline support
      LocalStorageManager.cacheMatch(matchId, cleanedMatch);
      LocalStorageManager.saveNetworkStatus(true);
    } catch (error) {
      console.error('Failed to update match online, saving locally:', error);
      LocalStorageManager.cacheMatch(matchId, cleanedMatch);
      LocalStorageManager.saveNetworkStatus(false);
      throw error;
    }
  }

  async getMatch(matchId: string): Promise<MatchState | null> {
    if (!this.currentUser) return null;
    
    try {
      const matchRef = ref(database, `users/${this.currentUser.uid}/matches/${matchId}`);
      const snapshot = await get(matchRef);
      
      if (snapshot.exists()) {
        const match = normalizeMatchState(snapshot.val());
        // Cache the match locally
        LocalStorageManager.cacheMatch(matchId, match);
        LocalStorageManager.saveNetworkStatus(true);
        return match;
      }
      
      // If not found online, try local cache
      return LocalStorageManager.getCachedMatch(matchId);
    } catch (error) {
      console.error('Failed to get match online, trying cache:', error);
      LocalStorageManager.saveNetworkStatus(false);
      return LocalStorageManager.getCachedMatch(matchId);
    }
  }

  async getUserMatches(): Promise<MatchState[]> {
    if (!this.currentUser) return [];
    
    const matchesRef = ref(database, `users/${this.currentUser.uid}/matches`);
    const snapshot = await get(matchesRef);
    
    if (!snapshot.exists()) return [];
    
    const matches = snapshot.val();
    return Object.values(matches).map((match: any) => normalizeMatchState(match));
  }

  subscribeToMatch(matchId: string, callback: (match: MatchState | null) => void): () => void {
    if (!this.currentUser) {
      callback(null);
      return () => {};
    }

    const matchRef = ref(database, `users/${this.currentUser.uid}/matches/${matchId}`);
    
    const unsubscribe = onValue(matchRef, (snapshot) => {
      const match = snapshot.exists() ? normalizeMatchState(snapshot.val()) : null;
      
      if (match) {
        // Cache the match locally for offline support
        LocalStorageManager.cacheMatch(matchId, match);
        LocalStorageManager.saveNetworkStatus(true);
      }
      
      callback(match);
    }, (error) => {
      console.error('Firebase subscription error:', error);
      LocalStorageManager.saveNetworkStatus(false);
      
      // Try to get cached version when online fails
      const cachedMatch = LocalStorageManager.getCachedMatch(matchId);
      callback(cachedMatch);
    });

    return () => {
      off(matchRef);
      if (unsubscribe) unsubscribe();
    };
  }
}

export const firebaseService = FirebaseService.getInstance();

// Public/read-only helpers for overlays and public matches
export async function getPublicMatchFromFirebase(matchId: string): Promise<MatchState | null> {
  try {
    const matchRef = ref(database, `public_matches/${matchId}`);
    const snapshot = await get(matchRef);
    if (snapshot.exists()) {
      return normalizeMatchState(snapshot.val());
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch public match:', error);
    return null;
  }
}

export function subscribeToPublicMatch(matchId: string, callback: (match: MatchState | null) => void): () => void {
  const matchRef = ref(database, `public_matches/${matchId}`);

  // Debug: log when public subscription receives updates
  const unsubscribe = onValue(matchRef, (snapshot) => {
    const match = snapshot.exists() ? normalizeMatchState(snapshot.val()) : null;
    if (match) {
      // Cache and log the update for troubleshooting
      LocalStorageManager.cacheMatch(matchId, match);
      // eslint-disable-next-line no-console
      console.debug('[firebase] public match update', { matchId, updatedAt: match.updatedAt });
    } else {
      // eslint-disable-next-line no-console
      console.debug('[firebase] public match snapshot empty', { matchId });
    }
    callback(match);
  }, (error) => {
    console.error('Firebase public subscription error:', error);
    const cachedMatch = LocalStorageManager.getCachedMatch(matchId);
    callback(cachedMatch);
  });

  return () => {
    off(matchRef);
    if (unsubscribe) unsubscribe();
  };
}

export async function getOverlaySettingsForMatch(matchId: string): Promise<any> {
  try {
    const settingsRef = ref(database, `overlay_settings/${matchId}`);
    const snapshot = await get(settingsRef);
    if (snapshot.exists()) return snapshot.val();
  } catch (error) {
    console.error('Failed to fetch overlay settings for match:', error);
  }

  // Return same defaults as existing function
  return {
    showOverlay: true,
    showPlayerStats: true,
    showRunRateChart: true,
    showFullscreenPlayerStats: false,
    showFullscreenRunRate: false,
    showFullscreenMatchSummary: false,
    showComparisonChart: false,
    fullscreenDuration: 10,
    primaryColor: '#1e3a8a',
    secondaryColor: '#1d4ed8',
    accentColor: '#3b82f6',
    textColor: '#ffffff',
    teamAColor: '#3b82f6',
    teamBColor: '#ef4444',
    teamAOpacity: 0.9,
    teamBOpacity: 0.9,
    hideAllPanels: false
  };
}

export async function publishMatchToPublic(match: MatchState): Promise<void> {
  try {
    const publicRef = ref(database, `public_matches/${match.id}`);
    const payload = removeUndefined({ ...match, updatedAt: Date.now() });
    // Debug: log publish intent
    // eslint-disable-next-line no-console
    console.debug('[firebase] publishing match to public_matches', { matchId: match.id, updatedAt: payload.updatedAt });
    await set(publicRef, payload);
  } catch (error) {
    console.error('Failed to publish match to public_matches:', error);
    throw error;
  }
}

// Enhanced public match access for unauthenticated users
export async function getPublicMatchWithRetry(matchId: string, maxRetries: number = 3): Promise<MatchState | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const publicMatch = await getPublicMatchFromFirebase(matchId);
      if (publicMatch) {
        return publicMatch;
      }
      
      // If no public match found, wait a bit and retry
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    } catch (error) {
      console.error(`Attempt ${attempt} failed to fetch public match:`, error);
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }
  return null;
}

// Subscribe to public match with enhanced error handling
export function subscribeToPublicMatchWithRetry(matchId: string, callback: (match: MatchState | null) => void): () => void {
  let unsubscribe: (() => void) | null = null;
  let retryCount = 0;
  const maxRetries = 5;
  
  const setupSubscription = () => {
    try {
      unsubscribe = subscribeToPublicMatch(matchId, (match) => {
        retryCount = 0; // Reset retry count on successful update
        callback(match);
      });
    } catch (error) {
      console.error('Failed to setup public match subscription:', error);
      
      // Retry with exponential backoff
      if (retryCount < maxRetries) {
        retryCount++;
        const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
        setTimeout(setupSubscription, delay);
      } else {
        // Fallback to cached data
        const cachedMatch = LocalStorageManager.getCachedMatch(matchId);
        callback(cachedMatch);
      }
    }
  };
  
  setupSubscription();
  
  return () => {
    if (unsubscribe) {
      unsubscribe();
    }
  };
}