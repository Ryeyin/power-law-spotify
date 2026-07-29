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
}

/**
 * Calculates Discovery Score (40 - 100).
 */
export function calculateDiscoveryScore(listeners: number, playcount: number): DiscoveryScoreResult {
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

  const initialPrice = Math.max(10, Math.min(150, Math.round(score * 0.9 + 10)));

  return {
    score,
    listenerScore: Math.round(listenerScore * 100) / 100,
    playScore: Math.round(playScore * 100) / 100,
    fanScore: Math.round(fanScore * 100) / 100,
    fanRatio: Math.round(fanRatio * 10) / 10,
    badge,
    initialPrice,
  };
}
