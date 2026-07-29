import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';

interface SimilarArtist {
  id: string;
  name: string;
  imageUrl?: string;
}

interface Props {
  artists: SimilarArtist[];
  onSelectArtist?: (name: string) => void;
}

export const SimilarArtists: React.FC<Props> = ({ artists, onSelectArtist }) => {
  if (!artists || artists.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>🤝 Fans Also Like</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {artists.map((artist, idx) => (
          <TouchableOpacity
            key={artist.id || idx}
            style={styles.card}
            onPress={() => onSelectArtist?.(artist.name)}
          >
            <Image
              source={{ uri: artist.imageUrl || `https://picsum.photos/seed/${artist.name}/200` }}
              style={styles.avatar}
            />
            <Text style={styles.name} numberOfLines={1}>
              {artist.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  scrollContent: {
    gap: 12,
  },
  card: {
    backgroundColor: '#1A1D2E',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    width: 100,
    borderWidth: 1,
    borderColor: '#252A3A',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#252A3A',
    marginBottom: 8,
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F5F5F5',
    textAlign: 'center',
  },
});
