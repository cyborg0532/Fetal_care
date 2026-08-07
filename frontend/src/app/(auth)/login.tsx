import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthService } from '../../services/api';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password');
      return;
    }

    setLoading(true);
    try {
      const data = await AuthService.login(email.trim().toLowerCase(), password);
      if (data?.access_token) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('Login Failed', 'The server did not return an access token.');
      }
    } catch (e: any) {
      Alert.alert('Login Failed', e.message || 'Unable to sign in right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[
          styles.inner,
          {
            paddingTop: Math.max(insets.top + Spacing.md, Spacing.xl),
            paddingBottom: Math.max(insets.bottom + Spacing.md, Spacing.xl),
          }
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerArea}>
          <View style={styles.logoCircle}>
            <Text style={styles.logo}>🌸</Text>
          </View>
          <Text style={styles.appName}>MaternalCare</Text>
          <Text style={styles.tagline}>Your premium AI pregnancy companion</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSubtitle}>Sign in to continue your pregnancy journey</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={styles.demoBtn}
            onPress={() => {
              setEmail('divya@gmail.com');
              setPassword('123456');
            }}
          >
            <Text style={styles.demoBtnText}>✨ Auto-Fill Demo Account (divya@gmail.com)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Sign In →</Text>
            )}
          </TouchableOpacity>

          <View style={styles.row}>
            <Text style={styles.switchText}>Don't have an account? </Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity>
                <Text style={styles.switchLink}>Create one</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
  headerArea: { alignItems: 'center', marginBottom: Spacing.xl },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.lavenderBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.lavenderLight,
    ...Shadows.sm,
  },
  logo: { fontSize: 44 },
  appName: { ...Typography.hero, color: Colors.textPrimary, marginTop: Spacing.sm },
  tagline: { ...Typography.body, color: Colors.textSecondary, marginTop: Spacing.xs, textAlign: 'center' },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.md,
  },
  cardTitle: { ...Typography.h2, color: Colors.textPrimary },
  cardSubtitle: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.lg },
  inputGroup: { marginBottom: Spacing.md },
  label: { ...Typography.label, color: Colors.textMuted, marginBottom: Spacing.xs },
  input: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    color: Colors.textPrimary,
    ...Typography.body,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  demoBtn: {
    backgroundColor: Colors.lavenderBg,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.lavenderLight,
  },
  demoBtnText: { ...Typography.caption, color: Colors.lavender, fontWeight: '600' as const },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.xs,
    ...Shadows.sm,
  },
  primaryBtnText: { ...Typography.bodyBold, color: '#fff', fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.md },
  switchText: { ...Typography.body, color: Colors.textSecondary },
  switchLink: { ...Typography.bodyBold, color: Colors.primary },
});
