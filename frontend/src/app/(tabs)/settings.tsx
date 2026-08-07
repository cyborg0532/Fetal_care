import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import DashboardLayout from '../../components/DashboardLayout';
import { GlassCard, SectionHeader } from '../../components/PremiumUI';

export default function SettingsScreen() {
  return (
    <DashboardLayout title="Settings">
      <ScrollView style={styles.container} contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>⚙️ App Settings</Text>
          <Text style={styles.pageSub}>Configure notifications, privacy parameters, and data compliance policies</Text>
        </View>

        <SectionHeader title="System Preferences" icon="⚙️" />
        <GlassCard>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Medicine Reminders</Text>
              <Text style={styles.settingSub}>Receive push alerts when supplements are due</Text>
            </View>
            <Switch value={true} trackColor={{ true: Colors.primary }} />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Emergency SMS Fallback</Text>
              <Text style={styles.settingSub}>Send emergency SMS if cellular data connection is offline</Text>
            </View>
            <Switch value={true} trackColor={{ true: Colors.coral }} />
          </View>
        </GlassCard>

        <SectionHeader title="Privacy & Data Compliance" icon="🔒" />
        <GlassCard accent={Colors.teal}>
          <Text style={styles.privacyText}>
            This application enforces strict encryption at rest. All maternal records are saved locally or securely synced based on revocable consent.
          </Text>
          <Text style={styles.complianceText}>
            HIPAA Compliant · EU GDPR Enforced · Indian DPDP Act Regulated
          </Text>
        </GlassCard>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { padding: Spacing.md },
  pageHeader: { marginBottom: Spacing.md, marginTop: Spacing.sm },
  pageTitle: { ...Typography.h2, color: Colors.textPrimary, fontWeight: '800' as const },
  pageSub: { ...Typography.body, color: Colors.textMuted, marginTop: 4 },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  settingLabel: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  settingSub: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },

  privacyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  complianceText: {
    ...Typography.micro,
    color: Colors.textMuted,
    fontWeight: '700' as const,
    marginTop: Spacing.sm,
  },
});
