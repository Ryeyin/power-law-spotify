import React, { useCallback, useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  SafeAreaView,
  Alert 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getUnifiedArtistDetail } from '../../lib/artistCache';
import { CachedArtist } from '../../lib/firestore';
import { DiscoveryBadge } from '../../components/DiscoveryBadge';
import { StatCard } from '../../components/StatCard';
import { PriceChart } from '../../components/PriceChart';
import { SimilarArtists } from '../../components/SimilarArtists';
import { TopTracksList } from '../../components/TopTracksList';
import { BuyModal } from '../../components/BuyModal';
import { useUserDoc } from '../../hooks/useUserDoc';
import { buyShares } from '../../lib/investments';
import { trackArtist, untrackArtist, isArtistTracked } from '../../lib/trackedArtists';

export default function ArtistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, profile, updateCoinsLocally } = useUserDoc();
  
  const [artist, setArtist] = useState<CachedArtist | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTracked, setIsTracked] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        setLoading(true);
        const data = await getUnifiedArtistDetail(id);
        setArtist(data);
        if (user?.id) {
          setIsTracked(await isArtistTracked(user.id, data.id));
        }
      } catch (err) {
        console.error('Error loading artist detail:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, user?.id]);

  const handleBuyConfirm = useCallback(
    async (shares: number) => {
      if (!user?.id || !artist || !profile) throw new Error('Not signed in');
      const result = await buyShares(
        user.id,
        {
          id: artist.id,
          name: artist.name,
          imageUrl: artist.imageUrl,
          price: artist.price,
        },
        shares,
        profile.coins
      );
      updateCoinsLocally(result.newCoins);
      Alert.alert('Purchase complete', `Bought ${shares} share(s) of ${artist.name} for 🪙 ${result.totalCost}`);
    },
    [user?.id, artist, profile, updateCoinsLocally]
  );

  const toggleTrack = async () => {
    if (!user?.id || !artist) return;
    try {
      if (isTracked) {
        await untrackArtist(user.id, artist.id);
        setIsTracked(false);
      } else {
        await trackArtist(user.id, {
          id: artist.id,
          name: artist.name,
          imageUrl: artist.imageUrl,
          discoveryScore: artist.discoveryScore,
          price: artist.price,
          percentChange: artist.percentChange,
          badgeLabel: artist.badge?.label,
        });
        setIsTracked(true);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text style={styles.loadingText}>Loading artist stats...</Text>
      </View>
    );
  }

  if (!artist) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Artist not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const fanRatio = artist.listeners > 0 ? (artist.playcount / artist.listeners).toFixed(1) : '0';
  const playValue =
    artist.playcount > 1000000
      ? `${(artist.playcount / 1000000).toFixed(1)}M`
      : `${(artist.playcount / 1000).toFixed(0)}k`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <Text style={styles.iconBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle} numberOfLines={1}>{artist.name}</Text>
          <TouchableOpacity style={[styles.iconBtn, isTracked && styles.activeTrackBtn]} onPress={toggleTrack}>
            <Text style={styles.iconBtnText}>{isTracked ? '★' : '☆'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroContainer}>
          <Image source={{ uri: artist.imageUrl }} style={styles.heroImage} />
          <View style={styles.heroOverlay}>
            <DiscoveryBadge badge={artist.badge} score={artist.discoveryScore} />
            <Text style={styles.artistName}>{artist.name}</Text>
            <Text style={styles.genres}>
              {artist.genres.slice(0, 3).join(' • ') || 'Alternative / Indie'}
            </Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            label="Share Price"
            value={`🪙 ${artist.price}`}
            subValue={
              typeof artist.percentChange === 'number'
                ? `${artist.percentChange >= 0 ? '+' : ''}${artist.percentChange}% today`
                : 'Coins / Share'
            }
            accentColor="#F59E0B"
          />
          <StatCard
            label="Discovery Score"
            value={`${artist.discoveryScore} / 100`}
            subValue={artist.badge.label}
            accentColor={artist.badge.color}
          />
          <StatCard
            label="Monthly Listeners"
            value={artist.listeners > 1000000 ? `${(artist.listeners / 1000000).toFixed(1)}M` : `${(artist.listeners / 1000).toFixed(0)}k`}
            accentColor="#14B8A6"
          />
          <StatCard
            label="Total Plays"
            value={playValue}
            subValue={`${fanRatio}x fan ratio`}
            accentColor="#FF6B6B"
          />
        </View>

        <PriceChart history={artist.priceHistory || []} currentPrice={artist.price} />

        {artist.topTracks && artist.topTracks.length > 0 ? (
          <TopTracksList tracks={artist.topTracks} />
        ) : null}

        {artist.bio ? (
          <View style={styles.bioCard}>
            <Text style={styles.sectionTitle}>Biography</Text>
            <Text style={styles.bioText} numberOfLines={bioExpanded ? undefined : 4}>
              {artist.bio}
            </Text>
            <TouchableOpacity onPress={() => setBioExpanded(prev => !prev)} style={styles.readMoreBtn}>
              <Text style={styles.readMoreText}>{bioExpanded ? 'Show Less ▲' : 'Read More ▼'}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {artist.similarArtists && artist.similarArtists.length > 0 && (
          <SimilarArtists 
            artists={artist.similarArtists} 
            onSelectArtist={(name) => router.push(`/artist/${encodeURIComponent(name)}` as any)} 
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Text style={styles.footerLabel}>Market Price</Text>
          <Text style={styles.footerPrice}>🪙 {artist.price} <Text style={styles.footerSub}>/ share</Text></Text>
        </View>

        <TouchableOpacity style={styles.buyButton} activeOpacity={0.8} onPress={() => setBuyOpen(true)}>
          <Text style={styles.buyButtonText}>Buy Shares</Text>
        </TouchableOpacity>
      </View>

      <BuyModal
        visible={buyOpen}
        artistName={artist.name}
        price={artist.price}
        coins={profile?.coins || 0}
        onClose={() => setBuyOpen(false)}
        onConfirm={handleBuyConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F1119',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0F1119',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '700',
  },
  backBtn: {
    marginTop: 16,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backBtnText: {
    color: '#0F1119',
    fontWeight: '700',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1D2E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#252A3A',
  },
  activeTrackBtn: {
    borderColor: '#F59E0B',
  },
  iconBtnText: {
    color: '#F59E0B',
    fontSize: 18,
    fontWeight: 'bold',
  },
  navTitle: {
    color: '#F5F5F5',
    fontSize: 16,
    fontWeight: '700',
    maxWidth: '60%',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  heroContainer: {
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
    backgroundColor: '#1A1D2E',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(15, 17, 25, 0.75)',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  artistName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#F5F5F5',
    marginTop: 8,
  },
  genres: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  bioCard: {
    backgroundColor: '#1A1D2E',
    borderRadius: 16,
    padding: 14,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#252A3A',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 8,
  },
  bioText: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 19,
  },
  readMoreBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  readMoreText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1A1D2E',
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#252A3A',
  },
  footerInfo: {},
  footerLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  footerPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F59E0B',
  },
  footerSub: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: 'normal',
  },
  buyButton: {
    backgroundColor: '#14B8A6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  buyButtonText: {
    color: '#0F1119',
    fontSize: 15,
    fontWeight: '800',
  },
});
