import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { useState } from 'react';
import { useSignUp, useOAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { useWarmUpBrowser } from '../../hooks/useWarmUpBrowser';

WebBrowser.maybeCompleteAuthSession();

export default function SignUp() {
  useWarmUpBrowser();
  const { signUp, setActive, isLoaded } = useSignUp();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBack = () => {
    if (pendingVerification) {
      setPendingVerification(false);
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(auth)/landing');
    }
  };

  const handleSignUp = async () => {
    if (!isLoaded) return;
    setLoading(true);
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (e: any) {
      Alert.alert('Error', e.errors?.[0]?.message || 'Sign up failed');
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await setActive!({ session: result.createdSessionId });
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      Alert.alert('Error', e.errors?.[0]?.message || 'Verification failed');
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

  if (pendingVerification) {
    return (
      <View style={s.container}>
        <SafeAreaView style={s.safe}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
              <Pressable onPress={handleBack} style={s.backBtn}>
                <Text style={s.backText}>←</Text>
              </Pressable>

              <View style={s.verifyHeader}>
                <LinearGradient
                  colors={[Colors.teal500 + '20', Colors.teal500 + '05']}
                  style={s.verifyIconBg}
                >
                  <Text style={s.verifyIcon}>✉️</Text>
                </LinearGradient>
                <Text style={s.title}>Check Your{'\n'}Email</Text>
                <Text style={s.subtitle}>We sent a verification code to{'\n'}{email}</Text>
              </View>

              <View style={s.form}>
                <View style={s.inputWrap}>
                  <Text style={s.label}>Verification Code</Text>
                  <TextInput
                    style={[s.input, s.codeInput]}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor={Colors.textSecondary + '80'}
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>

                <Pressable
                  onPress={handleVerify}
                  disabled={loading}
                  style={({ pressed }) => [s.btn, (pressed || loading) && s.pressed]}
                >
                  <LinearGradient colors={[Colors.teal500, Colors.teal600]} style={s.btnGradient}>
                    <Text style={s.btnText}>{loading ? 'Verifying...' : 'Verify Email'}</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
            <Pressable onPress={handleBack} style={s.backBtn}>
              <Text style={s.backText}>←</Text>
            </Pressable>

            <Text style={s.title}>Create{'\n'}Account</Text>
            <Text style={s.subtitle}>Start discovering & investing</Text>

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
                  placeholder="Min. 8 characters"
                  placeholderTextColor={Colors.textSecondary + '80'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <Pressable
                onPress={handleSignUp}
                disabled={loading}
                style={({ pressed }) => [s.btn, (pressed || loading) && s.pressed]}
              >
                <LinearGradient colors={[Colors.amber500, Colors.amber600]} style={s.btnGradient}>
                  <Text style={s.btnText}>{loading ? 'Creating...' : 'Create Account'}</Text>
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

            <Pressable onPress={() => router.replace('/(auth)/sign-in')} style={s.switchWrap}>
              <Text style={s.switchText}>
                Already have an account? <Text style={s.switchLink}>Sign In</Text>
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
  subtitle: { fontSize: 16, color: Colors.textSecondary, marginTop: 8, lineHeight: 24 },
  form: { marginTop: 40, gap: 18 },
  inputWrap: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  input: { height: 54, backgroundColor: Colors.bgSurface, borderRadius: 14, paddingHorizontal: 18, fontSize: 16, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border },
  codeInput: { fontSize: 24, fontWeight: '700', letterSpacing: 8, textAlign: 'center' },
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
  verifyHeader: { alignItems: 'center', marginTop: 48 },
  verifyIconBg: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  verifyIcon: { fontSize: 36 },
});
