import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Track {
  id: string;
  name: string;
  durationMs: number;
  previewUrl?: string;
}

interface Props {
  tracks: Track[];
}

export const TopTracksList: React.FC<Props> = ({ tracks }) => {
  const formatDuration = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>🔥 Popular Tracks</Text>

      {tracks.slice(0, 5).map((track, index) => (
        <View key={track.id || index} style={styles.trackRow}>
          <Text style={styles.index}>{index + 1}</Text>
          <View style={styles.trackInfo}>
            <Text style={styles.trackName} numberOfLines={1}>
              {track.name}
            </Text>
          </View>
          <Text style={styles.duration}>{formatDuration(track.durationMs)}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
    marginBottom: 12,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#252A3A',
  },
  index: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
    width: 24,
  },
  trackInfo: {
    flex: 1,
    marginRight: 10,
  },
  trackName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F5F5F5',
  },
  duration: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
