import ALL_ARTISTS from '../constants/artistsData.json';
import { generatePlaylistSongs, PlaylistPreferences, SuggestedSong } from './groq';
import {
  searchArtists,
  getArtistTopTracks,
  searchSpotifyTrack,
  SpotifyTrack,
} from './spotify';
import { getLastFmTopTracks } from './lastfm';

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
  investedArtists?: string[];
}

function pickLocalArtists(prefs: PlaylistPreferences, count: number): any[] {
  const genreSet = new Set(prefs.genres.map((g) => g.toLowerCase()));
  const seedNames = [
    ...(prefs.investedArtists || []),
    ...(prefs.favoriteArtists || []),
  ].map((a) => a.toLowerCase());
  const favSet = new Set(seedNames);

  let pool = (ALL_ARTISTS as any[]).filter((a) => {
    const genres: string[] = a.genres || [];
    const genreHit =
      genreSet.size === 0 ||
      genres.some((g) => [...genreSet].some((sel) => g.toLowerCase().includes(sel)));
    return genreHit;
  });

  if (pool.length < count) pool = ALL_ARTISTS as any[];

  pool = [...pool].sort((a, b) => {
    const aBoost = favSet.has(String(a.name).toLowerCase()) ? 200 : 0;
    const bBoost = favSet.has(String(b.name).toLowerCase()) ? 200 : 0;
    return bBoost + (b.discoveryScore || 0) - (aBoost + (a.discoveryScore || 0));
  });

  // Put invested/favorite artists first when they exist in catalog
  const prioritized: any[] = [];
  for (const name of seedNames) {
    const hit = (ALL_ARTISTS as any[]).find((a) => a.name.toLowerCase() === name);
    if (hit && !prioritized.some((p) => p.id === hit.id)) prioritized.push(hit);
  }

  const seed = prefs.mood.length + prefs.genres.join('').length + (Date.now() % 97);
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(((Math.sin(seed + i) + 1) / 2) * (i + 1)) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const combined = [...prioritized];
  for (const a of shuffled) {
    if (combined.some((c) => c.id === a.id)) continue;
    combined.push(a);
    if (combined.length >= count) break;
  }
  return combined.slice(0, count);
}

async function resolveArtistId(artistName: string): Promise<{ id: string; name: string }> {
  const results = await searchArtists(artistName);
  const match =
    results.find((r) => r.name.toLowerCase() === artistName.toLowerCase()) || results[0];
  if (match) return { id: match.id, name: match.name };

  const local = (ALL_ARTISTS as any[]).find(
    (a) => a.name.toLowerCase() === artistName.toLowerCase()
  );
  if (local) return { id: local.id, name: local.name };
  return { id: `name:${artistName}`, name: artistName };
}

async function tracksForArtist(
  artistId: string,
  artistName: string,
  perArtist: number
): Promise<PlaylistTrack[]> {
  // 1) Spotify top tracks (resolves local IDs by name)
  try {
    const top = await getArtistTopTracks(artistId, artistName);
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
    // continue
  }

  // 2) Last.fm top tracks — real song titles
  try {
    const lastFm = await getLastFmTopTracks(artistName, perArtist);
    if (lastFm.length > 0) {
      return lastFm.slice(0, perArtist).map((t, i) => ({
        id: `lfm-${artistId}-${i}-${t.name}`,
        name: t.name,
        artistName,
        artistId,
        durationMs: t.durationMs,
      }));
    }
  } catch {
    // continue
  }

  return [];
}

async function hydrateSuggestedSong(
  suggestion: SuggestedSong
): Promise<PlaylistTrack | null> {
  const resolved = await resolveArtistId(suggestion.artist);

  // Prefer exact Spotify track match for real metadata
  const spotifyTrack = await searchSpotifyTrack(suggestion.song, suggestion.artist);
  if (spotifyTrack) {
    return {
      id: spotifyTrack.id,
      name: spotifyTrack.name,
      artistName: suggestion.artist,
      artistId: resolved.id,
      durationMs: spotifyTrack.duration_ms,
      albumArt: spotifyTrack.album?.images?.[0]?.url,
    };
  }

  // Keep Groq song title even if Spotify miss — still a real name from the model
  return {
    id: `groq-${suggestion.artist}-${suggestion.song}`.replace(/\s+/g, '-').toLowerCase(),
    name: suggestion.song,
    artistName: suggestion.artist,
    artistId: resolved.id,
    durationMs: 210000,
  };
}

/**
 * Build an in-app playlist from genres + invested/favorite artists.
 * Uses Groq song suggestions when available, else Spotify/Last.fm top tracks.
 */
export async function buildPlaylist(prefs: PlaylistPreferences): Promise<BuiltPlaylist> {
  const targetTracks = Math.max(8, Math.min(prefs.length || 12, 24));
  const perArtist = 2;
  const artistCount = Math.ceil(targetTracks / perArtist);

  const invested = prefs.investedArtists?.filter(Boolean) || [];
  let source: 'groq' | 'local' = 'local';

  // 1) Groq song list (artist + song title)
  const suggestions = await generatePlaylistSongs({ ...prefs, length: targetTracks });
  const tracks: PlaylistTrack[] = [];
  const seen = new Set<string>();

  if (suggestions.length > 0) {
    source = 'groq';
    for (const suggestion of suggestions) {
      const track = await hydrateSuggestedSong(suggestion);
      if (!track) continue;
      const key = `${track.artistName.toLowerCase()}::${track.name.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      tracks.push(track);
      if (tracks.length >= targetTracks) break;
    }
  }

  // 2) Fill remaining from invested artists + genre-matched catalog via real top tracks
  if (tracks.length < targetTracks) {
    const resolved: { id: string; name: string }[] = [];

    for (const name of invested) {
      const r = await resolveArtistId(name);
      if (!resolved.some((x) => x.id === r.id)) resolved.push(r);
    }

    const locals = pickLocalArtists(prefs, artistCount + 4);
    for (const a of locals) {
      if (resolved.some((r) => r.id === a.id)) continue;
      resolved.push({ id: a.id, name: a.name });
      if (resolved.length >= artistCount + invested.length) break;
    }

    for (const artist of resolved) {
      const batch = await tracksForArtist(artist.id, artist.name, perArtist);
      for (const track of batch) {
        const key = `${track.artistName.toLowerCase()}::${track.name.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        tracks.push(track);
        if (tracks.length >= targetTracks) break;
      }
      if (tracks.length >= targetTracks) break;
    }
  }

  const genreLabel = prefs.genres[0] || 'indie';
  const title =
    invested.length > 0
      ? `${prefs.mood || 'Discovery'} · inspired by ${invested[0]}`
      : `${prefs.mood || 'Discovery'} · ${genreLabel}`;

  return {
    title,
    mood: prefs.mood,
    genres: prefs.genres,
    tracks: tracks.slice(0, targetTracks),
    source: tracks.length > 0 && suggestions.length > 0 ? source : tracks.length > 0 ? (suggestions.length ? 'groq' : 'local') : 'local',
    investedArtists: invested,
  };
}
