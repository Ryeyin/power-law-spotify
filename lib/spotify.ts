import ALL_ARTISTS from '../constants/artistsData.json';
import { calculateDiscoveryScore } from './discoveryScore';
import { getLastFmArtistInfo } from './lastfm';
import { buildPriceHistory, derivePercentChangeFromHistory } from './stockPrice';

const SPOTIFY_CLIENT_ID = (process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID || '').trim();
const SPOTIFY_CLIENT_SECRET = (process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_SECRET || '').trim();

let cachedToken: { token: string; expiresAt: number } | null = null;

export interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string; height?: number; width?: number }[];
  imageUrl?: string;
  genres: string[];
  followers: { total: number };
  popularity: number;
  discoveryScore?: number;
  badge?: any;
  price?: number;
  percentChange?: number;
  external_urls?: { spotify: string };
}

export interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms: number;
  preview_url: string | null;
  album: {
    name: string;
    images: { url: string }[];
  };
}

function toBase64(input: string): string {
  if (typeof btoa === 'function') {
    return btoa(input);
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = input;
  let output = '';
  for (
    let block = 0, charCode: number, i = 0, map = chars;
    str.charAt(i | 0) || (map = '=', i % 1);
    output += map.charAt(63 & (block >> (8 - (i % 1) * 8)))
  ) {
    charCode = str.charCodeAt((i += 3 / 4));
    block = (block << 8) | charCode;
  }
  return output;
}

/**
 * Obtain Client Credentials bearer token from Spotify API.
 */
export async function getSpotifyToken(): Promise<string | null> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || SPOTIFY_CLIENT_ID.includes('your_')) {
    return null;
  }

  try {
    const credentials = toBase64(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };
    return cachedToken.token;
  } catch (error) {
    return null;
  }
}

/**
 * Search across the 2,548 artists from artists_deduped.csv with category filtering & live API fallback.
 */
export async function searchArtists(query: string = '', categoryFilter: string = 'all'): Promise<SpotifyArtist[]> {
  const q = (query || '').toLowerCase().trim();

  // 1. Try Spotify Live API if query is provided and token is available
  if (q.length >= 2) {
    const token = await getSpotifyToken();
    if (token) {
      try {
        const res = await fetch(`https://api.spotify.com/v1/search?type=artist&q=${encodeURIComponent(q)}&limit=25`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          const items = data.artists?.items || [];
          if (items.length > 0) {
            const mapped = await Promise.all(items.map(async (art: any) => {
              const followers = art.followers?.total || 50000;
              const popularity = art.popularity || 50;
              const seed = art.name
                ? Math.abs(
                    [...art.name].reduce((h: number, c: string) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
                  )
                : followers;
              const lastFmInfo = await getLastFmArtistInfo(art.name);
              const listeners = lastFmInfo.listeners || followers;
              const playcount = lastFmInfo.playcount || Math.max(followers * 8, 10000);
              const discovery = calculateDiscoveryScore(listeners, playcount, popularity, seed);
              const history = buildPriceHistory(discovery.initialPrice, 7, seed);
              const percentChange = derivePercentChangeFromHistory(history, discovery.initialPrice);
              return {
                id: art.id,
                name: art.name,
                images: art.images || [],
                imageUrl: art.images?.[0]?.url || undefined,
                genres: art.genres || [],
                followers: { total: followers },
                popularity,
                discoveryScore: discovery.score,
                badge: discovery.badge,
                price: discovery.initialPrice,
                percentChange,
                external_urls: art.external_urls,
              };
            }));
            // Sort by price descending (most expensive on top)
            mapped.sort((a: SpotifyArtist, b: SpotifyArtist) => (b.price || 0) - (a.price || 0));
            return mapped;
          }
        }
      } catch (err) {
        // Fallback to local dataset below
      }
    }
  }

  // 2. Search local dataset of 2,548 artists
  let matches = ALL_ARTISTS as any[];

  // Filter by category
  if (categoryFilter && categoryFilter !== 'all') {
    matches = matches.filter(a => a.badge?.category === categoryFilter);
  }

  // Filter by query string (name or genre)
  if (q) {
    matches = matches.filter(a => 
      a.name.toLowerCase().includes(q) ||
      a.genres.some((g: string) => g.toLowerCase().includes(q))
    );
  }

  // Sort by price descending (most expensive on top)
  matches.sort((a: any, b: any) => (b.price || 0) - (a.price || 0));

  return matches.map((a: any) => {
    const history = buildPriceHistory(a.price || 20, 7, a.id?.length || 1);
    const percentChange = derivePercentChangeFromHistory(history, a.price || 20);
    return {
    id: a.id,
    name: a.name,
    images: [{ url: a.imageUrl }],
    imageUrl: a.imageUrl,
    genres: a.genres,
    followers: { total: a.followers },
    popularity: a.popularity,
    discoveryScore: a.discoveryScore,
    badge: a.badge,
      price: a.price,
      percentChange,
      external_urls: { spotify: 'https://open.spotify.com' },
    };
  });
}



/**
 * Get artist by ID from local dataset or Spotify API.
 */
export async function getArtist(artistId: string): Promise<SpotifyArtist | null> {
  const local = (ALL_ARTISTS as any[]).find(a => a.id === artistId || a.name.toLowerCase() === artistId.toLowerCase());
  if (local) {
    const history = buildPriceHistory(local.price || 20, 7, local.id?.length || 1);
    const percentChange = derivePercentChangeFromHistory(history, local.price || 20);
    return {
      id: local.id,
      name: local.name,
      images: [{ url: local.imageUrl }],
      imageUrl: local.imageUrl,
      genres: local.genres,
      followers: { total: local.followers },
      popularity: local.popularity,
      discoveryScore: local.discoveryScore,
      badge: local.badge,
      price: local.price,
      percentChange,
      external_urls: { spotify: 'https://open.spotify.com' },
    };
  }

  const token = await getSpotifyToken();
  if (!token) return null;

  try {
    const res = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    return null;
  }
}

/**
 * Get top tracks for artist.
 * Resolves local catalog IDs (artist-*) by searching Spotify for the artist name.
 * Returns [] instead of fake placeholder titles when APIs fail.
 */
export async function getArtistTopTracks(
  artistId: string,
  artistNameHint?: string
): Promise<SpotifyTrack[]> {
  const token = await getSpotifyToken();
  let spotifyId = artistId;

  // Local dataset IDs are not Spotify IDs — resolve by name search first
  if (!token) return [];

  if (artistId.startsWith('artist-') || artistNameHint) {
    const name =
      artistNameHint ||
      (ALL_ARTISTS as any[]).find((a) => a.id === artistId)?.name;
    if (name) {
      try {
        const res = await fetch(
          `https://api.spotify.com/v1/search?type=artist&q=${encodeURIComponent(name)}&limit=5`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          const items = data.artists?.items || [];
          const match =
            items.find(
              (a: any) => a.name?.toLowerCase() === name.toLowerCase()
            ) || items[0];
          if (match?.id) spotifyId = match.id;
        }
      } catch {
        // continue with original id
      }
    }
  }

  if (spotifyId.startsWith('artist-')) return [];

  try {
    const res = await fetch(
      `https://api.spotify.com/v1/artists/${spotifyId}/top-tracks?market=US`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.ok) {
      const data = await res.json();
      return data.tracks || [];
    }
  } catch (e) {}

  return [];
}

/**
 * Search Spotify for a specific track by song + artist name.
 */
export async function searchSpotifyTrack(
  song: string,
  artist: string
): Promise<SpotifyTrack | null> {
  const token = await getSpotifyToken();
  if (!token) return null;

  try {
    const q = `track:${song} artist:${artist}`;
    const res = await fetch(
      `https://api.spotify.com/v1/search?type=track&q=${encodeURIComponent(q)}&limit=5`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const items = data.tracks?.items || [];
    if (items.length === 0) return null;

    const lowerSong = song.toLowerCase();
    const lowerArtist = artist.toLowerCase();
    const exact =
      items.find(
        (t: any) =>
          t.name?.toLowerCase() === lowerSong &&
          t.artists?.some((a: any) => a.name?.toLowerCase() === lowerArtist)
      ) ||
      items.find((t: any) =>
        t.artists?.some((a: any) => a.name?.toLowerCase() === lowerArtist)
      ) ||
      items[0];

    return exact as SpotifyTrack;
  } catch {
    return null;
  }
}
