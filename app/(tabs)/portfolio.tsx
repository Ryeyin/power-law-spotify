import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useUserDoc } from '../../hooks/useUserDoc';
import { getInvestments, sellShares, Investment } from '../../lib/investments';
import { lookupArtistPrice } from '../../lib/artistLookup';
import { PortfolioSummary } from '../../components/PortfolioSummary';
import { InvestmentCard } from '../../components/InvestmentCard';
import { SellModal } from '../../components/SellModal';

export default function PortfolioScreen() {
  const { user, profile, updateCoinsLocally } = useUserDoc();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selling, setSelling] = useState<Investment | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setInvestments([]);
      setLoading(false);
      return;
    }
    try {
      const data = await getInvestments(user.id);
      setInvestments(data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const priceFor = (inv: Investment) =>
    lookupArtistPrice(inv.artistId) ?? inv.purchasePrice;

  const portfolioValue = investments.reduce(
    (sum, inv) => sum + priceFor(inv) * inv.shares,
    0
  );
  const costBasis = investments.reduce(
    (sum, inv) => sum + inv.purchasePrice * inv.shares,
    0
  );
  const totalPnL = Math.round((portfolioValue - costBasis) * 100) / 100;
  const roundedValue = Math.round(portfolioValue * 100) / 100;

  const handleSell = async (shares: number) => {
    if (!user?.id || !selling || !profile) throw new Error('Not signed in');
    const currentPrice = priceFor(selling);
    const result = await sellShares(
      user.id,
      selling.id,
      shares,
      currentPrice,
      profile.coins
    );
    updateCoinsLocally(result.newCoins);
    Alert.alert(
      'Sold',
      `Sold ${shares} share(s) for 🪙 ${result.proceeds} (${result.profit >= 0 ? '+' : ''}${result.profit} P&L)`
    );
    setSelling(null);
    await load();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Portfolio</Text>
        <Text style={styles.subtitle}>Holdings, value, and P&L</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#F59E0B" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={investments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor="#F59E0B"
            />
          }
          ListHeaderComponent={
            <PortfolioSummary
              coins={profile?.coins || 0}
              portfolioValue={roundedValue}
              totalPnL={totalPnL}
              holdingsCount={investments.length}
            />
          }
          renderItem={({ item }) => (
            <InvestmentCard
              investment={item}
              currentPrice={priceFor(item)}
              onSell={() => setSelling(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No investments yet</Text>
              <Text style={styles.emptyText}>
                Discover artists and buy shares to build your portfolio.
              </Text>
            </View>
          }
        />
      )}

      {selling ? (
        <SellModal
          visible={!!selling}
          artistName={selling.artistName}
          sharesOwned={selling.shares}
          purchasePrice={selling.purchasePrice}
          currentPrice={priceFor(selling)}
          onClose={() => setSelling(null)}
          onConfirm={handleSell}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1119',
  },
  header: {
    paddingHorizontal: 16,
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
  list: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    color: '#F5F5F5',
    fontWeight: '800',
    fontSize: 16,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
});
