import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { BuiltPlaylist } from '../lib/playlistBuilder';
import { useRouter } from 'expo-router';

interface Props {
  playlist: BuiltPlaylist;
  onReset: () => void;
  onSave?: () => Promise<void>;
  saved?: boolean;
}

function formatDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const PlaylistResult: React.FC<Props> = ({ playlist, onReset, onSave, saved }) => {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!onSave || saved) return;
    try {
      setSaving(true);
      await onSave();
      Alert.alert('Saved', 'Playlist saved to your profile.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not save playlist');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{playlist.title}</Text>
      <Text style={styles.meta}>
        {playlist.tracks.length} songs ·{' '}
        {playlist.source === 'groq' ? 'AI curated' : 'Catalog curated'}
        {playlist.investedArtists && playlist.investedArtists.length > 0
          ? ` · based on your holdings`
          : ''}
      </Text>

      {playlist.tracks.length === 0 ? (
        <Text style={styles.empty}>
          No songs found. Check your Spotify/Last.fm keys or try different genres.
        </Text>
      ) : (
        playlist.tracks.map((track, index) => (
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
        ))
      )}

      {onSave ? (
        <TouchableOpacity
          style={[styles.saveBtn, (saved || saving) && styles.disabled]}
          disabled={saved || saving}
          onPress={handleSave}
        >
          {saving ? (
            <ActivityIndicator color="#0F1119" />
          ) : (
            <Text style={styles.saveText}>{saved ? 'Saved to Profile' : 'Save to Profile'}</Text>
          )}
        </TouchableOpacity>
      ) : null}

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
  empty: { color: '#9CA3AF', fontSize: 13, marginBottom: 12 },
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
  saveBtn: {
    marginTop: 12,
    backgroundColor: '#14B8A6',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: { color: '#0F1119', fontWeight: '800' },
  resetBtn: {
    marginTop: 12,
    backgroundColor: '#252A3A',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  resetText: { color: '#F59E0B', fontWeight: '800' },
  disabled: { opacity: 0.5 },
});
