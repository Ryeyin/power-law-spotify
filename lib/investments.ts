import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  updateDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { updateUserCoins } from './firestore';
import { recordTransaction } from './transactions';
import { memoryDelete, memoryGet, memoryQueryByUserId, memorySet } from './memoryStore';

export interface Investment {
  id: string;
  userId: string;
  artistId: string;
  artistName: string;
  imageUrl?: string;
  shares: number;
  purchasePrice: number;
  createdAt: string;
}

export interface BuyResult {
  investment: Investment;
  newCoins: number;
  totalCost: number;
}

export interface SellResult {
  newCoins: number;
  proceeds: number;
  profit: number;
}

function investmentId(userId: string, artistId: string) {
  return `${userId}_${artistId}`;
}

/**
 * Buy shares of an artist. Merges into an existing holding when present.
 */
export async function buyShares(
  userId: string,
  artist: {
    id: string;
    name: string;
    imageUrl?: string;
    price: number;
  },
  shares: number,
  currentCoins: number
): Promise<BuyResult> {
  if (shares < 1) throw new Error('Share count must be at least 1');
  const price = artist.price;
  const totalCost = Math.round(price * shares * 100) / 100;
  if (totalCost > currentCoins) throw new Error('Insufficient coins');

  const id = investmentId(userId, artist.id);
  const existing =
    (await getInvestmentById(id)) ||
    memoryGet<Investment>('investments', id);

  let investment: Investment;
  if (existing) {
    const totalShares = existing.shares + shares;
    const avgPrice =
      (existing.purchasePrice * existing.shares + price * shares) / totalShares;
    investment = {
      ...existing,
      shares: totalShares,
      purchasePrice: Math.round(avgPrice * 100) / 100,
      imageUrl: artist.imageUrl || existing.imageUrl,
      artistName: artist.name,
    };
  } else {
    investment = {
      id,
      userId,
      artistId: artist.id,
      artistName: artist.name,
      imageUrl: artist.imageUrl,
      shares,
      purchasePrice: price,
      createdAt: new Date().toISOString(),
    };
  }

  memorySet('investments', id, investment);
  try {
    await setDoc(doc(db, 'investments', id), {
      ...investment,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (e) {
    console.warn('Firestore buyShares warning:', e);
  }

  const newCoins = Math.round((currentCoins - totalCost) * 100) / 100;
  await updateUserCoins(userId, newCoins);

  await recordTransaction({
    userId,
    artistId: artist.id,
    artistName: artist.name,
    type: 'buy',
    shares,
    pricePerShare: price,
    total: totalCost,
  });

  return { investment, newCoins, totalCost };
}

/**
 * Sell some or all shares from an investment.
 */
export async function sellShares(
  userId: string,
  investmentIdToSell: string,
  sharesToSell: number,
  currentPrice: number,
  currentCoins: number
): Promise<SellResult> {
  const investment =
    (await getInvestmentById(investmentIdToSell)) ||
    memoryGet<Investment>('investments', investmentIdToSell);

  if (!investment || investment.userId !== userId) {
    throw new Error('Investment not found');
  }
  if (sharesToSell < 1 || sharesToSell > investment.shares) {
    throw new Error('Invalid share amount');
  }

  const proceeds = Math.round(currentPrice * sharesToSell * 100) / 100;
  const costBasis = Math.round(investment.purchasePrice * sharesToSell * 100) / 100;
  const profit = Math.round((proceeds - costBasis) * 100) / 100;
  const newCoins = Math.round((currentCoins + proceeds) * 100) / 100;

  if (sharesToSell === investment.shares) {
    memoryDelete('investments', investmentIdToSell);
    try {
      await deleteDoc(doc(db, 'investments', investmentIdToSell));
    } catch (e) {
      console.warn('Firestore sellShares delete warning:', e);
    }
  } else {
    const updated: Investment = {
      ...investment,
      shares: investment.shares - sharesToSell,
    };
    memorySet('investments', investmentIdToSell, updated);
    try {
      await updateDoc(doc(db, 'investments', investmentIdToSell), {
        shares: updated.shares,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Firestore sellShares update warning:', e);
    }
  }

  await updateUserCoins(userId, newCoins);
  await recordTransaction({
    userId,
    artistId: investment.artistId,
    artistName: investment.artistName,
    type: 'sell',
    shares: sharesToSell,
    pricePerShare: currentPrice,
    total: proceeds,
  });

  return { newCoins, proceeds, profit };
}

async function getInvestmentById(id: string): Promise<Investment | null> {
  try {
    const snap = await getDoc(doc(db, 'investments', id));
    if (snap.exists()) {
      const data = snap.data() as Investment;
      memorySet('investments', id, data);
      return data;
    }
  } catch {
    // fall through
  }
  return memoryGet<Investment>('investments', id);
}

export async function getInvestments(userId: string): Promise<Investment[]> {
  const local = memoryQueryByUserId<Investment>('investments', userId);
  try {
    const q = query(collection(db, 'investments'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const remote: Investment[] = [];
    snap.forEach((d) => {
      const data = d.data() as Investment;
      memorySet('investments', data.id || d.id, data);
      remote.push(data);
    });
    if (remote.length > 0) return remote;
  } catch (e) {
    console.warn('Firestore getInvestments warning:', e);
  }
  return local;
}

export async function getInvestmentForArtist(
  userId: string,
  artistId: string
): Promise<Investment | null> {
  const id = investmentId(userId, artistId);
  return (await getInvestmentById(id)) || memoryGet<Investment>('investments', id);
}

/** Resolve current market price for an investment from local artist cache data. */
export function resolveCurrentPrice(
  investment: Investment,
  priceLookup: Record<string, number>
): number {
  return priceLookup[investment.artistId] ?? investment.purchasePrice;
}
