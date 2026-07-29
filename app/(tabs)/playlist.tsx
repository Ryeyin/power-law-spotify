import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

export default function PlaylistScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Playlist Generator 🎵</Text>
        <Text style={styles.subtitle}>Discover new tracks curated by LLM intelligence</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Stage 10 — AI Generator</Text>
        <Text style={styles.cardText}>
          Generates custom playlists based on your favorite underground artists, genres, and mood using Groq AI + Spotify.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1119',
    paddingHorizontal: 16,
  },
  header: {
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#F5F5F5',
  },
  subtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#1A1D2E',
    borderRadius: 16,
    padding: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#252A3A',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
    marginBottom: 6,
  },
  cardText: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
  },
});
