import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { memoryDelete, memoryQueryByUserId, memorySet } from './memoryStore';
import { BuiltPlaylist, PlaylistTrack } from './playlistBuilder';

export interface SavedPlaylist {
  id: string;
  userId: string;
  title: string;
  mood: string;
  genres: string[];
  tracks: PlaylistTrack[];
  source: 'groq' | 'local';
  investedArtists?: string[];
  createdAt: string;
}

export async function savePlaylist(
  userId: string,
  playlist: BuiltPlaylist
): Promise<SavedPlaylist> {
  const id = `pl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const saved: SavedPlaylist = {
    id,
    userId,
    title: playlist.title,
    mood: playlist.mood,
    genres: playlist.genres,
    tracks: playlist.tracks,
    source: playlist.source,
    investedArtists: playlist.investedArtists,
    createdAt: new Date().toISOString(),
  };

  memorySet('savedPlaylists', id, saved);
  try {
    await setDoc(doc(db, 'savedPlaylists', id), {
      ...saved,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Firestore savePlaylist warning:', e);
  }
  return saved;
}

export async function getSavedPlaylists(userId: string): Promise<SavedPlaylist[]> {
  const local = memoryQueryByUserId<SavedPlaylist>('savedPlaylists', userId);
  try {
    const q = query(collection(db, 'savedPlaylists'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const remote: SavedPlaylist[] = [];
    snap.forEach((d) => {
      const data = { id: d.id, ...d.data() } as SavedPlaylist;
      // Firestore timestamps may not be ISO strings
      if (data.createdAt && typeof data.createdAt !== 'string') {
        data.createdAt = new Date().toISOString();
      }
      memorySet('savedPlaylists', data.id, data);
      remote.push(data);
    });
    if (remote.length > 0) {
      return remote.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
  } catch (e) {
    console.warn('Firestore getSavedPlaylists warning:', e);
  }
  return local.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function deleteSavedPlaylist(userId: string, playlistId: string): Promise<void> {
  memoryDelete('savedPlaylists', playlistId);
  try {
    await deleteDoc(doc(db, 'savedPlaylists', playlistId));
  } catch (e) {
    console.warn('Firestore deleteSavedPlaylist warning:', e);
  }
}
