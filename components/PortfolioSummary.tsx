import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  coins: number;
  portfolioValue: number;
  totalPnL: number;
  holdingsCount: number;
}

export const PortfolioSummary: React.FC<Props> = ({
  coins,
  portfolioValue,
  totalPnL,
  holdingsCount,
}) => {
  const isUp = totalPnL >= 0;
  const totalWealth = Math.round((coins + portfolioValue) * 100) / 100;

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>PORTFOLIO SUMMARY</Text>
      <Text style={styles.totalLabel}>Total Value</Text>
      <Text style={styles.totalValue}>🪙 {totalWealth}</Text>

      <View style={styles.grid}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Cash</Text>
          <Text style={styles.statValue}>🪙 {coins}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Holdings</Text>
          <Text style={styles.statValue}>🪙 {portfolioValue}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>P&L</Text>
          <Text style={[styles.statValue, isUp ? styles.up : styles.down]}>
            {isUp ? '+' : ''}
            {totalPnL}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Positions</Text>
          <Text style={styles.statValue}>{holdingsCount}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1D2E',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#252A3A',
  },
  eyebrow: {
    fontSize: 10,
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 6,
  },
  totalLabel: { fontSize: 12, color: '#9CA3AF' },
  totalValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#F59E0B',
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stat: {
    width: '47%',
    backgroundColor: '#252A3A',
    borderRadius: 12,
    padding: 12,
  },
  statLabel: { fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase' },
  statValue: { fontSize: 15, fontWeight: '800', color: '#F5F5F5', marginTop: 4 },
  up: { color: '#34D399' },
  down: { color: '#F87171' },
});
