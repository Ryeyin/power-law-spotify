import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useUserDoc } from '../../hooks/useUserDoc';

export default function PortfolioScreen() {
  const { profile } = useUserDoc();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Portfolio 💼</Text>
        <Text style={styles.subtitle}>Track your artist investments and stock value</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Available Coin Balance</Text>
        <Text style={styles.coinValue}>🪙 {profile?.coins || 1000} Coins</Text>
        <Text style={styles.cardSub}>Stage 7 & 8 will enable buying & selling shares!</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1119',
    paddingHorizontal: 16,
  },
  header: {
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#F5F5F5',
  },
  subtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#1A1D2E',
    borderRadius: 16,
    padding: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#252A3A',
  },
  cardLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  coinValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#F59E0B',
    marginVertical: 6,
  },
  cardSub: {
    fontSize: 12,
    color: '#14B8A6',
  },
});
