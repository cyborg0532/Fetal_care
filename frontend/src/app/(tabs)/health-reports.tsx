import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../constants/theme';
import DashboardLayout from '../../components/DashboardLayout';
import { GlassCard, SectionHeader, ComingSoon } from '../../components/PremiumUI';

export default function HealthReportsScreen() {
  return (
    <DashboardLayout title="Health Reports">
      <ScrollView style={styles.container} contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>📈 Health Reports</Text>
          <Text style={styles.pageSub}>Analytical summaries, medical scans, and wellness trends</Text>
        </View>

        <ComingSoon feature="Scans & Medical Charts Analyzer" />

        <GlassCard accent={Colors.lavender}>
          <SectionHeader title="Trimester Report Outlines" icon="📋" />
          <Text style={styles.reportText}>
            • Weight logging summaries and body mass index calculations.{'\n'}
            • Mood trends plotted from daily voice journals.{'\n'}
            • Medicine adherence trends (Taken vs Missed charts).
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
  reportText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});
