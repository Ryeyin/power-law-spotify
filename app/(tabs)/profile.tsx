import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useClerk } from '@clerk/clerk-expo';
import { useFocusEffect, useRouter } from 'expo-router';
import { useUserDoc } from '../../hooks/useUserDoc';
import { StatRow } from '../../components/StatRow';
import { TrackedArtistRow } from '../../components/TrackedArtistRow';
import { getTrackedArtists, TrackedArtist } from '../../lib/trackedArtists';
import { getInvestments } from '../../lib/investments';
import { getTransactions } from '../../lib/transactions';
import { lookupArtistPrice } from '../../lib/artistLookup';
import { getSavedPlaylists, deleteSavedPlaylist, SavedPlaylist } from '../../lib/savedPlaylists';

export default function ProfileScreen() {
  const { signOut } = useClerk();
  const router = useRouter();
  const { user, profile } = useUserDoc();
  const [tracked, setTracked] = useState<TrackedArtist[]>([]);
  const [playlists, setPlaylists] = useState<SavedPlaylist[]>([]);
  const [expandedPlaylist, setExpandedPlaylist] = useState<string | null>(null);
  const [stats, setStats] = useState({
    investments: 0,
    trades: 0,
    profit: 0,
    tracked: 0,
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const [trackedList, investments, txs, saved] = await Promise.all([
        getTrackedArtists(user.id),
        getInvestments(user.id),
        getTransactions(user.id),
        getSavedPlaylists(user.id),
      ]);

      const portfolioValue = investments.reduce((sum, inv) => {
        const price = lookupArtistPrice(inv.artistId) ?? inv.purchasePrice;
        return sum + price * inv.shares;
      }, 0);
      const costBasis = investments.reduce(
        (sum, inv) => sum + inv.purchasePrice * inv.shares,
        0
      );
      const simpleProfit = Math.round((portfolioValue - costBasis) * 100) / 100;

      setTracked(trackedList.slice(0, 10));
      setPlaylists(saved);
      setStats({
        investments: investments.length,
        trades: txs.length,
        profit: simpleProfit,
        tracked: trackedList.length,
      });
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const handleDeletePlaylist = (pl: SavedPlaylist) => {
    if (!user?.id) return;
    Alert.alert('Delete playlist', `Remove "${pl.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSavedPlaylist(user.id, pl.id);
          setPlaylists((prev) => prev.filter((p) => p.id !== pl.id));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>User Profile</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.name || user?.fullName || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.userName}>{profile?.name || user?.fullName || 'Music Collector'}</Text>
          <Text style={styles.userEmail}>
            {profile?.email || user?.primaryEmailAddress?.emailAddress}
          </Text>

          <View style={styles.coinPill}>
            <Text style={styles.coinPillText}>🪙 {profile?.coins || 1000} coins</Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          {loading ? (
            <ActivityIndicator color="#F59E0B" style={{ marginVertical: 16 }} />
          ) : (
            <>
              <StatRow label="Open positions" value={`${stats.investments}`} />
              <StatRow label="Trades made" value={`${stats.trades}`} />
              <StatRow
                label="Unrealized P&L"
                value={`${stats.profit >= 0 ? '+' : ''}${stats.profit}`}
              />
              <StatRow label="Artists tracked" value={`${stats.tracked}`} />
              <StatRow label="Saved playlists" value={`${playlists.length}`} />
            </>
          )}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 8, marginBottom: 10 }]}>
          Saved Playlists
        </Text>
        {playlists.length === 0 ? (
          <Text style={styles.empty}>
            Generate a playlist and tap Save to Profile to keep it here.
          </Text>
        ) : (
          playlists.map((pl) => {
            const open = expandedPlaylist === pl.id;
            return (
              <View key={pl.id} style={styles.playlistCard}>
                <TouchableOpacity
                  onPress={() => setExpandedPlaylist(open ? null : pl.id)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.playlistTitle}>{pl.title}</Text>
                  <Text style={styles.playlistMeta}>
                    {pl.tracks.length} songs · {pl.source === 'groq' ? 'AI' : 'Catalog'} ·{' '}
                    {pl.genres.slice(0, 2).join(', ')}
                  </Text>
                </TouchableOpacity>

                {open
                  ? pl.tracks.map((t, i) => (
                      <TouchableOpacity
                        key={`${pl.id}-${t.id}-${i}`}
                        style={styles.trackRow}
                        onPress={() => router.push(`/artist/${t.artistId}` as any)}
                      >
                        <Text style={styles.trackIndex}>{i + 1}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.trackName} numberOfLines={1}>
                            {t.name}
                          </Text>
                          <Text style={styles.trackArtist} numberOfLines={1}>
                            {t.artistName}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  : null}

                <View style={styles.playlistActions}>
                  <TouchableOpacity onPress={() => setExpandedPlaylist(open ? null : pl.id)}>
                    <Text style={styles.link}>{open ? 'Hide songs' : 'Show songs'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeletePlaylist(pl)}>
                    <Text style={styles.delete}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <Text style={[styles.sectionTitle, { marginTop: 16, marginBottom: 10 }]}>
          Tracked Artists
        </Text>
        {tracked.length === 0 ? (
          <Text style={styles.empty}>Star artists from their detail page to track them.</Text>
        ) : (
          tracked.map((a) => <TrackedArtistRow key={a.id} artist={a} />)
        )}

        <TouchableOpacity style={styles.signOutBtn} onPress={() => signOut()}>
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1119',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  header: {
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#F5F5F5',
  },
  profileCard: {
    backgroundColor: '#1A1D2E',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#252A3A',
    marginBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F1119',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F5F5F5',
  },
  userEmail: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
    marginBottom: 12,
  },
  coinPill: {
    backgroundColor: '#252A3A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  coinPillText: {
    color: '#F59E0B',
    fontWeight: '800',
    fontSize: 13,
  },
  statsCard: {
    backgroundColor: '#1A1D2E',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    borderWidth: 1,
    borderColor: '#252A3A',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F5F5F5',
  },
  empty: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 12,
  },
  playlistCard: {
    backgroundColor: '#1A1D2E',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#252A3A',
  },
  playlistTitle: { color: '#F5F5F5', fontWeight: '800', fontSize: 15 },
  playlistMeta: { color: '#9CA3AF', fontSize: 11, marginTop: 4, marginBottom: 8 },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#252A3A',
  },
  trackIndex: { width: 22, color: '#F59E0B', fontWeight: '800', fontSize: 12 },
  trackName: { color: '#F5F5F5', fontWeight: '700', fontSize: 13 },
  trackArtist: { color: '#9CA3AF', fontSize: 11, marginTop: 1 },
  playlistActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  link: { color: '#14B8A6', fontWeight: '700', fontSize: 12 },
  delete: { color: '#FF6B6B', fontWeight: '700', fontSize: 12 },
  signOutBtn: {
    marginTop: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    alignItems: 'center',
  },
  signOutBtnText: {
    color: '#FF6B6B',
    fontWeight: '700',
    fontSize: 14,
  },
});
