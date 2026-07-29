import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useClerk } from '@clerk/clerk-expo';
import { useUserDoc } from '../../hooks/useUserDoc';

export default function ProfileScreen() {
  const { signOut } = useClerk();
  const { user, profile } = useUserDoc();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>User Profile 👤</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(profile?.name || user?.fullName || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>

        <Text style={styles.userName}>{profile?.name || user?.fullName || 'Music Collector'}</Text>
        <Text style={styles.userEmail}>{profile?.email || user?.primaryEmailAddress?.emailAddress}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Coin Balance</Text>
            <Text style={styles.statVal}>🪙 {profile?.coins || 1000}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Status</Text>
            <Text style={styles.statVal}>Active 🌟</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={() => signOut()}>
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </TouchableOpacity>
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
  profileCard: {
    backgroundColor: '#1A1D2E',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#252A3A',
    marginTop: 10,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F1119',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F5F5F5',
  },
  userEmail: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginVertical: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#252A3A',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  statVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F59E0B',
    marginTop: 2,
  },
  signOutBtn: {
    marginTop: 16,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    width: '100%',
    alignItems: 'center',
  },
  signOutBtnText: {
    color: '#FF6B6B',
    fontWeight: '700',
    fontSize: 14,
  },
});
