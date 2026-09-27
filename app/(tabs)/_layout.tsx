import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { ActivityIndicator, ColorValue, View } from 'react-native';

export default function TabLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F7F8FC', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#FF6B6B',
        tabBarInactiveTintColor: '#6B7280',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <TabBarIcon symbol="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color }) => <TabBarIcon symbol="🔍" color={color} />,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ color }) => <TabBarIcon symbol="💼" color={color} />,
        }}
      />
      <Tabs.Screen
        name="playlist"
        options={{
          title: 'Playlist',
          tabBarIcon: ({ color }) => <TabBarIcon symbol="🎵" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon symbol="👤" color={color} />,
        }}
      />
    </Tabs>
  );
}

function TabBarIcon({ symbol, color }: { symbol: string; color: ColorValue }) {
  return (
    <View style={{ opacity: color === '#FF6B6B' ? 1 : 0.6 }}>
      <Text style={{ fontSize: 18 }}>{symbol}</Text>
    </View>
  );
}

import { Text } from 'react-native';
