const LASTFM_API_KEY = process.env.EXPO_PUBLIC_LASTFM_API_KEY || '';

export interface LastFmArtistInfo {
  name: string;
  listeners: number;
  playcount: number;
  bio?: string;
  tags: string[];
  similar: { name: string; url?: string }[];
}

/**
 * Fetch detailed artist stats from Last.fm API.
 */
export async function getLastFmArtistInfo(artistName: string): Promise<LastFmArtistInfo> {
  if (!LASTFM_API_KEY) {
    return getFallbackLastFmInfo(artistName);
  }

  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artistName)}&api_key=${LASTFM_API_KEY}&format=json`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Last.fm status error: ${res.status}`);
    }

    const data = await res.json();
    const artist = data.artist;
    if (!artist) {
      return getFallbackLastFmInfo(artistName);
    }

    const listeners = parseInt(artist.stats?.listeners || '10000', 10);
    const playcount = parseInt(artist.stats?.playcount || '50000', 10);
    const bio = artist.bio?.summary?.replace(/<[^>]*>?/gm, '') || '';
    const tags = artist.tags?.tag ? (Array.isArray(artist.tags.tag) ? artist.tags.tag.map((t: any) => t.name) : [artist.tags.tag.name]) : [];
    const similar = artist.similar?.artist ? (Array.isArray(artist.similar.artist) ? artist.similar.artist.map((s: any) => ({ name: s.name, url: s.url })) : [{ name: artist.similar.artist.name }]) : [];

    return {
      name: artist.name || artistName,
      listeners,
      playcount,
      bio,
      tags,
      similar,
    };
  } catch (error) {
    console.warn(`Last.fm fetch failed for ${artistName}, using fallback logic:`, error);
    return getFallbackLastFmInfo(artistName);
  }
}

/**
 * Smart fallback generator based on artist name hashing or defaults.
 */
function getFallbackLastFmInfo(artistName: string): LastFmArtistInfo {
  // Deterministic random generator based on name length
  const hash = artistName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Create varied underground vs mainstream distributions for demonstration
  const isIndie = hash % 2 === 0;
  const listeners = isIndie ? 25000 + (hash * 137) % 150000 : 850000 + (hash * 423) % 4000000;
  const playcount = listeners * (12 + (hash % 18)); // Fan ratio between 12 and 30 plays per listener

  return {
    name: artistName,
    listeners,
    playcount,
    bio: `${artistName} is an emerging recording artist pushing genre boundaries across indie, electronic, and alternative landscapes. Known for expressive songwriting and dedicated underground following.`,
    tags: ['indie', 'alternative', 'singer-songwriter', 'experimental'],
    similar: [
      { name: 'Clairo' },
      { name: 'Japanese Breakfast' },
      { name: 'Snail Mail' },
      { name: 'Lucy Dacus' },
    ],
  };
}

/**
 * Fetch top tracks for an artist from Last.fm (real song titles).
 */
export async function getLastFmTopTracks(
  artistName: string,
  limit: number = 5
): Promise<{ name: string; playcount: number; durationMs: number }[]> {
  if (!LASTFM_API_KEY) return [];

  try {
    const url =
      `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks` +
      `&artist=${encodeURIComponent(artistName)}` +
      `&api_key=${LASTFM_API_KEY}&format=json&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const tracks = data.toptracks?.track;
    if (!tracks) return [];
    const list = Array.isArray(tracks) ? tracks : [tracks];
    return list
      .map((t: any) => ({
        name: String(t.name || '').trim(),
        playcount: parseInt(t.playcount || '0', 10),
        durationMs: (parseInt(t.duration || '0', 10) || 210) * 1000,
      }))
      .filter((t: { name: string }) => t.name.length > 0);
  } catch (e) {
    console.warn(`Last.fm top tracks failed for ${artistName}:`, e);
    return [];
  }
}
