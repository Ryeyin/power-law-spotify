import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const GENRES = [
  'indie',
  'alternative',
  'dream pop',
  'lo-fi',
  'electronic',
  'r&b',
  'hip hop',
  'folk',
  'rock',
  'ambient',
  'jazz',
  'soul',
];

interface Props {
  selected: string[];
  onChange: (genres: string[]) => void;
}

export const GenrePicker: React.FC<Props> = ({ selected, onChange }) => {
  const toggle = (genre: string) => {
    if (selected.includes(genre)) {
      onChange(selected.filter((g) => g !== genre));
    } else if (selected.length < 5) {
      onChange([...selected, genre]);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>Pick up to 5 genres</Text>
      <View style={styles.row}>
        {GENRES.map((g) => {
          const active = selected.includes(g);
          return (
            <TouchableOpacity
              key={g}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggle(g)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{g}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginTop: 8 },
  hint: { fontSize: 12, color: '#9CA3AF', marginBottom: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#1A1D2E',
    borderWidth: 1,
    borderColor: '#252A3A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  chipText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  chipTextActive: { color: '#0F1119', fontWeight: '800' },
});
