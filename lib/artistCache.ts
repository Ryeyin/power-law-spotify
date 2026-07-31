import { SpotifyArtist, getArtist, getArtistTopTracks } from './spotify';
import { getLastFmArtistInfo } from './lastfm';
import { calculateDiscoveryScore } from './discoveryScore';
import { getCachedArtist, cacheArtist, CachedArtist } from './firestore';
import { buildPriceHistory } from './stockPrice';
import { refreshArtistMarketData } from './artistPrices';
import ALL_ARTISTS from '../constants/artistsData.json';

function nameSeed(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

async function enrichWithTopTracks(artist: CachedArtist): Promise<CachedArtist> {
  const topTracks = await getArtistTopTracks(artist.id, artist.name);
  if (topTracks.length === 0) return artist;
  return {
    ...artist,
    topTracks: topTracks.map((t) => ({
      id: t.id,
      name: t.name,
      previewUrl: t.preview_url || undefined,
      durationMs: t.duration_ms,
    })),
  };
}

/**
 * Get unified artist profile with live daily price ticks applied when stale.
 */
export async function getUnifiedArtistDetail(
  artistId: string,
  spotifyArtistParam?: SpotifyArtist
): Promise<CachedArtist> {
  const local = (ALL_ARTISTS as any[]).find(
    (a) => a.id === artistId || a.name.toLowerCase() === artistId.toLowerCase()
  );

  // Ensure market price is current (applies daily ticks if 24h+ elapsed)
  const refreshedArtist = await refreshArtistMarketData(artistId, local?.name);
  const cached =
    (await getCachedArtist(artistId)) ||
    (local
      ? ({
          id: local.id,
          name: local.name,
          imageUrl: local.imageUrl,
          genres: local.genres || ['indie', 'alternative'],
          followers: local.followers,
          listeners: local.listeners,
          playcount: local.playcount,
          discoveryScore: refreshedArtist?.discoveryScore ?? local.discoveryScore,
          badge: refreshedArtist?.badge ?? local.badge,
          price: refreshedArtist?.price ?? local.price,
          percentChange: refreshedArtist?.percentChange ?? local.percentChange,
          priceHistory: buildPriceHistory(refreshedArtist?.price ?? local.price, 7, nameSeed(local.name)),
          lastUpdated: Date.now(),
          lastPriceUpdate: refreshedArtist?.lastPriceUpdate ?? Date.now(),
          lastMetricsRefresh: refreshedArtist?.lastMetricsRefresh ?? Date.now(),
        } as CachedArtist)
      : null);

  if (local && cached) {
    const lastFmInfo = await getLastFmArtistInfo(local.name);
    let fullArtist: CachedArtist = {
      ...cached,
      id: local.id,
      name: local.name,
      imageUrl: local.imageUrl,
      genres: local.genres || ['indie', 'alternative'],
      followers: local.followers,
      listeners: lastFmInfo.listeners || cached.listeners,
      playcount: lastFmInfo.playcount || cached.playcount,
      discoveryScore: local.discoveryScore,
      badge: local.badge,
      price: cached.price,
      percentChange: cached.percentChange,
      priceHistory: cached.priceHistory?.length
        ? cached.priceHistory
        : buildPriceHistory(cached.price, 7, nameSeed(local.name)),
      bio:
        lastFmInfo.bio ||
        `${local.name} is a recording artist with ${local.followers.toLocaleString()} followers on Spotify.`,
      topTracks: cached.topTracks || [],
      similarArtists: (lastFmInfo.similar || []).slice(0, 5).map((s, idx) => ({
        id: `sim-${idx}`,
        name: s.name,
        imageUrl: `https://picsum.photos/seed/${s.name}/200`,
      })),
      lastUpdated: Date.now(),
    };

    fullArtist = await enrichWithTopTracks(fullArtist);
    cacheArtist(fullArtist).catch(() => {});
    return fullArtist;
  }

  // Live Spotify artist not in local catalog
  const spotifyData = spotifyArtistParam || (await getArtist(artistId));
  const artistName = spotifyData?.name || 'Unknown Artist';
  const seed = nameSeed(artistName);

  const [lastFmInfo, topTracks, refreshed] = await Promise.all([
    getLastFmArtistInfo(artistName),
    getArtistTopTracks(artistId, artistName),
    refreshArtistMarketData(artistId, artistName),
  ]);

  const discovery = calculateDiscoveryScore(
    lastFmInfo.listeners,
    lastFmInfo.playcount,
    spotifyData?.popularity ?? 40,
    seed
  );

  const currentPrice = refreshed?.price ?? discovery.initialPrice;

  const fullArtist: CachedArtist = {
    id: artistId,
    name: artistName,
    imageUrl: spotifyData?.imageUrl || spotifyData?.images?.[0]?.url || local?.imageUrl,
    genres: spotifyData?.genres || ['indie', 'alternative'],
    followers: spotifyData?.followers?.total || lastFmInfo.listeners,
    listeners: lastFmInfo.listeners,
    playcount: lastFmInfo.playcount,
    discoveryScore: refreshed?.discoveryScore ?? discovery.score,
    badge: refreshed?.badge ?? discovery.badge,
    price: currentPrice,
    percentChange: refreshed?.percentChange ?? discovery.percentChange,
    priceHistory: buildPriceHistory(currentPrice, 7, seed),
    previousListeners: lastFmInfo.listeners,
    previousPlaycount: lastFmInfo.playcount,
    lastPriceUpdate: refreshed?.lastPriceUpdate ?? Date.now(),
    lastMetricsRefresh: refreshed?.lastMetricsRefresh ?? Date.now(),
    bio: lastFmInfo.bio,
    topTracks: topTracks.map((t) => ({
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
