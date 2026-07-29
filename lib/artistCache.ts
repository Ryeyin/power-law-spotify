import { SpotifyArtist, getArtist, getArtistTopTracks } from './spotify';
import { getLastFmArtistInfo } from './lastfm';
import { calculateDiscoveryScore } from './discoveryScore';
import { getCachedArtist, cacheArtist, CachedArtist } from './firestore';
import ALL_ARTISTS from '../constants/artistsData.json';

/**
 * Get unified artist profile with cached metrics, local 2548 dataset, or live API fetch.
 */
export async function getUnifiedArtistDetail(artistId: string, spotifyArtistParam?: SpotifyArtist): Promise<CachedArtist> {
  // 1. Check Firestore cache first
  const existing = await getCachedArtist(artistId);
  if (existing && Date.now() - (existing.lastUpdated || 0) < 3600 * 1000) {
    return existing;
  }

  // 2. Check local dataset of 2,548 artists
  const local = (ALL_ARTISTS as any[]).find(a => a.id === artistId || a.name.toLowerCase() === artistId.toLowerCase());
  
  if (local) {
    const basePrice = local.price || 45;
    const priceHistory = Array.from({ length: 7 }, (_, i) => {
      const day = new Date();
      day.setDate(day.getDate() - (6 - i));
      const variation = Math.sin(i * 1.3) * 5 + ((i - 3) * 1.5);
      const dayPrice = Math.max(5, Math.min(200, Math.round((basePrice + variation) * 10) / 10));
      return {
        date: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        price: dayPrice,
      };
    });

    const lastFmInfo = await getLastFmArtistInfo(local.name);

    const fullArtist: CachedArtist = {
      id: local.id,
      name: local.name,
      imageUrl: local.imageUrl,
      genres: local.genres || ['indie', 'alternative'],
      followers: local.followers,
      listeners: lastFmInfo.listeners || local.listeners,
      playcount: lastFmInfo.playcount || local.playcount,
      discoveryScore: local.discoveryScore,
      badge: local.badge,
      price: basePrice,
      priceHistory,
      bio: lastFmInfo.bio || `${local.name} is a recording artist with ${local.followers.toLocaleString()} followers on Spotify.`,
      topTracks: [
        { id: 't1', name: `${local.name} - Greatest Hit`, durationMs: 215000 },
        { id: 't2', name: `${local.name} - Live Performance`, durationMs: 198000 },
        { id: 't3', name: `${local.name} - Acoustic Session`, durationMs: 232000 },
      ],
      similarArtists: (lastFmInfo.similar || []).slice(0, 5).map((s, idx) => ({
        id: `sim-${idx}`,
        name: s.name,
        imageUrl: `https://picsum.photos/seed/${s.name}/200`,
      })),
      lastUpdated: Date.now(),
    };

    // Cache asynchronously
    cacheArtist(fullArtist).catch(() => {});
    return fullArtist;
  }

  // 3. Fallback to live Spotify fetch if ID isn't in local dataset
  const spotifyData = spotifyArtistParam || (await getArtist(artistId));
  const artistName = spotifyData?.name || 'Unknown Artist';

  const [lastFmInfo, topTracks] = await Promise.all([
    getLastFmArtistInfo(artistName),
    getArtistTopTracks(artistId),
  ]);

  const discovery = calculateDiscoveryScore(lastFmInfo.listeners, lastFmInfo.playcount);

  const basePrice = discovery.initialPrice;
  const priceHistory = Array.from({ length: 7 }, (_, i) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - i));
    const variation = Math.sin(i * 1.5) * 4 + ((i - 3) * 1.2);
    const dayPrice = Math.max(5, Math.min(150, Math.round((basePrice + variation) * 10) / 10));
    return {
      date: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: dayPrice,
    };
  });

  const fullArtist: CachedArtist = {
    id: artistId,
    name: artistName,
    imageUrl: spotifyData?.imageUrl || spotifyData?.images?.[0]?.url || 'https://picsum.photos/300',
    genres: spotifyData?.genres || ['indie', 'alternative'],
    followers: spotifyData?.followers?.total || lastFmInfo.listeners,
    listeners: lastFmInfo.listeners,
    playcount: lastFmInfo.playcount,
    discoveryScore: discovery.score,
    badge: discovery.badge,
    price: basePrice,
    priceHistory,
    bio: lastFmInfo.bio,
    topTracks: topTracks.map(t => ({
      id: t.id,
      name: t.name,
      previewUrl: t.preview_url || undefined,
      durationMs: t.duration_ms,
    })),
    similarArtists: lastFmInfo.similar.map((s, idx) => ({
      id: `sim-${idx}`,
      name: s.name,
      imageUrl: `https://picsum.photos/seed/${s.name}/200`,
    })),
    lastUpdated: Date.now(),
  };

  cacheArtist(fullArtist).catch(() => {});
  return fullArtist;
}
