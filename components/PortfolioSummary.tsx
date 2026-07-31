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
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>PORTFOLIO SUMMARY</Text>
          <Text style={styles.totalLabel}>Total Value</Text>
          <Text style={styles.totalValue}>🪙 {totalWealth}</Text>
        </View>
        <View style={[styles.pill, isUp ? styles.pillUp : styles.pillDown]}>
          <Text style={styles.pillText}>{isUp ? '+' : ''}{totalPnL}</Text>
        </View>
      </View>

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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#94A3B8',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 10,
    color: '#6B7280',
    letterSpacing: 1,
    marginBottom: 6,
  },
  totalLabel: { fontSize: 12, color: '#6B7280' },
  totalValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#F59E0B',
    marginBottom: 4,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillUp: { backgroundColor: 'rgba(20,184,166,0.14)' },
  pillDown: { backgroundColor: 'rgba(255,107,107,0.14)' },
  pillText: {
    color: '#1F2937',
    fontWeight: '800',
    fontSize: 13,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stat: {
    width: '47%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statLabel: { fontSize: 10, color: '#6B7280', textTransform: 'uppercase' },
  statValue: { fontSize: 15, fontWeight: '800', color: '#1F2937', marginTop: 4 },
  up: { color: '#14B8A6' },
  down: { color: '#FF6B6B' },
});
