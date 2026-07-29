import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { memoryDelete, memoryGet, memoryQueryByUserId, memorySet } from './memoryStore';

export interface TrackedArtist {
  id: string;
  userId: string;
  artistId: string;
  artistName: string;
  imageUrl?: string;
  discoveryScore?: number;
  price?: number;
  percentChange?: number;
  badgeLabel?: string;
  trackedAt: string;
}

function trackId(userId: string, artistId: string) {
  return `${userId}_${artistId}`;
}

export async function trackArtist(
  userId: string,
  artist: {
    id: string;
    name: string;
    imageUrl?: string;
    discoveryScore?: number;
    price?: number;
    percentChange?: number;
    badgeLabel?: string;
  }
): Promise<TrackedArtist> {
  const id = trackId(userId, artist.id);
  const tracked: TrackedArtist = {
    id,
    userId,
    artistId: artist.id,
    artistName: artist.name,
    imageUrl: artist.imageUrl,
    discoveryScore: artist.discoveryScore,
    price: artist.price,
    percentChange: artist.percentChange,
    badgeLabel: artist.badgeLabel,
    trackedAt: new Date().toISOString(),
  };

  memorySet('trackedArtists', id, tracked);
  try {
    await setDoc(doc(db, 'trackedArtists', id), {
      ...tracked,
      trackedAt: serverTimestamp(),
    }, { merge: true });
  } catch (e) {
    console.warn('Firestore trackArtist warning:', e);
  }
  return tracked;
}

export async function untrackArtist(userId: string, artistId: string): Promise<void> {
  const id = trackId(userId, artistId);
  memoryDelete('trackedArtists', id);
  try {
    await deleteDoc(doc(db, 'trackedArtists', id));
  } catch (e) {
    console.warn('Firestore untrackArtist warning:', e);
  }
}

export async function getTrackedArtists(userId: string): Promise<TrackedArtist[]> {
  const local = memoryQueryByUserId<TrackedArtist>('trackedArtists', userId);
  try {
    const q = query(collection(db, 'trackedArtists'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const remote: TrackedArtist[] = [];
    snap.forEach((d) => {
      const data = d.data() as TrackedArtist;
      memorySet('trackedArtists', data.id || d.id, data);
      remote.push(data);
    });
    if (remote.length > 0) {
      return remote.sort(
        (a, b) => new Date(b.trackedAt).getTime() - new Date(a.trackedAt).getTime()
      );
    }
  } catch (e) {
    console.warn('Firestore getTrackedArtists warning:', e);
  }
  return local.sort(
    (a, b) => new Date(b.trackedAt).getTime() - new Date(a.trackedAt).getTime()
  );
}

export async function isArtistTracked(userId: string, artistId: string): Promise<boolean> {
  const id = trackId(userId, artistId);
  if (memoryGet('trackedArtists', id)) return true;
  try {
    const snap = await getDoc(doc(db, 'trackedArtists', id));
    return snap.exists();
  } catch {
    return false;
  }
}
