import ALL_ARTISTS from '../constants/artistsData.json';
import { calculateDiscoveryScore } from './discoveryScore';

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
            return items.map((art: any) => {
              const followers = art.followers?.total || 50000;
              const discovery = calculateDiscoveryScore(followers, followers * 15);
              return {
                id: art.id,
                name: art.name,
                images: art.images || [],
                imageUrl: art.images?.[0]?.url || 'https://picsum.photos/300',
                genres: art.genres || [],
                followers: { total: followers },
                popularity: art.popularity || 50,
                discoveryScore: discovery.score,
                badge: discovery.badge,
                price: discovery.initialPrice,
                external_urls: art.external_urls,
              };
            });
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

  return matches.map((a: any) => ({
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
    percentChange: a.percentChange || 1.2,
    external_urls: { spotify: 'https://open.spotify.com' },
  }));
}



/**
 * Get artist by ID from local dataset or Spotify API.
 */
export async function getArtist(artistId: string): Promise<SpotifyArtist | null> {
  const local = (ALL_ARTISTS as any[]).find(a => a.id === artistId || a.name.toLowerCase() === artistId.toLowerCase());
  if (local) {
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
 */
export async function getArtistTopTracks(artistId: string): Promise<SpotifyTrack[]> {
  const token = await getSpotifyToken();
  if (token && !artistId.startsWith('artist-')) {
    try {
      const res = await fetch(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        return data.tracks || [];
      }
    } catch (e) {}
  }

  // Fallback track list
  const local = (ALL_ARTISTS as any[]).find(a => a.id === artistId);
  const name = local?.name || 'Artist';

  return [
    { id: 't1', name: `${name} - Top Anthem`, duration_ms: 214000, preview_url: null, album: { name: 'Greatest Hits', images: [{ url: 'https://picsum.photos/300' }] } },
    { id: 't2', name: `${name} - Midnight Session`, duration_ms: 198000, preview_url: null, album: { name: 'Greatest Hits', images: [{ url: 'https://picsum.photos/300' }] } },
    { id: 't3', name: `${name} - Acoustic Remix`, duration_ms: 245000, preview_url: null, album: { name: 'Greatest Hits', images: [{ url: 'https://picsum.photos/300' }] } },
  ];
}
