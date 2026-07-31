import { getCachedArtist, cacheArtist, CachedArtist } from './firestore';
import { getLastFmArtistInfo } from './lastfm';
import { PRICE_TICK_MS, applyMarketTicks } from './priceRefresh';
import { memoryGet, memorySet } from './memoryStore';
import ALL_ARTISTS from '../constants/artistsData.json';
import { buildPriceHistory } from './stockPrice';
import { calculateDiscoveryScore } from './discoveryScore';
import { getArtist } from './spotify';

export interface LivePrice {
  artistId: string;
  name: string;
  price: number;
  percentChange: number;
  lastPriceUpdate: number;
}

function nameSeed(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function publishLivePrice(artist: CachedArtist) {
  const live: LivePrice = {
    artistId: artist.id,
    name: artist.name,
    price: artist.price,
    percentChange: artist.percentChange ?? 0,
    lastPriceUpdate: artist.lastPriceUpdate ?? artist.lastUpdated,
  };
  memorySet('livePrices', artist.id, live);
  memorySet('cachedArtists', artist.id, artist);
}

export function getCachedLivePrice(artistId: string): LivePrice | null {
  return memoryGet<LivePrice>('livePrices', artistId);
}

function bootstrapFromLocal(artistId: string): CachedArtist | null {
  const local = (ALL_ARTISTS as any[]).find(
    (a) => a.id === artistId || a.name.toLowerCase() === artistId.toLowerCase()
  );
  if (!local) return null;

  const seed = nameSeed(local.name);
  const now = Date.now();
  return {
    id: local.id,
    name: local.name,
    imageUrl: local.imageUrl,
    genres: local.genres || ['indie', 'alternative'],
    followers: local.followers,
    listeners: local.listeners,
    playcount: local.playcount,
    discoveryScore: local.discoveryScore,
    badge: local.badge,
    price: local.price,
    percentChange: local.percentChange,
    previousListeners: local.listeners,
    previousPlaycount: local.playcount,
    priceHistory: buildPriceHistory(local.price, 7, seed),
    lastPriceUpdate: now,
    lastUpdated: now,
  };
}

function shouldRefreshMetrics(artist: CachedArtist | null, now = Date.now()): boolean {
  if (!artist) return true;
  const last = artist.lastMetricsRefresh ?? artist.lastUpdated ?? artist.lastPriceUpdate ?? 0;
  return !last || now - last >= 24 * 60 * 60 * 1000;
}

export async function refreshArtistMarketData(
  artistId: string,
  artistName?: string
): Promise<CachedArtist | null> {
  let artist: CachedArtist | null =
    memoryGet<CachedArtist>('cachedArtists', artistId) ||
    (await getCachedArtist(artistId));

  if (!artist) {
    artist = bootstrapFromLocal(artistId);
    if (artist && !artist.lastPriceUpdate) {
      artist.lastPriceUpdate = Date.now() - 2 * PRICE_TICK_MS;
    }
  }

  if (!artist && artistName) {
    artist = bootstrapFromLocal(artistName);
    if (artist && !artist.lastPriceUpdate) {
      artist.lastPriceUpdate = Date.now() - 2 * PRICE_TICK_MS;
    }
  }

  if (!artist) return null;

  const now = Date.now();
  const shouldRefresh = shouldRefreshMetrics(artist, now);
  const [spotifyData, lastFm] = await Promise.all([
    shouldRefresh ? getArtist(artistId) : Promise.resolve<Awaited<ReturnType<typeof getArtist>>>(null),
    getLastFmArtistInfo(artist.name),
  ]);

  const listeners = lastFm.listeners || artist.listeners || 10000;
  const playcount = lastFm.playcount || artist.playcount || 100000;
  const popularity = spotifyData?.popularity ?? (artist as any).popularity ?? 40;
  const seed = nameSeed(artist.name);
  const discovery = calculateDiscoveryScore(listeners, playcount, popularity, seed);

  const refreshedArtist: CachedArtist = {
    ...artist,
    id: artist.id,
    name: artist.name,
    imageUrl: artist.imageUrl || spotifyData?.imageUrl,
    genres: artist.genres?.length ? artist.genres : spotifyData?.genres || ['indie', 'alternative'],
    followers: spotifyData?.followers?.total ?? artist.followers ?? listeners,
    listeners,
    playcount,
    discoveryScore: discovery.score,
    badge: discovery.badge,
    previousListeners: artist.previousListeners ?? artist.listeners ?? listeners,
    previousPlaycount: artist.previousPlaycount ?? artist.playcount ?? playcount,
    priceHistory: artist.priceHistory?.length
      ? artist.priceHistory
      : buildPriceHistory(artist.price ?? discovery.initialPrice, 7, seed),
    lastMetricsRefresh: now,
    lastUpdated: now,
  };

  const updatedArtist = applyMarketTicks(refreshedArtist, listeners, playcount);
  const finalizedArtist: CachedArtist = {
    ...updatedArtist,
    discoveryScore: discovery.score,
    badge: discovery.badge,
    price: updatedArtist.price ?? discovery.initialPrice,
    percentChange: updatedArtist.percentChange ?? discovery.percentChange,
    priceHistory: updatedArtist.priceHistory?.length
      ? updatedArtist.priceHistory
      : buildPriceHistory(updatedArtist.price ?? discovery.initialPrice, 7, seed),
    lastMetricsRefresh: now,
    lastUpdated: now,
  };

  publishLivePrice(finalizedArtist);
  cacheArtist(finalizedArtist).catch(() => {});
  return finalizedArtist;
}

/**
 * Load artist market state, apply daily ticks if 24h+ passed, persist & cache live price.
 */
export async function refreshArtistMarketPrice(
  artistId: string,
  artistName?: string
): Promise<LivePrice | null> {
  const artist = await refreshArtistMarketData(artistId, artistName);
  return artist ? getCachedLivePrice(artist.id) : null;
}

/** Refresh prices for a batch (e.g. portfolio holdings). */
export async function refreshArtistPrices(
  artists: { artistId: string; artistName: string }[]
): Promise<void> {
  const unique = new Map<string, string>();
  for (const a of artists) {
    if (!unique.has(a.artistId)) unique.set(a.artistId, a.artistName);
  }
  await Promise.all(
    [...unique.entries()].map(([id, name]) => refreshArtistMarketPrice(id, name))
  );
}

/** Sync read — returns last refreshed price if available. */
export function lookupLivePrice(artistId: string): number | null {
  const live = getCachedLivePrice(artistId);
  if (live) return live.price;
  return null;
}

export async function resolveArtistPrice(
  artistId: string,
  artistName?: string
): Promise<number | null> {
  const live = await refreshArtistMarketPrice(artistId, artistName);
  return live?.price ?? null;
}
