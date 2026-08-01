import { CachedArtist } from './firestore';
import {
  clampPrice,
  derivePercentChangeFromHistory,
  seededRange,
  updateStockPrice,
} from './stockPrice';

/** One market tick per calendar day (24h). */
export const PRICE_TICK_MS = 24 * 60 * 60 * 1000;

function nameSeed(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function computeListenerGrowth(previous: number, current: number): number {
  if (previous <= 0) return 0;
  const raw = (current - previous) / previous;
  return Math.max(-0.2, Math.min(0.2, raw));
}

/** How many full daily ticks have elapsed since last update. */
export function elapsedPriceTicks(lastPriceUpdate: number, now = Date.now()): number {
  if (!lastPriceUpdate) return 0;
  return Math.floor((now - lastPriceUpdate) / PRICE_TICK_MS);
}

export function getPriceRefreshCountdownMs(lastPriceUpdate: number | undefined, now = Date.now()): number {
  if (!lastPriceUpdate) return 0;
  return Math.max(0, lastPriceUpdate + PRICE_TICK_MS - now);
}

export function formatPriceRefreshCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
    .toString()
    .padStart(2, '0')}`;
}

function formatHistoryDate(ts: number): string {
  const day = new Date(ts);
  return day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Apply one or more daily market ticks.
 * newPrice = oldPrice × (1 + listenerGrowth × 0.7) × (1 + random(-0.02, 0.02))
 */
export function applyMarketTicks(
  artist: CachedArtist,
  newListeners: number,
  newPlaycount: number
): CachedArtist {
  const lastPriceUpdate = artist.lastPriceUpdate ?? artist.lastUpdated ?? Date.now();
  const ticks = elapsedPriceTicks(lastPriceUpdate);

  if (ticks <= 0) {
    return {
      ...artist,
      listeners: newListeners,
      playcount: newPlaycount,
      lastPriceUpdate,
    };
  }

  const prevListeners = artist.previousListeners ?? artist.listeners ?? newListeners;
  const prevPlaycount = artist.previousPlaycount ?? artist.playcount ?? newPlaycount;

  const listenerGrowthTotal = computeListenerGrowth(prevListeners, newListeners);
  const playGrowthTotal = computeListenerGrowth(prevPlaycount, newPlaycount);

  // Spread total growth across elapsed days; play momentum adds a small daily boost
  const dailyListenerGrowth = listenerGrowthTotal / ticks;
  const dailyPlayBoost = (playGrowthTotal * 0.35) / ticks;

  let price = artist.price;
  const history = [...(artist.priceHistory || [])];
  const seed = nameSeed(artist.name);

  for (let t = 1; t <= ticks; t++) {
    const tickTime = lastPriceUpdate + t * PRICE_TICK_MS;
    const daySeed = seed + Math.floor(tickTime / PRICE_TICK_MS);
    const noise = seededRange(daySeed, -0.02, 0.02);
    const growth = dailyListenerGrowth + dailyPlayBoost;

    price = updateStockPrice(price, growth, noise);

    const dateLabel = formatHistoryDate(tickTime);
    const lastEntry = history[history.length - 1];
    if (!lastEntry || lastEntry.date !== dateLabel) {
      history.push({ date: dateLabel, price });
    } else {
      lastEntry.price = price;
    }
  }

  const trimmedHistory = history.slice(-14);
  const percentChange = derivePercentChangeFromHistory(trimmedHistory, price);

  return {
    ...artist,
    price: clampPrice(price),
    percentChange,
    listeners: newListeners,
    playcount: newPlaycount,
    previousListeners: newListeners,
    previousPlaycount: newPlaycount,
    priceHistory: trimmedHistory,
    lastPriceUpdate: lastPriceUpdate + ticks * PRICE_TICK_MS,
    lastUpdated: Date.now(),
  };
}

export function isPriceStale(artist: CachedArtist): boolean {
  const last = artist.lastPriceUpdate ?? artist.lastUpdated ?? 0;
  return elapsedPriceTicks(last) > 0;
}
