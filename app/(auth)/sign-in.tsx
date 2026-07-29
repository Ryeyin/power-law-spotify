import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { useState } from 'react';
import { useSignIn, useOAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { useWarmUpBrowser } from '../../hooks/useWarmUpBrowser';

WebBrowser.maybeCompleteAuthSession();

export default function SignIn() {
  useWarmUpBrowser();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(auth)/landing');
    }
  };

  const handleSignIn = async () => {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === 'complete') {
        await setActive!({ session: result.createdSessionId });
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      Alert.alert('Error', e.errors?.[0]?.message || 'Sign in failed');
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    try {
      const { createdSessionId, setActive: sa } = await startOAuthFlow();
      if (createdSessionId && sa) {
        await sa({ session: createdSessionId });
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      Alert.alert('Error', e.errors?.[0]?.message || 'Google sign in failed');
    }
  };

  return (
    <View style={s.container}>
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
            <Pressable onPress={handleBack} style={s.backBtn}>
              <Text style={s.backText}>←</Text>
            </Pressable>

            <Text style={s.title}>Welcome{'\n'}Back</Text>
            <Text style={s.subtitle}>Sign in to continue trading</Text>

            <View style={s.form}>
              <View style={s.inputWrap}>
                <Text style={s.label}>Email</Text>
                <TextInput
                  style={s.input}
                  placeholder="you@email.com"
                  placeholderTextColor={Colors.textSecondary + '80'}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={s.inputWrap}>
                <Text style={s.label}>Password</Text>
                <TextInput
                  style={s.input}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textSecondary + '80'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <Pressable
                onPress={handleSignIn}
                disabled={loading}
                style={({ pressed }) => [s.btn, (pressed || loading) && s.pressed]}
              >
                <LinearGradient colors={[Colors.amber500, Colors.amber600]} style={s.btnGradient}>
                  <Text style={s.btnText}>{loading ? 'Signing In...' : 'Sign In'}</Text>
                </LinearGradient>
              </Pressable>

              <View style={s.divider}>
                <View style={s.line} />
                <Text style={s.dividerText}>or</Text>
                <View style={s.line} />
              </View>

              <Pressable
                onPress={handleGoogle}
                style={({ pressed }) => [s.btn, s.googleBtn, pressed && s.pressed]}
              >
                <Text style={s.googleText}>Continue with Google</Text>
              </Pressable>
            </View>

            <Pressable onPress={() => router.replace('/(auth)/sign-up')} style={s.switchWrap}>
              <Text style={s.switchText}>
                Don't have an account? <Text style={s.switchLink}>Sign Up</Text>
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDark },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 40 },
  backBtn: { marginTop: 8, width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.bgSurface, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 20, color: Colors.textPrimary },
  title: { fontSize: 40, fontWeight: '800', color: Colors.textPrimary, marginTop: 32, lineHeight: 46, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: Colors.textSecondary, marginTop: 8 },
  form: { marginTop: 40, gap: 18 },
  inputWrap: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  input: { height: 54, backgroundColor: Colors.bgSurface, borderRadius: 14, paddingHorizontal: 18, fontSize: 16, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border },
  btn: { height: 54, borderRadius: 14, overflow: 'hidden' },
  btnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '700', color: Colors.bgDark },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  line: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 13, color: Colors.textSecondary },
  googleBtn: { backgroundColor: Colors.bgSurface, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  googleText: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  switchWrap: { marginTop: 'auto', paddingTop: 32, alignItems: 'center' },
  switchText: { fontSize: 14, color: Colors.textSecondary },
  switchLink: { color: Colors.amber500, fontWeight: '600' },
});
