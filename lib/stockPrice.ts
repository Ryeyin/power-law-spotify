/** Min / max share price in coins. */
export const MIN_PRICE = 8;
export const MAX_PRICE = 320;

/**
 * Deterministic 0–1 value from a numeric seed (stable across regenerations).
 */
export function seededUnit(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Seeded value in [min, max].
 */
export function seededRange(seed: number, min: number, max: number): number {
  return min + seededUnit(seed) * (max - min);
}

export function clampPrice(price: number): number {
  return Math.max(MIN_PRICE, Math.min(MAX_PRICE, Math.round(price * 100) / 100));
}

export function percentChangeFrom(oldPrice: number, newPrice: number): number {
  if (!oldPrice) return 0;
  return Math.round(((newPrice - oldPrice) / oldPrice) * 1000) / 10;
}

export function derivePercentChangeFromHistory(
  history: Array<{ price: number }> | undefined,
  currentPrice: number
): number {
  if (!history?.length) return 0;
  const firstPrice = history[0]?.price;
  if (!firstPrice || firstPrice <= 0) return 0;
  return percentChangeFrom(firstPrice, currentPrice);
}

/**
 * Market sentiment update (Stage 7 formula):
 * newPrice = oldPrice × (1 + listenerGrowth × 0.7) × (1 + random(-0.02, 0.02))
 *
 * `listenerGrowth` is a fractional change (e.g. 0.05 = +5% listeners).
 * Pass `marketNoise` for deterministic bootstrap; omit for live ±2% randomness.
 */
export function updateStockPrice(
  oldPrice: number,
  listenerGrowth: number,
  marketNoise?: number
): number {
  const noise =
    typeof marketNoise === 'number'
      ? Math.max(-0.02, Math.min(0.02, marketNoise))
      : Math.random() * 0.04 - 0.02;

  const next = oldPrice * (1 + listenerGrowth * 0.7) * (1 + noise);
  return clampPrice(next);
}

export interface InitialPriceInput {
  discoveryScore: number;
  listeners: number;
  playcount: number;
  popularity?: number;
  /** Stable seed (e.g. name hash) so the same artist always gets the same bootstrap price. */
  seed: number;
}

export interface InitialPriceResult {
  basePrice: number;
  price: number;
  percentChange: number;
  listenerGrowth: number;
  marketNoise: number;
}

/**
 * Bootstrap price from discovery metrics + simulated market move.
 * Uses continuous inputs so artists rarely share the exact same price.
 */
export function calculateInitialPrice(input: InitialPriceInput): InitialPriceResult {
  const listeners = Math.max(input.listeners || 10, 10);
  const playcount = Math.max(input.playcount || 100, 100);
  const popularity = Math.max(0, Math.min(100, input.popularity ?? 40));
  const score = Math.max(1, Math.min(99, input.discoveryScore));
  const fanRatio = playcount / listeners;
  const seed = input.seed;

  const discoveryComponent = score * 0.45;
  const demandComponent = popularity * 1.25;
  const sizeComponent = Math.log10(listeners) * 6.2;
  const engagementComponent = Math.min(fanRatio, 80) * 0.35;
  const fineNoise =
    seededRange(seed, 0, 48) +
    seededRange(seed + 17, -10, 10) +
    ((seed % 9973) / 9973) * 22;

  const rawBase =
    5 + discoveryComponent + demandComponent + sizeComponent + engagementComponent + fineNoise;

  const basePrice = clampPrice(rawBase);

  // Simulated listener growth (−12% … +12%) and market sentiment (±2%)
  const listenerGrowth = seededRange(seed + 41, -0.12, 0.12);
  const marketNoise = seededRange(seed + 73, -0.02, 0.02);
  const price = updateStockPrice(basePrice, listenerGrowth, marketNoise);
  let percentChange = percentChangeFrom(basePrice, price);
  if (percentChange === 0) {
    percentChange = Math.round(seededRange(seed + 99, -1.8, 2.4) * 10) / 10;
  }

  return { basePrice, price, percentChange, listenerGrowth, marketNoise };
}

/**
 * Build a short synthetic price history ending at `currentPrice`,
 * walking backward with reverse market moves (seeded per day).
 */
export function buildPriceHistory(
  currentPrice: number,
  days: number,
  seed: number
): { date: string; price: number }[] {
  const prices: number[] = [clampPrice(currentPrice)];
  let price = currentPrice;

  for (let i = 1; i < days; i++) {
    const growth = seededRange(seed + i * 13, -0.06, 0.06);
    const noise = seededRange(seed + i * 29, -0.02, 0.02);
    const factor = (1 + growth * 0.7) * (1 + noise);
    price = clampPrice(price / Math.max(factor, 0.85));
    prices.unshift(price);
  }

  return prices.map((p, i) => {
    const day = new Date();
    day.setDate(day.getDate() - (days - 1 - i));
    return {
      date: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: p,
    };
  });
}
