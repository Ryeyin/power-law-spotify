import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  label: string;
  value: string;
  subValue?: string;
  icon?: string;
  accentColor?: string;
}

export const StatCard: React.FC<Props> = ({ label, value, subValue, icon, accentColor = '#F59E0B' }) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        {icon && <Text style={styles.icon}>{icon}</Text>}
      </View>
      <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
      {subValue && <Text style={styles.subValue}>{subValue}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1D2E',
    borderRadius: 14,
    padding: 12,
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: '#252A3A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  icon: {
    fontSize: 14,
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  subValue: {
    fontSize: 11,
    color: '#9CA3AF',
  },
});
