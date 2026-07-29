import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const MOODS = [
  { id: 'chill', label: 'Chill', emoji: '🌊' },
  { id: 'energetic', label: 'Energetic', emoji: '⚡' },
  { id: 'melancholy', label: 'Melancholy', emoji: '🌧️' },
  { id: 'uplifting', label: 'Uplifting', emoji: '☀️' },
  { id: 'focus', label: 'Focus', emoji: '🎯' },
  { id: 'nightlife', label: 'Nightlife', emoji: '🌃' },
];

interface Props {
  selected: string;
  onChange: (mood: string) => void;
}

export const MoodPicker: React.FC<Props> = ({ selected, onChange }) => (
  <View style={styles.grid}>
    {MOODS.map((m) => {
      const active = selected === m.id;
      return (
        <TouchableOpacity
          key={m.id}
          style={[styles.card, active && styles.cardActive]}
          onPress={() => onChange(m.id)}
        >
          <Text style={styles.emoji}>{m.emoji}</Text>
          <Text style={[styles.label, active && styles.labelActive]}>{m.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  card: {
    width: '47%',
    backgroundColor: '#1A1D2E',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#252A3A',
  },
  cardActive: { borderColor: '#14B8A6', backgroundColor: 'rgba(20,184,166,0.12)' },
  emoji: { fontSize: 22, marginBottom: 6 },
  label: { color: '#9CA3AF', fontWeight: '700', fontSize: 13 },
  labelActive: { color: '#14B8A6' },
});
