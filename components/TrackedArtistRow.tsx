import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { TrackedArtist } from '../lib/trackedArtists';

interface Props {
  artist: TrackedArtist;
}

export const TrackedArtistRow: React.FC<Props> = ({ artist }) => {
  const router = useRouter();
  const change = artist.percentChange ?? 0;
  const isUp = change >= 0;

  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.8}
      onPress={() => router.push(`/artist/${artist.artistId}` as any)}
    >
      <Image
        source={{
          uri:
            artist.imageUrl ||
            'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80',
        }}
        style={styles.image}
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {artist.artistName}
        </Text>
        <Text style={styles.meta}>
          Score {artist.discoveryScore ?? '—'}
          {artist.badgeLabel ? ` · ${artist.badgeLabel}` : ''}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.price}>🪙 {artist.price ?? '—'}</Text>
        <Text style={[styles.change, isUp ? styles.up : styles.down]}>
          {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1D2E',
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#252A3A',
  },
  image: { width: 48, height: 48, borderRadius: 10, backgroundColor: '#252A3A' },
  info: { flex: 1, marginHorizontal: 10 },
  name: { fontSize: 14, fontWeight: '700', color: '#F5F5F5' },
  meta: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  right: { alignItems: 'flex-end' },
  price: { fontSize: 13, fontWeight: '800', color: '#F59E0B' },
  change: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  up: { color: '#34D399' },
  down: { color: '#F87171' },
});
