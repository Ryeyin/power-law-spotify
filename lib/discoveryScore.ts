import { buildPriceHistory, calculateInitialPrice, derivePercentChangeFromHistory } from './stockPrice';

export interface DiscoveryBadgeInfo {
  category: 'underground' | 'rising_star';
  label: string;
  color: string;
  bgLight: string;
}

export interface DiscoveryScoreResult {
  score: number; // 40 - 100
  listenerScore: number;
  playScore: number;
  fanScore: number;
  fanRatio: number;
  badge: DiscoveryBadgeInfo;
  initialPrice: number;
  percentChange: number;
  basePrice: number;
}

/**
 * Calculates Discovery Score (40 - 100) and a varied market price.
 */
export function calculateDiscoveryScore(
  listeners: number,
  playcount: number,
  popularity: number = 40,
  seed: number = 0
): DiscoveryScoreResult {
  const safeListeners = Math.max(listeners || 10, 10);
  const safePlaycount = Math.max(playcount || 100, 100);

  const listenerScore = Math.min(Math.max(Math.log10(safeListeners) / 8.5, 0), 1);
  const playScore = Math.min(Math.max(Math.log10(safePlaycount) / 10, 0), 1);
  const fanRatio = safePlaycount / safeListeners;
  const fanScore = 0.6;

  const rawScore = 70 * (1 - listenerScore) + 20 * playScore + 10 * fanScore;
  const score = Math.min(Math.max(Math.round(rawScore), 40), 99);

  let badge: DiscoveryBadgeInfo;

  if (score >= 70) {
    badge = {
      category: 'underground',
      label: 'Underground',
      color: '#14B8A6',
      bgLight: 'rgba(20, 184, 166, 0.15)',
    };
  } else {
    badge = {
      category: 'rising_star',
      label: 'Rising Star',
      color: '#F59E0B',
      bgLight: 'rgba(245, 158, 11, 0.15)',
    };
  }

  const priced = calculateInitialPrice({
    discoveryScore: score,
    listeners: safeListeners,
    playcount: safePlaycount,
    popularity,
    seed: seed || Math.round(safeListeners + safePlaycount + score * 17),
  });

  const priceHistory = buildPriceHistory(priced.price, 7, seed || Math.round(safeListeners + safePlaycount + score * 17));

  return {
    score,
    listenerScore: Math.round(listenerScore * 100) / 100,
    playScore: Math.round(playScore * 100) / 100,
    fanScore: Math.round(fanScore * 100) / 100,
    fanRatio: Math.round(fanRatio * 10) / 10,
    badge,
    initialPrice: priced.price,
    percentChange: derivePercentChangeFromHistory(priceHistory, priced.price),
    basePrice: priced.basePrice,
  };
}
