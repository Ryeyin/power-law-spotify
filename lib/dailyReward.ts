import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { updateUserCoins } from './firestore';
import { memoryGet, memorySet } from './memoryStore';

const REWARD_AMOUNT = 25;
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

export interface DailyRewardStatus {
  canClaim: boolean;
  amount: number;
  lastRewardTimestamp: number;
  msUntilNext: number;
}

function rewardKey(userId: string) {
  return `reward_${userId}`;
}

export async function getDailyRewardStatus(userId: string): Promise<DailyRewardStatus> {
  let last = 0;
  const mem = memoryGet<{ lastRewardTimestamp: number }>('dailyRewards', rewardKey(userId));
  if (mem?.lastRewardTimestamp) last = mem.lastRewardTimestamp;

  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) {
      const data = snap.data();
      if (typeof data.lastRewardTimestamp === 'number') {
        last = data.lastRewardTimestamp;
        memorySet('dailyRewards', rewardKey(userId), { lastRewardTimestamp: last });
      }
    }
  } catch {
    // use memory
  }

  const elapsed = Date.now() - last;
  const canClaim = last === 0 || elapsed >= COOLDOWN_MS;
  const msUntilNext = canClaim ? 0 : COOLDOWN_MS - elapsed;

  return {
    canClaim,
    amount: REWARD_AMOUNT,
    lastRewardTimestamp: last,
    msUntilNext,
  };
}

export async function claimDailyReward(
  userId: string,
  currentCoins: number
): Promise<{ newCoins: number; amount: number }> {
  const status = await getDailyRewardStatus(userId);
  if (!status.canClaim) {
    throw new Error('Daily reward not ready yet');
  }

  const now = Date.now();
  const newCoins = currentCoins + REWARD_AMOUNT;

  memorySet('dailyRewards', rewardKey(userId), { lastRewardTimestamp: now });
  await updateUserCoins(userId, newCoins);

  try {
    await updateDoc(doc(db, 'users', userId), {
      lastRewardTimestamp: now,
      coins: newCoins,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Firestore claimDailyReward warning:', e);
  }

  return { newCoins, amount: REWARD_AMOUNT };
}

export function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
    .toString()
    .padStart(2, '0')}`;
}
