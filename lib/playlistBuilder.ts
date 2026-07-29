import ALL_ARTISTS from '../constants/artistsData.json';
import { generatePlaylistArtists, PlaylistPreferences } from './groq';
import { searchArtists, getArtistTopTracks, SpotifyTrack } from './spotify';

export interface PlaylistTrack {
  id: string;
  name: string;
  artistName: string;
  artistId: string;
  durationMs: number;
  albumArt?: string;
}

export interface BuiltPlaylist {
  title: string;
  mood: string;
  genres: string[];
  tracks: PlaylistTrack[];
  source: 'groq' | 'local';
}

function pickLocalArtists(prefs: PlaylistPreferences, count: number): any[] {
  const genreSet = new Set(prefs.genres.map((g) => g.toLowerCase()));
  const favSet = new Set(prefs.favoriteArtists.map((a) => a.toLowerCase()));

  let pool = (ALL_ARTISTS as any[]).filter((a) => {
    const genres: string[] = a.genres || [];
    const genreHit =
      genreSet.size === 0 ||
      genres.some((g) => [...genreSet].some((sel) => g.toLowerCase().includes(sel)));
    return genreHit;
  });

  if (pool.length < count) pool = ALL_ARTISTS as any[];

  // Prefer artists near favorites by shared genre
  pool = [...pool].sort((a, b) => {
    const aBoost = favSet.has(String(a.name).toLowerCase()) ? 100 : 0;
    const bBoost = favSet.has(String(b.name).toLowerCase()) ? 100 : 0;
    return bBoost + (b.discoveryScore || 0) - (aBoost + (a.discoveryScore || 0));
  });

  // Seeded shuffle for variety
  const seed = prefs.mood.length + prefs.genres.join('').length + Date.now() % 97;
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(((Math.sin(seed + i) + 1) / 2) * (i + 1)) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

async function tracksForArtist(
  artistId: string,
  artistName: string,
  perArtist: number
): Promise<PlaylistTrack[]> {
  try {
    const top = await getArtistTopTracks(artistId);
    if (top.length > 0) {
      return top.slice(0, perArtist).map((t: SpotifyTrack) => ({
        id: t.id,
        name: t.name,
        artistName,
        artistId,
        durationMs: t.duration_ms,
        albumArt: t.album?.images?.[0]?.url,
      }));
    }
  } catch {
    // fall through to synthetic
  }

  return Array.from({ length: perArtist }, (_, i) => ({
    id: `${artistId}-track-${i}`,
    name: `${artistName} — ${['Midnight Drive', 'Soft Static', 'Neon Bloom', 'Low Tide'][i % 4]}`,
    artistName,
    artistId,
    durationMs: 180000 + i * 15000,
  }));
}

/**
 * Build an in-app playlist from preferences (Groq when available, else local catalog).
 * Does not write to the user's Spotify account.
 */
export async function buildPlaylist(prefs: PlaylistPreferences): Promise<BuiltPlaylist> {
  const targetTracks = Math.max(8, Math.min(prefs.length || 12, 24));
  const perArtist = 2;
  const artistCount = Math.ceil(targetTracks / perArtist);

  let source: 'groq' | 'local' = 'local';
  let artistNames = await generatePlaylistArtists({ ...prefs, length: targetTracks });

  const resolved: { id: string; name: string }[] = [];

  if (artistNames.length > 0) {
    source = 'groq';
    for (const name of artistNames) {
      const results = await searchArtists(name);
      const match =
        results.find((r) => r.name.toLowerCase() === name.toLowerCase()) || results[0];
      if (match) resolved.push({ id: match.id, name: match.name });
      if (resolved.length >= artistCount) break;
    }
  }

  if (resolved.length < artistCount) {
    source = resolved.length > 0 ? source : 'local';
    const locals = pickLocalArtists(prefs, artistCount - resolved.length + 2);
    for (const a of locals) {
      if (resolved.some((r) => r.id === a.id)) continue;
      resolved.push({ id: a.id, name: a.name });
      if (resolved.length >= artistCount) break;
    }
  }

  const tracks: PlaylistTrack[] = [];
  for (const artist of resolved) {
    const batch = await tracksForArtist(artist.id, artist.name, perArtist);
    tracks.push(...batch);
    if (tracks.length >= targetTracks) break;
  }

  const title = `${prefs.mood || 'Discovery'} · ${(prefs.genres[0] || 'indie').toString()}`;

  return {
    title,
    mood: prefs.mood,
    genres: prefs.genres,
    tracks: tracks.slice(0, targetTracks),
    source,
  };
}
