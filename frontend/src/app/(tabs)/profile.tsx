import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../constants/theme';
import DashboardLayout from '../../components/DashboardLayout';
import { GlassCard, SectionHeader, Badge } from '../../components/PremiumUI';
import { apiFetch } from '../../services/api';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMe() {
      try {
        const me = await apiFetch('/auth/me');
        setProfile(me);
      } catch (e) {
        // Fallback placeholder profile if server offline/stub
        setProfile({
          email: 'mother@example.com',
          role: 'mother',
        });
      } finally {
        setLoading(false);
      }
    }
    loadMe();
  }, []);

  if (loading) {
    return (
      <DashboardLayout title="My Profile">
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Profile">
      <ScrollView style={styles.container} contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>👤 My Profile</Text>
          <Text style={styles.pageSub}>Manage your maternal profile, preferences, and account permissions</Text>
        </View>

        <GlassCard accent={Colors.primary} style={styles.profileHero}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>🌸</Text>
          </View>
          <Text style={styles.emailText}>{profile?.email}</Text>
          <Badge label={profile?.role?.toUpperCase() || 'MOTHER'} color={Colors.primary} />
        </GlassCard>

        <SectionHeader title="Pregnancy Settings" icon="🤰" />
        <GlassCard>
          <Text style={styles.infoLabel}>ESTIMATED DUE DATE</Text>
          <Text style={styles.infoValue}>October 24, 2027 (Week 24)</Text>

          <View style={styles.divider} />

          <Text style={styles.infoLabel}>ROLES & PERMISSIONS</Text>
          <Text style={styles.infoValue}>Mother (Primary Data Owner) · Revocable Shared Partner Access</Text>
        </GlassCard>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { padding: Spacing.md },
  center: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  pageHeader: { marginBottom: Spacing.md, marginTop: Spacing.sm },
  pageTitle: { ...Typography.h2, color: Colors.textPrimary, fontWeight: '800' as const },
  pageSub: { ...Typography.body, color: Colors.textMuted, marginTop: 4 },

  profileHero: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.lavenderBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.lavenderLight,
    marginBottom: Spacing.sm,
  },
  avatarEmoji: { fontSize: 40 },
  emailText: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    fontSize: 16,
    marginBottom: Spacing.xs,
  },

  infoLabel: {
    ...Typography.label,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  infoValue: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
});
