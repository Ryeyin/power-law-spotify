import React, { useCallback, useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useUserDoc } from '../../hooks/useUserDoc';
import { searchArtists, SpotifyArtist } from '../../lib/spotify';
import { ArtistCard } from '../../components/ArtistCard';
import { DailyReward } from '../../components/DailyReward';
import { TrackedArtistRow } from '../../components/TrackedArtistRow';
import { getTrackedArtists, TrackedArtist } from '../../lib/trackedArtists';
import { getInvestments, Investment } from '../../lib/investments';
import { lookupArtistPrice } from '../../lib/artistLookup';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, profile, updateCoinsLocally } = useUserDoc();
  const [trendingArtists, setTrendingArtists] = useState<SpotifyArtist[]>([]);
  const [tracked, setTracked] = useState<TrackedArtist[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loadingArtists, setLoadingArtists] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const [artists, trackedList, inv] = await Promise.all([
        searchArtists(''),
        user?.id ? getTrackedArtists(user.id) : Promise.resolve([]),
        user?.id ? getInvestments(user.id) : Promise.resolve([]),
      ]);
      setTrendingArtists(artists.slice(0, 8));
      setTracked(trackedList.slice(0, 8));
      setInvestments(inv.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoadingArtists(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) loadDashboard();
    }, [user?.id, loadDashboard])
  );

  const portfolioValue = investments.reduce((sum, inv) => {
    const price = lookupArtistPrice(inv.artistId) ?? inv.purchasePrice;
    return sum + price * inv.shares;
  }, 0);
  const costBasis = investments.reduce(
    (sum, inv) => sum + inv.purchasePrice * inv.shares,
    0
  );
  const pnl = Math.round((portfolioValue - costBasis) * 100) / 100;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadDashboard();
            }}
            tintColor="#F59E0B"
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Welcome back</Text>
            <Text style={styles.nameText}>{profile?.name || 'Collector'}</Text>
          </View>

          <View style={styles.coinBadge}>
            <Text style={styles.coinIcon}>🪙</Text>
            <Text style={styles.coinAmount}>{profile?.coins || 1000}</Text>
          </View>
        </View>

        <View style={styles.portfolioCard}>
          <Text style={styles.cardHeaderLabel}>ACCOUNT SUMMARY</Text>
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceLabel}>Coin Balance</Text>
              <Text style={styles.balanceValue}>🪙 {profile?.coins || 1000}</Text>
            </View>
            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={() => router.push('/(tabs)/discover' as any)}
            >
              <Text style={styles.actionBtnText}>Invest Now</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.snapshotRow}>
            <View style={styles.snapshot}>
              <Text style={styles.snapshotLabel}>Portfolio</Text>
              <Text style={styles.snapshotValue}>
                🪙 {Math.round(portfolioValue * 100) / 100}
              </Text>
            </View>
            <View style={styles.snapshot}>
              <Text style={styles.snapshotLabel}>Unrealized P&L</Text>
              <Text style={[styles.snapshotValue, pnl >= 0 ? styles.up : styles.down]}>
                {pnl >= 0 ? '+' : ''}{pnl}
              </Text>
            </View>
          </View>
        </View>

        {user?.id ? (
          <DailyReward
            userId={user.id}
            coins={profile?.coins || 0}
            onClaimed={(newCoins) => updateCoinsLocally(newCoins)}
          />
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tracked Artists</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile' as any)}>
            <Text style={styles.seeAllText}>Profile →</Text>
          </TouchableOpacity>
        </View>
        {tracked.length === 0 ? (
          <Text style={styles.emptyHint}>Star artists on their detail page to track them here.</Text>
        ) : (
          tracked.map((a) => <TrackedArtistRow key={a.id} artist={a} />)
        )}

        <View style={[styles.sectionHeader, { marginTop: 16 }]}>
          <Text style={styles.sectionTitle}>Recent Investments</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/portfolio' as any)}>
            <Text style={styles.seeAllText}>Portfolio →</Text>
          </TouchableOpacity>
        </View>
        {investments.length === 0 ? (
          <Text style={styles.emptyHint}>Buy shares to see them here.</Text>
        ) : (
          investments.map((inv) => {
            const price = lookupArtistPrice(inv.artistId) ?? inv.purchasePrice;
            return (
              <TouchableOpacity
                key={inv.id}
                style={styles.invRow}
                onPress={() => router.push(`/artist/${inv.artistId}` as any)}
              >
                <View>
                  <Text style={styles.invName}>{inv.artistName}</Text>
                  <Text style={styles.invMeta}>{inv.shares} shares</Text>
                </View>
                <Text style={styles.invPrice}>🪙 {price}</Text>
              </TouchableOpacity>
            );
          })
        )}

        <View style={[styles.sectionHeader, { marginTop: 16 }]}>
          <Text style={styles.sectionTitle}>Recommended</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/discover' as any)}>
            <Text style={styles.seeAllText}>See All →</Text>
          </TouchableOpacity>
        </View>

        {loadingArtists ? (
          <ActivityIndicator size="large" color="#F59E0B" style={{ marginVertical: 20 }} />
        ) : (
          trendingArtists.map(artist => (
            <ArtistCard key={artist.id} artist={artist} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1119',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  nameText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F5F5F5',
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1D2E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F59E0B',
    gap: 6,
  },
  coinIcon: {
    fontSize: 16,
  },
  coinAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F59E0B',
  },
  portfolioCard: {
    backgroundColor: '#1A1D2E',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#252A3A',
  },
  cardHeaderLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 8,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#F59E0B',
    marginTop: 2,
  },
  actionBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionBtnText: {
    color: '#0F1119',
    fontWeight: '800',
    fontSize: 13,
  },
  snapshotRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  snapshot: {
    flex: 1,
    backgroundColor: '#252A3A',
    borderRadius: 12,
    padding: 12,
  },
  snapshotLabel: { fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase' },
  snapshotValue: { fontSize: 15, fontWeight: '800', color: '#F5F5F5', marginTop: 4 },
  up: { color: '#34D399' },
  down: { color: '#F87171' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F5F5F5',
  },
  seeAllText: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '600',
  },
  emptyHint: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 12,
  },
  invRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A1D2E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#252A3A',
  },
  invName: { color: '#F5F5F5', fontWeight: '700', fontSize: 14 },
  invMeta: { color: '#9CA3AF', fontSize: 11, marginTop: 2 },
  invPrice: { color: '#F59E0B', fontWeight: '800' },
});
