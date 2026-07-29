import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';

export default function Landing() {
  const router = useRouter();

  return (
    <View style={s.container}>
      <SafeAreaView style={s.safe}>
        <View style={s.top}>
          <LinearGradient
            colors={[Colors.amber500, Colors.coral500]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.logoBg}
          >
            <Text style={s.logoIcon}>📈</Text>
          </LinearGradient>
          <Text style={s.title}>Artist{'\n'}Exchange</Text>
          <Text style={s.subtitle}>
            Discover hidden gems.{'\n'}Invest in their rise.{'\n'}Build your music empire.
          </Text>
          <View style={s.pills}>
            <View style={[s.pill, { backgroundColor: Colors.amber500 + '20' }]}>
              <Text style={[s.pillText, { color: Colors.amber400 }]}>💎 Discover</Text>
            </View>
            <View style={[s.pill, { backgroundColor: Colors.teal500 + '20' }]}>
              <Text style={[s.pillText, { color: Colors.teal400 }]}>📊 Invest</Text>
            </View>
            <View style={[s.pill, { backgroundColor: Colors.coral500 + '20' }]}>
              <Text style={[s.pillText, { color: Colors.coral400 }]}>🎵 Playlists</Text>
            </View>
          </View>
        </View>
        <View style={s.bottom}>
          <Pressable
            onPress={() => router.push('/(auth)/sign-in')}
            style={({ pressed }) => [s.btn, s.btnPrimary, pressed && s.pressed]}
          >
            <LinearGradient
              colors={[Colors.amber500, Colors.amber600]}
              style={s.btnGradient}
            >
              <Text style={s.btnPrimaryText}>Sign In</Text>
            </LinearGradient>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(auth)/sign-up')}
            style={({ pressed }) => [s.btn, s.btnOutline, pressed && s.pressed]}
          >
            <Text style={s.btnOutlineText}>Create Account</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDark },
  safe: { flex: 1, paddingHorizontal: 28 },
  top: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoBg: { width: 88, height: 88, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 28 },
  logoIcon: { fontSize: 40 },
  title: { fontSize: 52, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', lineHeight: 58, letterSpacing: -1 },
  subtitle: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginTop: 20, lineHeight: 26 },
  pills: { flexDirection: 'row', gap: 10, marginTop: 32 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  pillText: { fontSize: 13, fontWeight: '600' },
  bottom: { paddingBottom: 44, gap: 14 },
  btn: { height: 58, borderRadius: 18, overflow: 'hidden' },
  btnPrimary: {},
  btnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btnOutline: { borderWidth: 1.5, borderColor: Colors.amber500, justifyContent: 'center', alignItems: 'center' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  btnPrimaryText: { fontSize: 17, fontWeight: '700', color: Colors.bgDark },
  btnOutlineText: { fontSize: 17, fontWeight: '700', color: Colors.amber500 },
});
