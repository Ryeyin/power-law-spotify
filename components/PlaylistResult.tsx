import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BuiltPlaylist } from '../lib/playlistBuilder';
import { useRouter } from 'expo-router';

interface Props {
  playlist: BuiltPlaylist;
  onReset: () => void;
}

function formatDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const PlaylistResult: React.FC<Props> = ({ playlist, onReset }) => {
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{playlist.title}</Text>
      <Text style={styles.meta}>
        {playlist.tracks.length} tracks · {playlist.source === 'groq' ? 'AI curated' : 'Catalog curated'}
      </Text>

      {playlist.tracks.map((track, index) => (
        <TouchableOpacity
          key={`${track.id}-${index}`}
          style={styles.row}
          onPress={() => router.push(`/artist/${track.artistId}` as any)}
        >
          <Text style={styles.index}>{index + 1}</Text>
          <View style={styles.info}>
            <Text style={styles.track} numberOfLines={1}>
              {track.name}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {track.artistName}
            </Text>
          </View>
          <Text style={styles.duration}>{formatDuration(track.durationMs)}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.resetBtn} onPress={onReset}>
        <Text style={styles.resetText}>Generate Another</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginTop: 8 },
  title: { fontSize: 20, fontWeight: '900', color: '#F5F5F5' },
  meta: { fontSize: 12, color: '#9CA3AF', marginBottom: 14, marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1D2E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#252A3A',
  },
  index: { width: 24, color: '#F59E0B', fontWeight: '800' },
  info: { flex: 1 },
  track: { color: '#F5F5F5', fontWeight: '700', fontSize: 13 },
  artist: { color: '#9CA3AF', fontSize: 11, marginTop: 2 },
  duration: { color: '#9CA3AF', fontSize: 11, marginLeft: 8 },
  resetBtn: {
    marginTop: 16,
    backgroundColor: '#252A3A',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  resetText: { color: '#F59E0B', fontWeight: '800' },
});
