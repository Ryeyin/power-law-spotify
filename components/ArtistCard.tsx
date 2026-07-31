import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { DiscoveryBadge } from './DiscoveryBadge';
import { calculateDiscoveryScore } from '../lib/discoveryScore';

interface Props {
  artist: {
    id: string;
    name: string;
    images?: { url: string }[];
    imageUrl?: string;
    genres?: string[];
    listeners?: number;
    playcount?: number;
    price?: number;
    percentChange?: number;
    discoveryScore?: number;
    badge?: any;
  };
}

export const ArtistCard: React.FC<Props> = ({ artist }) => {
  const router = useRouter();

  const imgUrl = artist.imageUrl || artist.images?.[0]?.url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80';

  const discovery = calculateDiscoveryScore(artist.listeners || 10000, artist.playcount || 160000);
  const badge = artist.badge || discovery.badge;
  const score = artist.discoveryScore || discovery.score;
  const price = artist.price || discovery.initialPrice;
  const percentChange = artist.percentChange ?? discovery.percentChange ?? 0;
  const isUp = percentChange >= 0;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => router.push(`/artist/${artist.id}` as any)}
    >
      <Image source={{ uri: imgUrl }} style={styles.image} />
      
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {artist.name}
          </Text>
          <DiscoveryBadge badge={badge} score={score} compact />
        </View>

        <Text style={styles.genres} numberOfLines={1}>
          {artist.genres?.slice(0, 2).join(' • ') || 'Indie / Alternative'}
        </Text>

        <View style={styles.bottomRow}>
          <Text style={styles.priceLabel}>Price</Text>
          <View style={styles.priceBlock}>
            <Text style={[styles.change, isUp ? styles.changeUp : styles.changeDown]}>
              {isUp ? '▲' : '▼'} {Math.abs(percentChange).toFixed(1)}% 7d
            </Text>
            <Text style={styles.priceValue}>🪙 {price}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  image: {
    width: 76,
    height: 76,
    borderRadius: 12,
    backgroundColor: '#F3F5F9',
  },
  content: {
    flex: 1,
    marginLeft: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  genres: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
    marginBottom: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceLabel: {
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  priceBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  change: {
    fontSize: 11,
    fontWeight: '700',
  },
  changeUp: {
    color: '#34D399',
  },
  changeDown: {
    color: '#F87171',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF6B6B',
  },
});
