import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DiscoveryBadgeInfo } from '../lib/discoveryScore';

interface Props {
  badge: DiscoveryBadgeInfo;
  score: number;
  compact?: boolean;
}

export const DiscoveryBadge: React.FC<Props> = ({ badge, score, compact }) => {
  return (
    <View style={[styles.container, { backgroundColor: badge.bgLight, borderColor: badge.color }]}>
      <Text style={[styles.label, { color: badge.color }]}>{badge.label}</Text>
      {!compact && (
        <View style={[styles.scorePill, { backgroundColor: badge.color }]}>
          <Text style={styles.scoreText}>{score}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  scorePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  scoreText: {
    color: '#0F1119',
    fontSize: 11,
    fontWeight: '900',
  },
});
