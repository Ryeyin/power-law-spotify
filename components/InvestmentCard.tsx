import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Investment } from '../lib/investments';

interface Props {
  investment: Investment;
  currentPrice: number;
  onSell: () => void;
}

export const InvestmentCard: React.FC<Props> = ({ investment, currentPrice, onSell }) => {
  const router = useRouter();
  const currentValue = Math.round(currentPrice * investment.shares * 100) / 100;
  const costBasis = Math.round(investment.purchasePrice * investment.shares * 100) / 100;
  const pnl = Math.round((currentValue - costBasis) * 100) / 100;
  const pnlPct =
    costBasis > 0 ? Math.round((pnl / costBasis) * 1000) / 10 : 0;
  const isUp = pnl >= 0;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push(`/artist/${investment.artistId}` as any)}
    >
      <Image
        source={{
          uri:
            investment.imageUrl ||
            'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80',
        }}
        style={styles.image}
      />
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {investment.artistName}
        </Text>
        <Text style={styles.meta}>
          {investment.shares} shares · bought @ 🪙 {investment.purchasePrice}
        </Text>
        <View style={styles.bottom}>
          <View>
            <Text style={styles.price}>🪙 {currentPrice}</Text>
            <Text style={[styles.pnl, isUp ? styles.up : styles.down]}>
              {isUp ? '+' : ''}
              {pnl} ({isUp ? '+' : ''}
              {pnlPct}%)
            </Text>
          </View>
          <TouchableOpacity style={styles.sellBtn} onPress={onSell}>
            <Text style={styles.sellText}>Sell</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1D2E',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#252A3A',
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#252A3A',
  },
  content: { flex: 1, marginLeft: 12 },
  name: { fontSize: 15, fontWeight: '800', color: '#F5F5F5' },
  meta: { fontSize: 11, color: '#9CA3AF', marginTop: 2, marginBottom: 8 },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: { fontSize: 14, fontWeight: '800', color: '#F59E0B' },
  pnl: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  up: { color: '#34D399' },
  down: { color: '#F87171' },
  sellBtn: {
    backgroundColor: 'rgba(255,107,107,0.15)',
    borderWidth: 1,
    borderColor: '#FF6B6B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  sellText: { color: '#FF6B6B', fontWeight: '800', fontSize: 12 },
});
