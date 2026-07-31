import ALL_ARTISTS from '../constants/artistsData.json';
import { lookupLivePrice } from './artistPrices';

/** Look up current price — prefers live market price over static catalog. */
export function lookupArtistPrice(artistId: string): number | null {
  const live = lookupLivePrice(artistId);
  if (live !== null) return live;

  const local = (ALL_ARTISTS as any[]).find(
    (a) => a.id === artistId || a.name?.toLowerCase() === artistId.toLowerCase()
  );
  return typeof local?.price === 'number' ? local.price : null;
}

export function lookupArtistMeta(artistId: string): {
  price: number;
  percentChange: number;
  imageUrl?: string;
  discoveryScore?: number;
  name?: string;
} | null {
  const local = (ALL_ARTISTS as any[]).find(
    (a) => a.id === artistId || a.name?.toLowerCase() === artistId.toLowerCase()
  );
  if (!local) return null;

  const livePrice = lookupLivePrice(artistId);
  return {
    price: livePrice ?? local.price,
    percentChange: local.percentChange ?? 0,
    imageUrl: local.imageUrl,
    discoveryScore: local.discoveryScore,
    name: local.name,
  };
}
