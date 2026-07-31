import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import {
  claimDailyReward,
  formatCountdown,
  getDailyRewardStatus,
  DailyRewardStatus,
} from '../lib/dailyReward';

interface Props {
  userId: string;
  coins: number;
  onClaimed: (newCoins: number) => void;
}

export const DailyReward: React.FC<Props> = ({ userId, coins, onClaimed }) => {
  const [status, setStatus] = useState<DailyRewardStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    getDailyRewardStatus(userId).then(setStatus).catch(() => {});
  }, [userId, tick]);

  useEffect(() => {
    if (!status || status.canClaim) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [status?.canClaim]);

  const handleClaim = async () => {
    try {
      setLoading(true);
      const result = await claimDailyReward(userId, coins);
      onClaimed(result.newCoins);
      setStatus(await getDailyRewardStatus(userId));
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  if (!status) return null;

  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <Text style={styles.title}>Daily Reward</Text>
        <Text style={styles.sub}>
          {status.canClaim
            ? `Claim +${status.amount} coins`
            : `Next reward in ${formatCountdown(status.msUntilNext)}`}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.btn, (!status.canClaim || loading) && styles.disabled]}
        disabled={!status.canClaim || loading}
        onPress={handleClaim}
      >
        {loading ? (
          <ActivityIndicator color="#0F1119" />
        ) : (
          <Text style={styles.btnText}>{status.canClaim ? 'Claim' : 'Wait'}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: { flex: 1, marginRight: 12 },
  title: { fontSize: 15, fontWeight: '800', color: '#1F2937' },
  sub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  btn: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 72,
    alignItems: 'center',
  },
  disabled: { opacity: 0.45 },
  btnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
});
