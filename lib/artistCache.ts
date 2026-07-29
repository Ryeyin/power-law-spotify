import { SpotifyArtist, getArtist, getArtistTopTracks } from './spotify';
import { getLastFmArtistInfo } from './lastfm';
import { calculateDiscoveryScore } from './discoveryScore';
import { getCachedArtist, cacheArtist, CachedArtist } from './firestore';
import { buildPriceHistory } from './stockPrice';
import ALL_ARTISTS from '../constants/artistsData.json';

function nameSeed(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

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
    const currentPrice = local.price || 45;
    const seed = nameSeed(local.name);
    const priceHistory = buildPriceHistory(currentPrice, 7, seed);

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
      price: currentPrice,
      percentChange: local.percentChange,
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
  const seed = nameSeed(artistName);

  const [lastFmInfo, topTracks] = await Promise.all([
    getLastFmArtistInfo(artistName),
    getArtistTopTracks(artistId),
  ]);

  const discovery = calculateDiscoveryScore(
    lastFmInfo.listeners,
    lastFmInfo.playcount,
    spotifyData?.popularity ?? 40,
    seed
  );

  const currentPrice = discovery.initialPrice;
  const priceHistory = buildPriceHistory(currentPrice, 7, seed);

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
    price: currentPrice,
    percentChange: discovery.percentChange,
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
