import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, off, push } from 'firebase/database';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
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

// Player Database Management
export async function savePlayerToDatabase(userId: string, player: any) {
  const playerRef = ref(database, `users/${userId}/players/${player.id}`);
  const playerData = {
    ...player,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  const cleanedPlayerData = removeUndefined(playerData);
  await set(playerRef, cleanedPlayerData);
}

export async function getPlayersFromDatabase(userId: string): Promise<any[]> {
  const playersRef = ref(database, `users/${userId}/players`);
  const snapshot = await get(playersRef);
  if (snapshot.exists()) {
    return Object.values(snapshot.val());
  }
  return [];
}

// Theme Settings Management
export async function saveThemeSettingsToFirebase(userId: string, themeSettings: any) {
  const themeRef = ref(database, `users/${userId}/themeSettings`);
  await set(themeRef, {
    ...themeSettings,
    updatedAt: Date.now()
  });
}

export async function getThemeSettingsFromFirebase(userId: string): Promise<any> {
  const themeRef = ref(database, `users/${userId}/themeSettings`);
  const snapshot = await get(themeRef);
  if (snapshot.exists()) {
    return snapshot.val();
  }
  return {
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
    footerGradient: 'linear-gradient(90deg, #1e3a8a 0%, #1d4ed8 50%, #3b82f6 100%)',
    panelBgColor: '#1e3a8a',
    panelTextColor: '#ffffff',
    panelBorderRadius: 12,
    panelPadding: 24,
    panelGradient: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #3b82f6 100%)',
    ballIndicatorSize: 32,
    ballIndicatorSpacing: 8,
    customCSS: ''
  };
}

// Overlay Settings (Firebase Realtime Database)
export async function saveOverlaySettingsToFirebase(userId: string, settings: any) {
  const settingsRef = ref(database, `users/${userId}/overlaySettings`);
  const cleanedSettings = removeUndefined(settings);
  await set(settingsRef, cleanedSettings);
}

export async function getOverlaySettingsFromFirebase(userId: string): Promise<any> {
  const settingsRef = ref(database, `users/${userId}/overlaySettings`);
  const snapshot = await get(settingsRef);
  if (snapshot.exists()) {
    return snapshot.val();
  }
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
    // Set up auth state listener
    onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      console.log('Auth state changed:', firebaseUser);
      
      if (firebaseUser) {
        this.currentUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || undefined,
          displayName: firebaseUser.displayName || firebaseUser.email || 'User'
        };
        
        console.log('User authenticated:', this.currentUser);
        LocalStorageManager.saveUserSession(this.currentUser);
      } else {
        this.currentUser = null;
        console.log('User signed out');
        LocalStorageManager.clearUserSession();
      }
      
      // Notify all callbacks
      this.authCallbacks.forEach(callback => {
        try {
          callback(this.currentUser);
        } catch (error) {
          console.error('Error in auth callback:', error);
        }
      });
    });
  }

  onAuthStateChanged(callback: (user: User | null) => void) {
    this.authCallbacks.push(callback);
    // Call immediately with current state
    callback(this.currentUser);
  }

  async signInWithEmail(email: string, password: string): Promise<User> {
    try {
      console.log('Attempting to sign in with email:', email);
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('Sign in successful:', result.user);
      
      const user: User = {
        uid: result.user.uid,
        email: result.user.email || undefined,
        displayName: result.user.displayName || result.user.email || 'User'
      };
      
      return user;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  async signUpWithEmail(email: string, password: string): Promise<User> {
    try {
      console.log('Attempting to create account with email:', email);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Account creation successful:', result.user);
      
      const user: User = {
        uid: result.user.uid,
        email: result.user.email || undefined,
        displayName: result.user.displayName || result.user.email || 'User'
      };
      
      return user;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      console.log('Signing out user');
      await signOut(auth);
      this.currentUser = null;
      LocalStorageManager.clearUserSession();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  async savePlayerToDatabase(userId: string, player: any): Promise<void> {
    await savePlayerToDatabase(userId, player);
  }

  async getPlayersFromDatabase(userId: string): Promise<any[]> {
    return await getPlayersFromDatabase(userId);
  }

  async saveThemeSettings(userId: string, themeSettings: any): Promise<void> {
    await saveThemeSettingsToFirebase(userId, themeSettings);
  }

  async getThemeSettings(userId: string): Promise<any> {
    return await getThemeSettingsFromFirebase(userId);
  }

  async createMatch(matchData: Omit<MatchState, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (!this.currentUser) {
      throw new Error('User must be authenticated to create matches');
    }
    
    console.log('Creating match for user:', this.currentUser.uid);
    
    const matchesRef = ref(database, `users/${this.currentUser.uid}/matches`);
    const newMatchRef = push(matchesRef);
    
    if (!newMatchRef.key) {
      throw new Error('Failed to generate match ID');
    }
    
    const match: MatchState = {
      ...matchData,
      id: newMatchRef.key,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const cleanedMatch = removeUndefined(match);
    console.log('Saving match to Firebase:', cleanedMatch);
    
    await set(newMatchRef, cleanedMatch);
    console.log('Match created successfully with ID:', match.id);
    
    return match.id;
  }

  async updateMatch(matchId: string, matchData: MatchState): Promise<void> {
    if (!this.currentUser) {
      throw new Error('User must be authenticated to update matches');
    }
    
    console.log('Updating match:', matchId, 'for user:', this.currentUser.uid);
    
    const matchRef = ref(database, `users/${this.currentUser.uid}/matches/${matchId}`);
    const updatedMatch = {
      ...matchData,
      updatedAt: Date.now()
    };
    
    const cleanedMatch = removeUndefined(updatedMatch);
    
    try {
      await set(matchRef, cleanedMatch);
      console.log('Match updated successfully');
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
    if (!this.currentUser) {
      console.log('No user authenticated, cannot get match');
      return null;
    }
    
    try {
      console.log('Getting match:', matchId, 'for user:', this.currentUser.uid);
      const matchRef = ref(database, `users/${this.currentUser.uid}/matches/${matchId}`);
      const snapshot = await get(matchRef);
      
      if (snapshot.exists()) {
        const match = normalizeMatchState(snapshot.val());
        console.log('Match loaded successfully:', match);
        LocalStorageManager.cacheMatch(matchId, match);
        LocalStorageManager.saveNetworkStatus(true);
        return match;
      } else {
        console.log('Match not found in Firebase, trying cache');
        return LocalStorageManager.getCachedMatch(matchId);
      }
    } catch (error) {
      console.error('Failed to get match online, trying cache:', error);
      LocalStorageManager.saveNetworkStatus(false);
      return LocalStorageManager.getCachedMatch(matchId);
    }
  }

  async getUserMatches(): Promise<MatchState[]> {
    if (!this.currentUser) {
      console.log('No user authenticated, cannot get matches');
      return [];
    }
    
    try {
      console.log('Getting matches for user:', this.currentUser.uid);
      const matchesRef = ref(database, `users/${this.currentUser.uid}/matches`);
      const snapshot = await get(matchesRef);
      
      if (!snapshot.exists()) {
        console.log('No matches found for user');
        return [];
      }
      
      const matches = snapshot.val();
      const matchList = Object.values(matches).map((match: any) => normalizeMatchState(match));
      console.log('Loaded matches:', matchList.length);
      return matchList;
    } catch (error) {
      console.error('Failed to get user matches:', error);
      return [];
    }
  }

  subscribeToMatch(matchId: string, callback: (match: MatchState | null) => void): () => void {
    if (!this.currentUser) {
      console.log('No user authenticated, cannot subscribe to match');
      callback(null);
      return () => {};
    }

    console.log('Subscribing to match:', matchId, 'for user:', this.currentUser.uid);
    const matchRef = ref(database, `users/${this.currentUser.uid}/matches/${matchId}`);
    
    const unsubscribe = onValue(matchRef, (snapshot) => {
      const match = snapshot.exists() ? normalizeMatchState(snapshot.val()) : null;
      
      if (match) {
        console.log('Match update received:', match.updatedAt);
        LocalStorageManager.cacheMatch(matchId, match);
        LocalStorageManager.saveNetworkStatus(true);
      }
      
      callback(match);
    }, (error) => {
      console.error('Firebase subscription error:', error);
      LocalStorageManager.saveNetworkStatus(false);
      
      const cachedMatch = LocalStorageManager.getCachedMatch(matchId);
      callback(cachedMatch);
    });

    return () => {
      console.log('Unsubscribing from match:', matchId);
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

  const unsubscribe = onValue(matchRef, (snapshot) => {
    const match = snapshot.exists() ? normalizeMatchState(snapshot.val()) : null;
    if (match) {
      LocalStorageManager.cacheMatch(matchId, match);
      console.debug('[firebase] public match update', { matchId, updatedAt: match.updatedAt });
    } else {
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
    if (snapshot.exists()) {
      return snapshot.val();
    }
    
    const matchRef = ref(database, `public_matches/${matchId}`);
    const matchSnapshot = await get(matchRef);
    if (matchSnapshot.exists()) {
      const matchData = matchSnapshot.val();
      if (matchData.ownerId) {
        const userSettingsRef = ref(database, `users/${matchData.ownerId}/overlaySettings`);
        const userSettingsSnapshot = await get(userSettingsRef);
        if (userSettingsSnapshot.exists()) {
          return userSettingsSnapshot.val();
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch overlay settings for match:', error);
  }

  return {
    showOverlay: true,
    showPlayerStats: true,
    showSidePanels: false,
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
    const payload = removeUndefined({ 
      ...match, 
      updatedAt: Date.now(),
      ownerId: firebaseService.getCurrentUser()?.uid
    });
    console.debug('[firebase] publishing match to public_matches', { matchId: match.id, updatedAt: payload.updatedAt });
    await set(publicRef, payload);
    
    const user = firebaseService.getCurrentUser();
    if (user) {
      const overlaySettings = await getOverlaySettingsFromFirebase(user.uid);
      const overlayRef = ref(database, `overlay_settings/${match.id}`);
      await set(overlayRef, removeUndefined(overlaySettings));
    }
  } catch (error) {
    console.error('Failed to publish match to public_matches:', error);
    throw error;
  }
}

export async function publishOverlaySettingsToPublic(matchId: string, settings: any): Promise<void> {
  try {
    const overlayRef = ref(database, `overlay_settings/${matchId}`);
    await set(overlayRef, removeUndefined({
      ...settings,
      updatedAt: Date.now()
    }));
  } catch (error) {
    console.error('Failed to publish overlay settings to public:', error);
    throw error;
  }
}

export async function getPublicMatchWithRetry(matchId: string, maxRetries: number = 3): Promise<MatchState | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const publicMatch = await getPublicMatchFromFirebase(matchId);
      if (publicMatch) {
        return publicMatch;
      }
      
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

export function subscribeToPublicOverlaySettings(matchId: string, callback: (settings: any) => void): () => void {
  const settingsRef = ref(database, `overlay_settings/${matchId}`);
  
  const unsubscribe = onValue(settingsRef, (snapshot) => {
    const settings = snapshot.exists() ? snapshot.val() : null;
    console.log('[firebase] overlay settings update', { 
      matchId, 
      hasSettings: !!settings,
      timestamp: settings?.updatedAt,
      triggers: settings ? {
        playerStats: settings.triggerPlayerStats,
        runRate: settings.triggerRunRate,
        matchSummary: settings.triggerMatchSummary,
        comparison: settings.triggerComparison,
        hideAll: settings.hideAllPanels
      } : null
    });
    callback(settings);
  }, (error) => {
    console.error('Failed to subscribe to public overlay settings:', error);
    callback(null);
  });
  
  return () => {
    off(settingsRef);
    if (unsubscribe) unsubscribe();
  };
}

export async function getPublicOverlaySettings(matchId: string): Promise<any> {
  try {
    const settingsRef = ref(database, `overlay_settings/${matchId}`);
    const snapshot = await get(settingsRef);
    if (snapshot.exists()) {
      return snapshot.val();
    }
  } catch (error) {
    console.error('Failed to get public overlay settings:', error);
  }
  
  return {
    showOverlay: true,
    showPlayerStats: true,
    showSidePanels: true,
    showRunRateChart: true,
    primaryColor: '#1e3a8a',
    secondaryColor: '#1d4ed8',
    accentColor: '#3b82f6',
    textColor: '#ffffff',
    teamAColor: '#3b82f6',
    teamBColor: '#ef4444',
    styleSettings: {
      footerBgColor: '#1e3a8a',
      footerTextColor: '#ffffff',
      footerGradient: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
      ballIndicatorSize: 28
    }
  };
}

export function subscribeToPublicMatchWithRetry(matchId: string, callback: (match: MatchState | null) => void): () => void {
  let unsubscribe: (() => void) | null = null;
  let retryCount = 0;
  const maxRetries = 5;
  
  const setupSubscription = () => {
    try {
      unsubscribe = subscribeToPublicMatch(matchId, (match) => {
        retryCount = 0;
        callback(match);
      });
    } catch (error) {
      console.error('Failed to setup public match subscription:', error);
      
      if (retryCount < maxRetries) {
        retryCount++;
        const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
        setTimeout(setupSubscription, delay);
      } else {
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