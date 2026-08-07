import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { AuthService, UserRole } from '../../services/api';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../constants/theme';

const ROLES: { label: string; value: UserRole; emoji: string }[] = [
  { label: 'Expecting Mother', value: 'mother', emoji: '🤰' },
  { label: 'Partner / Father', value: 'partner', emoji: '👨' },
  { label: 'Family Member', value: 'family', emoji: '👪' },
];

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('mother');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password) return Alert.alert('Missing fields', 'Please fill in all fields');
    if (password !== confirmPassword) return Alert.alert('Password mismatch', 'Passwords do not match');
    if (password.length < 6) return Alert.alert('Weak password', 'Password must be at least 6 characters');

    setLoading(true);
    try {
      await AuthService.signup(email.trim().toLowerCase(), password, role);
      const loginResult = await AuthService.login(email.trim().toLowerCase(), password);
      if (loginResult?.access_token) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('Signup Failed', 'Your account was created but sign-in did not complete.');
      }
    } catch (e: any) {
      Alert.alert('Signup Failed', e.message || 'Unable to create your account right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.headerArea}>
          <View style={styles.logoCircle}>
            <Text style={styles.logo}>🌸</Text>
          </View>
          <Text style={styles.appName}>MaternalCare</Text>
          <Text style={styles.tagline}>Create your premium maternal companion account</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create Account</Text>
          <Text style={styles.cardSubtitle}>Join thousands of mothers on this journey</Text>

          {/* Role Selector */}
          <Text style={[styles.label, { marginBottom: Spacing.sm }]}>I AM A...</Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[styles.roleBtn, role === r.value && styles.roleBtnActive]}
                onPress={() => setRole(r.value)}
              >
                <Text style={styles.roleEmoji}>{r.emoji}</Text>
                <Text style={[styles.roleLabel, role === r.value && styles.roleLabelActive]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

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
              placeholder="Min. 6 characters"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>CONFIRM PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter password"
              placeholderTextColor={Colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleSignup} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Get Started →</Text>
            )}
          </TouchableOpacity>

          <View style={styles.row}>
            <Text style={styles.switchText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.switchLink}>Sign in</Text>
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
  appName: { ...Typography.hero, color: Colors.textPrimary, marginTop: Spacing.xs },
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
  roleRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  roleBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  roleBtnActive: { borderColor: Colors.primary, backgroundColor: 'rgba(212,88,154,0.12)' },
  roleEmoji: { fontSize: 22 },
  roleLabel: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center', marginTop: 4 },
  roleLabelActive: { color: Colors.primary, fontWeight: '700' as const },
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
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
    ...Shadows.sm,
  },
  primaryBtnText: { ...Typography.bodyBold, color: '#fff', fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.md },
  switchText: { ...Typography.body, color: Colors.textSecondary },
  switchLink: { ...Typography.bodyBold, color: Colors.primary },
});
