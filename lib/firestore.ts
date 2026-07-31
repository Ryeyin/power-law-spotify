import { db } from './firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  coins: number;
  lastRewardTimestamp?: number;
  createdAt: any;
  updatedAt?: any;
}

import { DiscoveryBadgeInfo } from './discoveryScore';

export interface CachedArtist {
  id: string;
  name: string;
  imageUrl?: string;
  genres: string[];
  followers: number;
  listeners: number;
  playcount: number;
  discoveryScore: number;
  badge: DiscoveryBadgeInfo;
  price: number;
  percentChange?: number;

  priceHistory: { date: string; price: number }[];
  bio?: string;
  topTracks?: { id: string; name: string; previewUrl?: string; durationMs: number }[];
  similarArtists?: { id: string; name: string; imageUrl?: string }[];
  /** Snapshot used to compute listener growth on the next tick */
  previousListeners?: number;
  previousPlaycount?: number;
  /** Timestamp of the last daily price tick */
  lastPriceUpdate?: number;
  /** Timestamp of the last live API refresh for discovery/price metrics */
  lastMetricsRefresh?: number;
  lastUpdated: number;
}

/**
 * Fetch a user profile document from Firestore.
 */
export async function getUserDoc(userId: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as UserProfile;
    }
    return null;
  } catch (error) {
    console.warn('Firestore getUserDoc error (using local state fallback):', error);
    return null;
  }
}

/**
 * Create a new user profile doc with default 1000 coins if it doesn't exist.
 */
export async function createUserDoc(userId: string, email: string, name?: string): Promise<UserProfile> {
  const newUser: UserProfile = {
    id: userId,
    email,
    name: name || email.split('@')[0],
    coins: 1000,
    createdAt: new Date().toISOString(),
  };

  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...newUser,
      createdAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore createUserDoc warning (operating in fallback mode):', error);
  }

  return newUser;
}

/**
 * Update user coin balance.
 */
export async function updateUserCoins(userId: string, newCoins: number): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      coins: newCoins,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn('Firestore updateUserCoins warning:', error);
  }
}

/**
 * Get cached artist info from Firestore.
 */
export async function getCachedArtist(artistId: string): Promise<CachedArtist | null> {
  try {
    const artistRef = doc(db, 'cachedArtists', artistId);
    const snap = await getDoc(artistRef);
    if (snap.exists()) {
      return snap.data() as CachedArtist;
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Cache combined artist info to Firestore.
 */
export async function cacheArtist(artistData: CachedArtist): Promise<void> {
  try {
    const artistRef = doc(db, 'cachedArtists', artistData.id);
    await setDoc(artistRef, artistData, { merge: true });
  } catch (error) {
    console.warn('Firestore cacheArtist warning:', error);
  }
}
