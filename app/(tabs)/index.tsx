import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { useUserDoc } from '../../hooks/useUserDoc';
import { searchArtists, SpotifyArtist } from '../../lib/spotify';
import { ArtistCard } from '../../components/ArtistCard';

export default function DashboardScreen() {
  const router = useRouter();
  const { profile } = useUserDoc();
  const [trendingArtists, setTrendingArtists] = useState<SpotifyArtist[]>([]);
  const [loadingArtists, setLoadingArtists] = useState(true);

  useEffect(() => {
    async function loadTrending() {
      try {
        const data = await searchArtists('indie');
        setTrendingArtists(data);
      } catch (err) {
        console.error('Failed to load trending artists:', err);
      } finally {
        setLoadingArtists(false);
      }
    }
    loadTrending();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Bar */}
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

        {/* Portfolio Summary Card */}
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
        </View>

        {/* Quick Features Row */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Artists</Text>
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
    marginBottom: 20,
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
});
