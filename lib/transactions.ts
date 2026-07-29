import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { memoryQueryByUserId, memorySet } from './memoryStore';

export interface Transaction {
  id: string;
  userId: string;
  artistId: string;
  artistName: string;
  type: 'buy' | 'sell';
  shares: number;
  pricePerShare: number;
  total: number;
  createdAt: string;
}

export async function recordTransaction(
  input: Omit<Transaction, 'id' | 'createdAt'>
): Promise<Transaction> {
  const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const tx: Transaction = {
    ...input,
    id,
    createdAt: new Date().toISOString(),
  };

  memorySet('transactions', id, tx);
  try {
    await setDoc(doc(db, 'transactions', id), {
      ...tx,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Firestore recordTransaction warning:', e);
  }
  return tx;
}

export async function getTransactions(userId: string): Promise<Transaction[]> {
  const local = memoryQueryByUserId<Transaction>('transactions', userId);
  try {
    const q = query(collection(db, 'transactions'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const remote: Transaction[] = [];
    snap.forEach((d) => {
      const data = { id: d.id, ...d.data() } as Transaction;
      memorySet('transactions', data.id, data);
      remote.push(data);
    });
    if (remote.length > 0) {
      return remote.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
  } catch (e) {
    console.warn('Firestore getTransactions warning:', e);
  }
  return local.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
