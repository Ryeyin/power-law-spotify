import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { GenrePicker } from '../../components/GenrePicker';
import { MoodPicker } from '../../components/MoodPicker';
import { PlaylistResult } from '../../components/PlaylistResult';
import { buildPlaylist, BuiltPlaylist } from '../../lib/playlistBuilder';
import { useUserDoc } from '../../hooks/useUserDoc';
import { getInvestments } from '../../lib/investments';
import { savePlaylist } from '../../lib/savedPlaylists';

const LENGTHS = [8, 12, 16, 20];

export default function PlaylistScreen() {
  const { user } = useUserDoc();
  const [step, setStep] = useState(0);
  const [genres, setGenres] = useState<string[]>([]);
  const [favorites, setFavorites] = useState('');
  const [investedNames, setInvestedNames] = useState<string[]>([]);
  const [mood, setMood] = useState('chill');
  const [length, setLength] = useState(12);
  const [loading, setLoading] = useState(false);
  const [playlist, setPlaylist] = useState<BuiltPlaylist | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      async function loadInvestments() {
        if (!user?.id) {
          setInvestedNames([]);
          return;
        }
        try {
          const inv = await getInvestments(user.id);
          const names = inv.map((i) => i.artistName).filter(Boolean);
          setInvestedNames(names);
          // Prefill favorites with holdings if empty
          setFavorites((prev) => (prev.trim() ? prev : names.join(', ')));
        } catch {
          // ignore
        }
      }
      loadInvestments();
    }, [user?.id])
  );

  const reset = () => {
    setPlaylist(null);
    setSaved(false);
    setStep(0);
    setError('');
  };

  const next = () => setStep((s) => Math.min(3, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const generate = async () => {
    try {
      setLoading(true);
      setError('');
      setSaved(false);
      const manualFavorites = favorites
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const result = await buildPlaylist({
        genres,
        favoriteArtists: manualFavorites,
        investedArtists: investedNames,
        mood,
        length,
      });

      if (result.tracks.length === 0) {
        setError('No real songs found. Try again or pick different genres.');
        return;
      }

      setPlaylist(result);
      setStep(4);
    } catch (e: any) {
      setError(e?.message || 'Failed to generate playlist');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id || !playlist) throw new Error('Sign in to save playlists');
    await savePlaylist(user.id, playlist);
    setSaved(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>AI Playlist Generator</Text>
          <Text style={styles.subtitle}>
            {playlist
              ? 'Your curated playlist'
              : `Step ${Math.min(step + 1, 4)} of 4 — genres, artists, mood, length`}
          </Text>
        </View>

        {!playlist && investedNames.length > 0 && step === 0 ? (
          <View style={styles.holdingsBanner}>
            <Text style={styles.holdingsTitle}>Using your investments</Text>
            <Text style={styles.holdingsText} numberOfLines={2}>
              {investedNames.join(' · ')}
            </Text>
          </View>
        ) : null}

        {!playlist && step === 0 && (
          <View>
            <Text style={styles.stepTitle}>Choose genres</Text>
            <GenrePicker selected={genres} onChange={setGenres} />
            <TouchableOpacity
              style={[styles.primaryBtn, genres.length === 0 && styles.disabled]}
              disabled={genres.length === 0}
              onPress={next}
            >
              <Text style={styles.primaryText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {!playlist && step === 1 && (
          <View>
            <Text style={styles.stepTitle}>Artists to influence the mix</Text>
            <Text style={styles.hint}>
              Prefills from your portfolio holdings. Edit or add more (comma-separated).
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Men I Trust, Crumb, Khruangbin"
              placeholderTextColor="#9CA3AF"
              value={favorites}
              onChangeText={setFavorites}
              autoCapitalize="none"
            />
            <View style={styles.navRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={back}>
                <Text style={styles.secondaryText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtnFlex} onPress={next}>
                <Text style={styles.primaryText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!playlist && step === 2 && (
          <View>
            <Text style={styles.stepTitle}>Pick a mood</Text>
            <MoodPicker selected={mood} onChange={setMood} />
            <View style={styles.navRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={back}>
                <Text style={styles.secondaryText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtnFlex} onPress={next}>
                <Text style={styles.primaryText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!playlist && step === 3 && (
          <View>
            <Text style={styles.stepTitle}>Playlist length</Text>
            <View style={styles.lengthRow}>
              {LENGTHS.map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.lengthChip, length === n && styles.lengthActive]}
                  onPress={() => setLength(n)}
                >
                  <Text style={[styles.lengthText, length === n && styles.lengthTextActive]}>
                    {n} tracks
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.navRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={back}>
                <Text style={styles.secondaryText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtnFlex, loading && styles.disabled]}
                disabled={loading}
                onPress={generate}
              >
                {loading ? (
                  <ActivityIndicator color="#0F1119" />
                ) : (
                  <Text style={styles.primaryText}>Generate</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {playlist ? (
          <PlaylistResult
            playlist={playlist}
            onReset={reset}
            onSave={user?.id ? handleSave : undefined}
            saved={saved}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1119' },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  header: { paddingVertical: 16 },
  title: { fontSize: 24, fontWeight: '900', color: '#F5F5F5' },
  subtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  holdingsBanner: {
    backgroundColor: 'rgba(20,184,166,0.12)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#14B8A6',
    padding: 12,
    marginBottom: 14,
  },
  holdingsTitle: { color: '#14B8A6', fontWeight: '800', fontSize: 12, marginBottom: 4 },
  holdingsText: { color: '#F5F5F5', fontSize: 13 },
  stepTitle: { fontSize: 18, fontWeight: '800', color: '#F5F5F5', marginBottom: 4 },
  hint: { fontSize: 12, color: '#9CA3AF', marginBottom: 10 },
  input: {
    backgroundColor: '#1A1D2E',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#252A3A',
    color: '#F5F5F5',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  primaryBtn: {
    marginTop: 20,
    backgroundColor: '#F59E0B',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnFlex: {
    flex: 1,
    backgroundColor: '#F59E0B',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: { color: '#0F1119', fontWeight: '800', fontSize: 14 },
  secondaryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#252A3A',
    backgroundColor: '#1A1D2E',
  },
  secondaryText: { color: '#9CA3AF', fontWeight: '700' },
  navRow: { flexDirection: 'row', gap: 10, marginTop: 20, alignItems: 'center' },
  lengthRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  lengthChip: {
    backgroundColor: '#1A1D2E',
    borderWidth: 1,
    borderColor: '#252A3A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  lengthActive: { borderColor: '#14B8A6', backgroundColor: 'rgba(20,184,166,0.12)' },
  lengthText: { color: '#9CA3AF', fontWeight: '700' },
  lengthTextActive: { color: '#14B8A6' },
  disabled: { opacity: 0.45 },
  error: { color: '#FF6B6B', marginTop: 12 },
});
